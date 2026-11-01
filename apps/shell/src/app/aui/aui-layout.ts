import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { AssistantChat, ChatRegistry, stop } from '@flight-demo/shared/ai-integration';

@Component({
  selector: 'app-aui-layout',
  imports: [RouterOutlet, AssistantChat],
  template: `
    <router-outlet />
    @if (chatInfo()?.store) {
      @defer (on interaction; when assistantRequested()) {
        <app-assistant-chat [initiallyOpen]="true" />
      } @placeholder {
        <button type="button" class="assistant-launcher" aria-haspopup="dialog">Assistant</button>
      } @loading {
        <p class="assistant-launcher" role="status">Loading assistant…</p>
      } @error {
        <p class="assistant-launcher" role="alert">
          The assistant could not be loaded. Please reload the page.
        </p>
      }
    }
  `,
  styles: `
    .assistant-launcher {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 1000;
      padding: 12px 16px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-white);
      color: var(--color-primary);
    }
  `,
})
export class AuiLayout {
  private readonly registry = inject(ChatRegistry);
  protected readonly chatInfo = toSignal(this.registry.chatInfo);
  protected readonly assistantRequested = signal(false);
  constructor() {
    this.registry.openRequested
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.assistantRequested.set(true));
    inject(DestroyRef).onDestroy(() => {
      if (this.registry.store) stop(this.registry.store);
      this.registry.clearChat();
    });
  }
}
