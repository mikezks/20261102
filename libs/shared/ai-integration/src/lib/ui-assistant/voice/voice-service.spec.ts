import { TestBed } from '@angular/core/testing';
import { VoiceService } from './voice-service';
import { VoicePage } from '../../feature-voice/voice-page';

class Recognition extends EventTarget {
  static latest: Recognition;
  lang = '';
  continuous = false;
  interimResults = false;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    super();
    Recognition.latest = this;
  }
  result(text: string): void {
    this.dispatchEvent(
      Object.assign(new Event('result'), {
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: text } }],
      }),
    );
  }
}
class Synthesis extends EventTarget {
  voices: SpeechSynthesisVoice[] = [];
  getVoices = () => this.voices;
  speak = vi.fn();
  cancel = vi.fn();
}
class Utterance extends EventTarget {
  constructor(readonly text: string) {
    super();
  }
}

describe('VoiceService', () => {
  let synthesis: Synthesis;
  let savedRecognition: PropertyDescriptor | undefined;
  let savedSynthesis: PropertyDescriptor | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    synthesis = new Synthesis();
    savedRecognition = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
    savedSynthesis = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: Recognition });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    if (savedRecognition) Object.defineProperty(window, 'SpeechRecognition', savedRecognition);
    else Reflect.deleteProperty(window, 'SpeechRecognition');
    if (savedSynthesis) Object.defineProperty(window, 'speechSynthesis', savedSynthesis);
    else Reflect.deleteProperty(window, 'speechSynthesis');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses the browser language and offers German dictation without synthesis voices', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-AT', 'en-US']);
    const voice = TestBed.inject(VoiceService);
    expect(voice.language()).toBe('de-AT');
    expect(voice.languages()).toContain('de-DE');
    expect(voice.matchingVoices()).toEqual([]);
    voice.startDictation('', { onText: vi.fn() });
    expect(Recognition.latest.lang).toBe('de-AT');
  });

  it('respects a saved language and normalizes a German voice locale', () => {
    localStorage.setItem('voice.language', 'de_DE');
    synthesis.voices = [
      { name: 'German', lang: 'de_DE', voiceURI: 'de', localService: true, default: false },
    ];
    const voice = TestBed.inject(VoiceService);
    expect(voice.language()).toBe('de-DE');
    expect(voice.matchingVoices()).toHaveLength(1);
    voice.startDictation('', { onText: vi.fn() });
    expect(Recognition.latest.lang).toBe('de-DE');
    voice.speak('Guten Morgen');
    expect(synthesis.speak.mock.calls[0][0].lang).toBe('de-DE');
    expect(synthesis.speak.mock.calls[0][0].voice.name).toBe('German');
  });

  it('falls back to a German reading voice for an Austrian dictation locale', () => {
    const voice = TestBed.inject(VoiceService);
    voice.setLanguage('de-AT');
    synthesis.voices = [
      { name: 'German', lang: 'de-DE', voiceURI: 'de', localService: true, default: false },
    ];
    synthesis.dispatchEvent(new Event('voiceschanged'));
    expect(voice.matchingVoices()).toHaveLength(1);
    voice.startDictation('', { onText: vi.fn() });
    expect(Recognition.latest.lang).toBe('de-AT');
  });

  it('stops the old recognition when changing language and ignores late results', () => {
    const voice = TestBed.inject(VoiceService);
    const onText = vi.fn();
    voice.startDictation('', { onText });
    const previous = Recognition.latest;
    voice.setLanguage('de-DE');
    previous.result('late English');
    expect(onText).not.toHaveBeenCalled();
    expect(previous.abort).toHaveBeenCalledOnce();
    expect(voice.dictating()).toBe(false);
    expect(localStorage.getItem('voice.language')).toBe('de-DE');
    voice.startDictation('', { onText });
    Recognition.latest.result('Flug nach Graz');
    expect(Recognition.latest.lang).toBe('de-DE');
    expect(onText).toHaveBeenLastCalledWith('Flug nach Graz');
  });

  it('keeps final phrases separated across a recognition restart', () => {
    const voice = TestBed.inject(VoiceService);
    const onText = vi.fn();
    voice.startDictation('Suche', { onText });
    Recognition.latest.result('einen Flug');
    Recognition.latest.dispatchEvent(new Event('end'));
    Recognition.latest.result('nach Graz');
    expect(onText).toHaveBeenLastCalledWith('Suche einen Flug nach Graz');
    expect(Recognition.latest.start).toHaveBeenCalledTimes(2);
  });

  it('keeps the page selector and recognition language in sync after restoring a preference', async () => {
    vi.useRealTimers();
    localStorage.setItem('voice.language', 'de-DE');
    const fixture = TestBed.createComponent(VoicePage);
    await fixture.whenStable();
    const language = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '#voice-language',
    )!;
    expect(language.value).toBe('de-DE');
    synthesis.voices = [
      { name: 'English', lang: 'en-US', voiceURI: 'en', localService: true, default: true },
    ];
    synthesis.dispatchEvent(new Event('voiceschanged'));
    await fixture.whenStable();
    expect(language.value).toBe('de-DE');
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.voice-dictation')!
      .click();
    await fixture.whenStable();
    expect(Recognition.latest.lang).toBe(language.value);
    expect(
      fixture.nativeElement.querySelector('.voice-dictation').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('does not send stale dictation after the user stops', () => {
    const voice = TestBed.inject(VoiceService);
    const onText = vi.fn();
    const onSilence = vi.fn();
    voice.startDictation('', { onText, onSilence });
    Recognition.latest.result('Graz');
    expect(onText).toHaveBeenLastCalledWith('Graz');
    voice.stopDictation();
    Recognition.latest.result(' stale');
    vi.advanceTimersByTime(1600);
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onSilence).not.toHaveBeenCalled();
    expect(Recognition.latest.abort).toHaveBeenCalledOnce();
  });

  it('uses one page button to start and stop reading, including after clearing the text', async () => {
    vi.useRealTimers();
    const fixture = TestBed.createComponent(VoicePage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const text = host.querySelector<HTMLTextAreaElement>('#voice-text')!;
    const button = host.querySelector<HTMLButtonElement>('.voice-reading')!;
    expect(host.querySelectorAll('.actions button')).toHaveLength(2);
    expect(button.disabled).toBe(true);
    text.value = 'Guten Morgen';
    text.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    button.click();
    await fixture.whenStable();
    expect(button.textContent?.trim()).toBe('Stop reading');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    text.value = '';
    text.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    button.click();
    await fixture.whenStable();
    expect(button.textContent?.trim()).toBe('Read aloud');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.disabled).toBe(true);
    text.value = 'Noch einmal';
    text.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    button.click();
    synthesis.speak.mock.calls.at(-1)![0].dispatchEvent(new Event('end'));
    await fixture.whenStable();
    expect(button.textContent?.trim()).toBe('Read aloud');
  });

  it('ignores old utterance events and resets reading after a current synthesis error', () => {
    const voice = TestBed.inject(VoiceService);
    voice.speak('First');
    const previous = synthesis.speak.mock.calls.at(-1)![0] as Utterance;
    voice.speak('Second');
    previous.dispatchEvent(new Event('end'));
    previous.dispatchEvent(Object.assign(new Event('error'), { error: 'canceled' }));
    expect(voice.reading()).toBe(true);
    expect(voice.error()).toBe('');
    synthesis.speak.mock.calls
      .at(-1)![0]
      .dispatchEvent(Object.assign(new Event('error'), { error: 'synthesis-failed' }));
    expect(voice.reading()).toBe(false);
    expect(voice.error()).toContain('synthesis-failed');
    voice.speak('Third');
    voice.setLanguage('de-DE');
    expect(voice.reading()).toBe(false);
  });

  it('resets reading if the browser cannot start speech synthesis', () => {
    synthesis.speak.mockImplementationOnce(() => {
      throw new Error('Audio unavailable');
    });
    const voice = TestBed.inject(VoiceService);
    voice.speak('Hello');
    expect(voice.reading()).toBe(false);
    expect(voice.error()).toBe('Audio unavailable');
  });

  it('loads voices asynchronously and reads each completed widget once', () => {
    const voice = TestBed.inject(VoiceService);
    expect(voice.voices()).toEqual([]);
    synthesis.voices = [
      {
        name: 'Natural English',
        lang: 'en-US',
        voiceURI: 'test',
        localService: true,
        default: true,
      },
    ];
    synthesis.dispatchEvent(new Event('voiceschanged'));
    expect(voice.matchingVoices()).toHaveLength(1);
    voice.readingEnabled.set(true);
    voice.readMessage('widget-1', '**Welcome** aboard');
    voice.readMessage('widget-1', '**Welcome** aboard');
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(synthesis.speak.mock.calls[0][0].text).toBe('Welcome aboard');
  });

  it('stops after a recognition error and releases browser listeners', () => {
    const voice = TestBed.inject(VoiceService);
    voice.startDictation('', { onText: vi.fn() });
    Recognition.latest.dispatchEvent(Object.assign(new Event('error'), { error: 'not-allowed' }));
    Recognition.latest.dispatchEvent(new Event('end'));
    expect(Recognition.latest.start).toHaveBeenCalledOnce();
    expect(voice.dictating()).toBe(false);
    expect(voice.error()).toContain('not-allowed');
    const removeListener = vi.spyOn(synthesis, 'removeEventListener');
    TestBed.resetTestingModule();
    expect(removeListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
  });
});
