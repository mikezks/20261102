import { HttpAgent } from '@ag-ui/client';
import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AgentStore } from '@copilotkit/angular';
import { Subscription } from 'rxjs';

import { ChatRegistry, type ChatInfo } from './chat-registry';

function createStore(agentId: string): AgentStore {
  const agent = new HttpAgent({ agentId, url: 'https://unused.invalid/ag-ui' });
  return new AgentStore(agent, TestBed.inject(DestroyRef), (target, subscriber) =>
    target.subscribe(subscriber),
  );
}

describe('ChatRegistry', () => {
  let registry: ChatRegistry;
  let changes: ChatInfo[];
  let subscription: Subscription;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    registry = TestBed.inject(ChatRegistry);
    changes = [];
    subscription = registry.chatInfo.subscribe((info) => changes.push(info));
  });

  afterEach(() => {
    subscription.unsubscribe();
    TestBed.resetTestingModule();
  });

  it('publishes a changed greeting for the same store', () => {
    const store = signal(createStore('ticketingAgent'));
    registry.setChat({ store, greeting: 'Welcome', showModeSelector: false });
    registry.setChat({ store, greeting: 'Refine your trip', showModeSelector: false });

    expect(changes.at(-1)).toEqual({
      store,
      agentId: 'ticketingAgent',
      greeting: 'Refine your trip',
      showModeSelector: false,
    });
  });

  it('publishes a changed mode-selector setting for the same store', () => {
    const store = signal(createStore('ticketingAgent'));
    registry.setChat({ store, showModeSelector: true });
    registry.setChat({ store, showModeSelector: false });

    expect(changes.at(-1)?.showModeSelector).toBe(false);
  });

  it('restores component defaults when optional settings are omitted', () => {
    const store = signal(createStore('ticketingAgent'));
    registry.setChat({ store, greeting: 'Custom greeting', showModeSelector: false });
    registry.setChat({ store });

    expect(changes.at(-1)).toEqual({ store, agentId: 'ticketingAgent' });
  });

  it('suppresses identical registrations without suppressing distinct updates', () => {
    const store = signal(createStore('ticketingAgent'));
    registry.setChat({ store, greeting: 'Welcome', showModeSelector: false });
    const count = changes.length;
    registry.setChat({ store, greeting: 'Welcome', showModeSelector: false });

    expect(changes).toHaveLength(count);
  });

  it('refreshes the agent id when a store signal resolves to another agent', () => {
    const store = signal(createStore('ticketingAgent'));
    registry.setChat({ store });
    store.set(createStore('planningAgent'));
    registry.setChat({ store });

    expect(changes.at(-1)?.agentId).toBe('planningAgent');
    expect(registry.store).toBe(store);
  });

  it('clears the active configuration and allows the same store to be registered again', () => {
    const store = signal(createStore('ticketingAgent'));
    registry.setChat({ store, greeting: 'Welcome', showModeSelector: false });
    registry.clearChat();
    expect(registry.store).toBeUndefined();
    expect(changes.at(-1)).toEqual({ store: undefined, agentId: undefined });

    registry.setChat({ store });
    expect(registry.store).toBe(store);
    expect(changes.at(-1)).toEqual({ store, agentId: 'ticketingAgent' });
  });
});
