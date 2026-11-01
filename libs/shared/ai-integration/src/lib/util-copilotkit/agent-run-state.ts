import { AbstractAgent } from '@ag-ui/client';
import { signal, Signal } from '@angular/core';
import { AgentStore } from '@copilotkit/angular';

const states = new WeakMap<AbstractAgent, ReturnType<typeof createState>>();
function createState() {
  return { error: signal(''), cancelled: false, sending: false };
}
export function runState(agent: AbstractAgent) {
  let state = states.get(agent);
  if (!state) {
    state = createState();
    states.set(agent, state);
  }
  return state;
}
export function agentError(store: Signal<AgentStore>): string {
  return runState(store().agent).error();
}
export function observeRunErrors(agent: AbstractAgent): void {
  const state = runState(agent);
  agent.subscribe({
    onRunErrorEvent: ({ event }) => {
      if (!state.cancelled) state.error.set(event.message);
    },
    onRunFailed: ({ error }) => {
      if (!state.cancelled)
        state.error.set(
          error instanceof Error ? error.message : 'The AI request failed. Please try again.',
        );
    },
  });
}
