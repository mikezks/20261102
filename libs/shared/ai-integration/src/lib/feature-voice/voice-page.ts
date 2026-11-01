import { Component, DestroyRef, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { VoiceService } from '../ui-assistant/voice/voice-service';

@Component({
  selector: 'app-voice-page',
  imports: [FormField],
  template: `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">Voice &amp; Dictation</h2>
        <p>Dictate a message or listen to it. Choose the language you want to speak.</p>
      </div>
      <div class="card-body">
        <div class="voice-grid">
          <div>
            <div class="form-group">
              <label for="voice-text">Text</label>
              <textarea
                id="voice-text"
                class="form-control"
                rows="8"
                placeholder="Start dictation or type something to read aloud…"
                [formField]="fields.text"
              ></textarea>
            </div>
            <div class="actions">
              <button
                type="button"
                class="btn btn-primary voice-dictation"
                [disabled]="!voice.dictationSupported"
                [attr.aria-pressed]="voice.dictating()"
                (click)="dictate()"
              >
                <i class="icon-mic" aria-hidden="true"></i>
                {{ voice.dictating() ? 'Stop dictation' : 'Start dictation' }}
              </button>
              <button
                type="button"
                class="btn btn-default voice-reading"
                [disabled]="!voice.readingSupported || (!voice.reading() && !model().text.trim())"
                [attr.aria-pressed]="voice.reading()"
                (click)="read()"
              >
                {{ voice.reading() ? 'Stop reading' : 'Read aloud' }}
              </button>
            </div>
            <p class="voice-status" role="status">
              @if (voice.dictating()) {
                Listening — {{ voice.describeLanguage(voice.language()) }}. Stop dictation when
                finished.
              } @else {
                Ready to dictate in {{ voice.describeLanguage(voice.language()) }}.
              }
            </p>
          </div>
          <div>
            <div class="form-group">
              <label for="voice-language">Language</label>
              <select
                id="voice-language"
                class="form-control"
                #language
                (change)="voice.setLanguage(language.value)"
                aria-describedby="language-help"
              >
                @for (lang of voice.languages(); track lang) {
                  <option [value]="lang" [selected]="lang === voice.language()">
                    {{ voice.describeLanguage(lang) }} ({{ lang }})
                  </option>
                }
              </select>
              <p id="language-help" class="help-text">
                Used for dictation and reading aloud, including in the assistant.
              </p>
            </div>
            <div class="form-group">
              <label for="voice-name">Reading voice</label>
              <select
                id="voice-name"
                class="form-control"
                [disabled]="!voice.readingSupported || !voice.matchingVoices().length"
                #name
                (change)="voice.voiceName.set(name.value)"
              >
                <option value="" [selected]="!voice.voiceName()">Automatic</option>
                @for (item of voice.matchingVoices(); track item.voiceURI) {
                  <option [value]="item.name" [selected]="item.name === voice.voiceName()">
                    {{ item.name }} — {{ item.localService ? 'local' : 'online' }}
                  </option>
                }
              </select>
              @if (voice.readingSupported && !voice.matchingVoices().length) {
                <p class="help-text">
                  No reading voice is available for this language. Dictation does not require a
                  reading voice.
                </p>
              }
            </div>
            <div class="form-group">
              <label for="voice-rate">Reading speed: {{ voice.rate() }}×</label>
              <input
                id="voice-rate"
                class="voice-rate"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                [value]="voice.rate()"
                [disabled]="!voice.readingSupported"
                #rate
                (input)="voice.rate.set(rate.valueAsNumber)"
              />
            </div>
          </div>
        </div>
        @if (!voice.dictationSupported) {
          <p>Dictation is not available in this browser. You can still type your text.</p>
        }
        @if (!voice.readingSupported) {
          <p>Speech synthesis is not available in this browser.</p>
        }
        @if (voice.error()) {
          <p role="alert" class="alert alert-danger">{{ voice.error() }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .voice-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 2rem;
    }
    textarea.form-control {
      min-height: 15rem;
      max-height: none;
      resize: vertical;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .actions .btn {
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .icon-mic {
      font-size: 1rem;
    }
    .voice-rate {
      display: block;
      width: 100%;
      accent-color: var(--color-primary);
    }
    .voice-status {
      margin-top: 1rem;
    }
    .help-text {
      font-size: 0.875rem;
      color: var(--color-label);
      margin-top: 0.5rem;
    }
    @media (max-width: 900px) {
      .voice-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
      }
    }
  `,
})
export class VoicePage {
  protected readonly voice = inject(VoiceService);
  protected readonly model = signal({ text: '' });
  protected readonly fields = form(this.model);
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.voice.stopDictation();
      this.voice.cancelReading();
    });
  }
  protected dictate(): void {
    if (this.voice.dictating()) {
      this.voice.stopDictation();
      return;
    }
    this.voice.startDictation(this.model().text, { onText: (text) => this.model.set({ text }) });
  }
  protected read(): void {
    if (this.voice.reading()) {
      this.voice.cancelReading();
      return;
    }
    this.voice.speak(this.model().text);
  }
}
