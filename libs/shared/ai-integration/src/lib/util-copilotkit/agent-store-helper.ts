import { randomUUID } from '@ag-ui/client';
import { type UserMessage } from '@ag-ui/core';
import { type Signal } from '@angular/core';
import { type AgentStore, CopilotKit, type Message } from '@copilotkit/angular';

import { runState } from './agent-run-state';
import { clearSentHistory } from './agent-middlewares';

export type SendMessageInput = string | UserMessage['content'];

export function getAgentMessages(store: Signal<AgentStore>, agentId: string): Message[] {
  return store()
    .messages()
    .filter((message) => message.role !== 'developer' && message.role !== 'system')
    .map((message) => ({ ...message, agentId }) as unknown as Message);
}

export async function sendMessage(
  copilotKit: CopilotKit,
  store: Signal<AgentStore>,
  input: SendMessageInput,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  if (runState(agent).sending || store().isRunning()) return;
  if (typeof input === 'string' && !input.trim()) return;
  agent.addMessage({ id: randomUUID(), role: 'user', content: input });
  const state = runState(agent);
  state.error.set('');
  state.cancelled = false;
  state.sending = true;
  try {
    await copilotKit.core.runAgent({ agent, forwardedProps: forwardProps });
  } catch (error) {
    if (!state.cancelled)
      state.error.set(error instanceof Error ? error.message : 'The AI request failed.');
  } finally {
    state.sending = false;
  }
}

export async function sendDeveloperMessage(
  copilotKit: CopilotKit,
  store: Signal<AgentStore>,
  content: string,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  agent.addMessage({ id: randomUUID(), role: 'developer', content });
  const state = runState(agent);
  state.error.set('');
  state.cancelled = false;
  state.sending = true;
  try {
    await copilotKit.core.runAgent({ agent, forwardedProps: forwardProps });
  } catch (error) {
    if (!state.cancelled)
      state.error.set(error instanceof Error ? error.message : 'The AI request failed.');
  } finally {
    state.sending = false;
  }
}

export function addDeveloperMessage(store: Signal<AgentStore>, content: string): void {
  store().agent.addMessage({ id: randomUUID(), role: 'developer', content });
}

export function stop(store: Signal<AgentStore>): void {
  runState(store().agent).cancelled = true;
  store().agent.abortRun();
}

export function reset(store: Signal<AgentStore>): void {
  const agent = store().agent;
  runState(agent).cancelled = true;
  agent.abortRun();
  runState(agent).error.set('');
  agent.setMessages([]);
  agent.threadId = randomUUID();
  store().interruptController.setThreadId(agent.threadId);
  clearSentHistory(agent);
}
