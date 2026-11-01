import { Service, type Signal } from '@angular/core';
import { type AgentStore } from '@copilotkit/angular';
import { BehaviorSubject, Subject } from 'rxjs';

import { type AgentMode } from '../util-common/agent-mode-service';

export interface ChatConfig {
  store: Signal<AgentStore>;
  /** Greeting shown as the first assistant message. Undefined = component default. */
  greeting?: string;
  showModeSelector?: boolean;
}

export interface ChatInfo extends Partial<ChatConfig> {
  /** Agent id backing the store; needed to render tool calls and activities. */
  agentId: string | undefined;
}

@Service()
export class ChatRegistry {
  private _store: Signal<AgentStore> | undefined = undefined;
  private readonly _chatInfo = new BehaviorSubject<ChatInfo>({
    store: undefined,
    agentId: undefined,
  });
  public readonly chatInfo = this._chatInfo.asObservable();
  private readonly _openRequested = new Subject<void>();
  public readonly openRequested = this._openRequested.asObservable();
  private readonly _modeRequested = new Subject<AgentMode>();
  public readonly modeRequested = this._modeRequested.asObservable();

  public get store(): Signal<AgentStore> | undefined {
    return this._store;
  }

  public setChat(config: ChatConfig): void {
    const agentId = config.store().agent.agentId;
    const current = this._chatInfo.value;
    if (
      config.store === current.store &&
      agentId === current.agentId &&
      config.greeting === current.greeting &&
      config.showModeSelector === current.showModeSelector
    ) {
      return;
    }

    this._store = config.store;
    this._chatInfo.next({
      ...config,
      agentId,
    });
  }

  public clearChat(): void {
    this._store = undefined;
    this._chatInfo.next({ store: undefined, agentId: undefined });
  }

  public requestOpen(): void {
    this._openRequested.next();
  }

  public requestMode(mode: AgentMode): void {
    this._modeRequested.next(mode);
  }
}
