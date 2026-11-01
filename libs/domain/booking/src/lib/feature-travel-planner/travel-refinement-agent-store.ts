import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '@flight-demo/shared/ai-integration';
import { ConfigService } from '@flight-demo/shared/ai-integration';
import { initAgentStore } from '@flight-demo/shared/ai-integration';
import { flightWidget } from '../ui-ai/flight-widget';
import { hotelWidget } from '../ui-ai/hotel-widget';
import { initialTravelPlan } from './travel-plan-model';

export const TRAVEL_REFINEMENT_AGENT_ID = 'travelRefinementAgent';

const widgets = [messageWidget, flightWidget, hotelWidget];

export function injectTravelRefinementAgentStore() {
  initAgentStore({
    agentId: TRAVEL_REFINEMENT_AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(TRAVEL_REFINEMENT_AGENT_ID),
    useServerMemory: true,
    components: [...widgets],
    initialState: initialTravelPlan,
  });

  return injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID);
}
