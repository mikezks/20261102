import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import { USE_GUARDRAILS } from '@flight-demo/shared/ai-integration/config';
import { blockedWordsGuard } from '../processors/blocked-words-guard.js';
import { offTopicGuard } from '../processors/off-topic-guard.js';
import { promptInjectionGuard } from '../processors/prompt-injection-guard.js';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { render_a2ui } from '../a2ui/render-a2ui.tool.js';
import { withA2uiInstructions } from '../a2ui/with-a2ui-instructions.js';
import { defaultOptions, model } from '../config.js';
import { agUiRouteConfig } from '../routes/ag-ui-route-config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { hotelAgent } from './hotel-agent.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: withA2uiInstructions(ticketingAgentPrompt),
  // Lab 05 enables the guardrails temporarily, then restores the switch.
  inputProcessors: USE_GUARDRAILS ? [blockedWordsGuard, offTopicGuard, promptInjectionGuard] : [],
  model,
  defaultOptions: {
    ...defaultOptions,
    delegation: { includeSubAgentToolResultsInModelContext: true },
  },
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    render_a2ui,
  },
  agents: { hotelAgent },
  memory: new Memory(),
});

agUiRouteConfig[ticketingAgent.id] = {
  middlewares: [new A2UIMiddleware({ a2uiToolNames: [] })],
};
