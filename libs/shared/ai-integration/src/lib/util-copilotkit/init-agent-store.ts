import { HttpAgent, randomUUID, type State } from '@ag-ui/client';
import { inject } from '@angular/core';
import { CopilotKit } from '@copilotkit/angular';
import { attachSentFilter, developerMessagesAsUser } from './agent-middlewares';
import { observeRunErrors } from './agent-run-state';
import { AgentRegistration } from './tool-definition';

export interface InitAgentStoreConfig {
  agentId: string;
  url: string;
  frontendTools?: readonly AgentRegistration[];
  toolCallRenderer?: readonly AgentRegistration[];
  humanInTheLoop?: readonly AgentRegistration[];
  components?: readonly AgentRegistration[];
  useServerMemory?: boolean;
  initialState?: State;
}
export function initAgentStore(config: InitAgentStoreConfig): void {
  const copilotKit = inject(CopilotKit);
  if (copilotKit.agents()[config.agentId]) return;
  const httpAgent = new HttpAgent({
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
    initialState: config.initialState,
  });
  observeRunErrors(httpAgent);
  httpAgent.use(developerMessagesAsUser);
  if (config.useServerMemory) attachSentFilter(httpAgent);
  copilotKit.updateRuntime({
    selfManagedAgents: { ...copilotKit.agents(), [config.agentId]: httpAgent },
  });
  for (const registration of [
    ...(config.frontendTools ?? []),
    ...(config.toolCallRenderer ?? []),
    ...(config.humanInTheLoop ?? []),
    ...(config.components ?? []),
  ])
    registration.register(config.agentId);
}
