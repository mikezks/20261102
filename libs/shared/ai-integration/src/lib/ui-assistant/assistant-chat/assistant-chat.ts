import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  effect,
  type Signal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { agentError } from '../../util-copilotkit/agent-run-state';
import { FormsModule } from '@angular/forms';
import { type AgentStore, CopilotKit, type Message } from '@copilotkit/angular';

import { getAgentMessages, sendMessage, stop } from '../../util-copilotkit/agent-store-helper';
import { ChatMessages } from '../chat-messages/chat-messages';
import { ChatRegistry } from '../chat-registry';

const DEFAULT_GREETING = 'Hi! How can I help you?';

@Component({
  selector: 'app-assistant-chat',
  imports: [FormsModule, ChatMessages],
  templateUrl: './assistant-chat.html',
  styleUrls: ['./assistant-chat.css'],
})
export class AssistantChat {
  readonly initiallyOpen = input(false);
  private chatRegistry = inject(ChatRegistry);
  private copilotKit = inject(CopilotKit);

  private composerInput = viewChild<ElementRef<HTMLTextAreaElement>>('composerInput');
  private messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly error = computed(() => {
    const store = this.store();
    return store ? agentError(store) : '';
  });
  protected readonly panelVisible = signal(false);
  protected readonly message = signal('');
  protected readonly greeting = signal<string>(DEFAULT_GREETING);

  protected readonly store = signal<Signal<AgentStore> | undefined>(undefined);
  protected readonly agentId = signal<string | undefined>(undefined);

  protected readonly messages = computed<Message[]>(() => {
    const store = this.store();
    const agentId = this.agentId();
    return store && agentId ? getAgentMessages(store, agentId) : [];
  });

  protected readonly isRunning = computed<boolean>(() => {
    const store = this.store();
    return store ? store().isRunning() : false;
  });

  constructor() {
    effect(() => {
      if (this.initiallyOpen()) this.open();
    });
    this.chatRegistry.chatInfo.pipe(takeUntilDestroyed()).subscribe((chatInfo) => {
      this.store.set(chatInfo.store);
      this.agentId.set(chatInfo.agentId);
      this.greeting.set(chatInfo.greeting ?? DEFAULT_GREETING);
    });

    this.chatRegistry.openRequested.pipe(takeUntilDestroyed()).subscribe(() => this.open());

    afterRenderEffect(() => {
      this.messages();
      this.isRunning();

      if (!this.panelVisible()) {
        return;
      }

      this.scrollDown();
    });
  }

  private scrollDown() {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  protected toggle(): void {
    if (this.panelVisible()) {
      this.panelVisible.set(false);
      document.getElementById('ai-toggle')?.focus();
      return;
    }

    this.open();
  }

  private open(): void {
    this.panelVisible.set(true);
    queueMicrotask(() => this.composerInput()?.nativeElement.focus());
  }

  protected submit() {
    const message = this.message().trim();
    if (!message || this.isRunning()) return;
    this.message.set('');
    const store = this.store();
    if (store) {
      void sendMessage(this.copilotKit, store, message);
    }
  }

  protected onComposerEnter(event: Event): void {
    if (event instanceof KeyboardEvent && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.submit();
    }
  }

  protected stopRun(): void {
    const store = this.store();
    if (store) {
      stop(store);
    }
  }
}
