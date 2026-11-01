import { USE_GUARDRAILS } from '@flight-demo/shared/ai-integration/config';
import { blockedWordsGuard } from '../processors/blocked-words-guard.js';
import { offTopicGuard } from '../processors/off-topic-guard.js';
import { promptInjectionGuard } from '../processors/prompt-injection-guard.js';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { defaultOptions, model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { hotelAgent } from './hotel-agent.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: ticketingAgentPrompt,
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
  },
  agents: { hotelAgent },
  memory: new Memory(),
});
