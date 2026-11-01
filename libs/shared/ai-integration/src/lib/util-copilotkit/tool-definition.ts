import {
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  type RegisterComponentConfig,
  type RenderToolCallConfig,
  registerFrontendTool,
  registerHumanInTheLoop,
  registerComponent,
  registerRenderToolCall,
} from '@copilotkit/angular';

/** Captures each tool's schema type before it enters a heterogeneous array. */
export interface AgentRegistration {
  register(agentId: string): void;
}

const TERMINAL_TOOL_HINT = '\n\nThis tool ends the turn. Finish data gathering before calling it.';
function terminalHint<T extends { followUp?: boolean; description?: string }>(tool: T): T {
  return tool.followUp === false
    ? { ...tool, description: (tool.description ?? '') + TERMINAL_TOOL_HINT }
    : tool;
}
export function createFrontendTool<Args extends Record<string, unknown>>(
  tool: FrontendToolConfig<Args>,
) {
  const config = terminalHint(tool);
  return { ...config, register: (agentId: string) => registerFrontendTool({ ...config, agentId }) };
}
export function createComponentTool<Args extends Record<string, unknown>>(
  tool: RegisterComponentConfig<Args>,
) {
  const config = terminalHint(tool);
  return { ...config, register: (agentId: string) => registerComponent({ ...config, agentId }) };
}
export function createRenderToolCall<Args extends Record<string, unknown>>(
  tool: RenderToolCallConfig<Args>,
) {
  return { ...tool, register: (agentId: string) => registerRenderToolCall({ ...tool, agentId }) };
}
export function createHumanInTheLoop<Args extends Record<string, unknown>>(
  tool: HumanInTheLoopConfig<Args>,
) {
  return { ...tool, register: (agentId: string) => registerHumanInTheLoop({ ...tool, agentId }) };
}
