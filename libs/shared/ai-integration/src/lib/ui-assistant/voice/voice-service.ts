import type {} from './speech';
import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { stripMarkdown } from './strip-markdown';
import { byQuality, isNaturalVoice } from './voice-quality';

export interface DictationOptions {
  onText: (text: string) => void;
  onSilence?: () => void;
}
@Service()
export class VoiceService {
  private readonly recognitionCtor =
    typeof window === 'undefined'
      ? undefined
      : (window.SpeechRecognition ?? window.webkitSpeechRecognition);
  private readonly synthesis = typeof window === 'undefined' ? undefined : window.speechSynthesis;
  readonly dictationSupported = !!this.recognitionCtor;
  readonly readingSupported = !!this.synthesis;
  readonly dictating = signal(false);
  readonly reading = signal(false);
  readonly readingEnabled = signal(false);
  readonly error = signal('');
  readonly language = signal(this.storedLanguage() ?? this.browserLanguages()[0] ?? 'en-US');
  readonly rate = signal(1);
  readonly voiceName = signal('');
  readonly voices = signal<SpeechSynthesisVoice[]>([]);
  readonly languages = computed(() =>
    [
      ...new Set([
        'de-DE',
        'de-AT',
        'de-CH',
        'en-US',
        'en-GB',
        ...this.browserLanguages(),
        this.language(),
        ...this.voices()
          .map((voice) => normalizeLanguage(voice.lang))
          .filter((lang) => lang !== undefined),
      ]),
    ].sort(),
  );
  readonly matchingVoices = computed(() =>
    this.voices()
      .filter(
        (voice) => normalizeLanguage(voice.lang)?.split('-')[0] === this.language().split('-')[0],
      )
      .sort(
        (a, b) =>
          Number(normalizeLanguage(b.lang) === this.language()) -
            Number(normalizeLanguage(a.lang) === this.language()) || byQuality(a, b),
      ),
  );
  private recognition: SpeechRecognition | undefined;
  private utterance: SpeechSynthesisUtterance | undefined;
  private silenceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly spokenMessages = new Set<string>();

  constructor() {
    const changed = () =>
      this.voices.set((this.synthesis?.getVoices() ?? []).filter(isNaturalVoice));
    changed();
    this.synthesis?.addEventListener('voiceschanged', changed);
    inject(DestroyRef).onDestroy(() => {
      this.stopDictation();
      this.cancelReading();
      this.synthesis?.removeEventListener('voiceschanged', changed);
    });
  }
  private browserLanguages(): string[] {
    return typeof navigator === 'undefined'
      ? []
      : [...(navigator.languages ?? [navigator.language])]
          .map(normalizeLanguage)
          .filter((lang) => lang !== undefined);
  }
  private storedLanguage(): string | undefined {
    try {
      return normalizeLanguage(localStorage.getItem('voice.language') ?? '');
    } catch {
      return undefined;
    }
  }
  setLanguage(language: string): void {
    const normalized = normalizeLanguage(language);
    if (!normalized) return;
    this.stopDictation();
    this.cancelReading();
    this.error.set('');
    this.language.set(normalized);
    this.voiceName.set('');
    try {
      localStorage.setItem('voice.language', normalized);
    } catch {
      /* optional preference */
    }
  }
  describeLanguage(language: string): string {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(language) ?? language;
  }
  startDictation(initialText: string, options: DictationOptions): void {
    if (!this.recognitionCtor) return;
    this.stopDictation();
    this.cancelReading();
    this.error.set('');
    const recognition = new this.recognitionCtor();
    this.recognition = recognition;
    recognition.lang = this.language();
    recognition.continuous = true;
    recognition.interimResults = true;
    let committed = initialText ? initialText.trimEnd() + ' ' : '';
    recognition.addEventListener('result', (event) => {
      if (this.recognition !== recognition || !this.dictating()) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal)
          committed = `${committed.trimEnd()} ${result[0].transcript.trim()}`.trimStart() + ' ';
        else interim += result[0].transcript;
      }
      options.onText((committed + interim).trimEnd());
      clearTimeout(this.silenceTimer);
      if (options.onSilence)
        this.silenceTimer = setTimeout(() => {
          if (this.recognition === recognition && this.dictating()) options.onSilence?.();
        }, 1500);
    });
    recognition.addEventListener('end', () => {
      if (this.recognition !== recognition || !this.dictating()) return;
      try {
        recognition.start();
      } catch {
        this.stopDictation();
      }
    });
    recognition.addEventListener('error', (event) => {
      if (this.recognition !== recognition) return;
      const hint = DICTATION_ERRORS[event.error] ?? 'Please try again.';
      this.error.set(`Dictation stopped: ${event.error}. ${hint}`);
      this.stopDictation();
    });
    try {
      this.dictating.set(true);
      recognition.start();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not start dictation.');
      this.stopDictation();
    }
  }
  stopDictation(): void {
    this.dictating.set(false);
    clearTimeout(this.silenceTimer);
    this.silenceTimer = undefined;
    const recognition = this.recognition;
    this.recognition = undefined;
    recognition?.abort();
  }
  toggleReading(): void {
    this.readingEnabled.update((value) => !value);
    if (!this.readingEnabled()) this.cancelReading();
  }
  readMessage(widgetId: string | null, markdown: string): void {
    const key = widgetId ?? markdown.trim();
    if (!markdown.trim() || !this.readingEnabled() || this.spokenMessages.has(key)) return;
    this.spokenMessages.add(key);
    if (this.spokenMessages.size > 200)
      this.spokenMessages.delete(this.spokenMessages.values().next().value!);
    this.speak(stripMarkdown(markdown));
  }
  speak(text: string): void {
    if (!text.trim() || !this.synthesis) return;
    this.stopDictation();
    this.cancelReading();
    this.error.set('');
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = this.language();
    utterance.rate = this.rate();
    const voices = this.matchingVoices();
    const voice = voices.find((v) => v.name === this.voiceName()) ?? voices[0];
    if (voice) utterance.voice = voice;
    this.utterance = utterance;
    utterance.addEventListener('end', () => {
      if (this.utterance !== utterance) return;
      this.utterance = undefined;
      this.reading.set(false);
    });
    utterance.addEventListener('error', (event) => {
      if (this.utterance !== utterance) return;
      this.utterance = undefined;
      this.reading.set(false);
      this.error.set(`Reading stopped: ${event.error}. Please try again.`);
    });
    try {
      this.reading.set(true);
      this.synthesis.speak(utterance);
    } catch (error) {
      this.cancelReading();
      this.error.set(error instanceof Error ? error.message : 'Could not start reading.');
    }
  }
  cancelReading(): void {
    this.utterance = undefined;
    this.reading.set(false);
    this.synthesis?.cancel();
  }
}

function normalizeLanguage(language: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(language.replaceAll('_', '-'))[0];
  } catch {
    return undefined;
  }
}

const DICTATION_ERRORS: Record<string, string> = {
  'not-allowed': 'Allow microphone access in your browser and try again.',
  'audio-capture': 'Check that your microphone is connected and available.',
  'no-speech': 'No speech was detected. Check the microphone and start dictation again.',
  network: 'Speech recognition could not reach its service. Check your connection and try again.',
  'language-not-supported': 'This browser does not support dictation in the selected language.',
};
