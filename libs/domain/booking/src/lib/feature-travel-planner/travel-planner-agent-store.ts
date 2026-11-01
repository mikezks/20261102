import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '@flight-demo/shared/ai-integration';
import { ConfigService } from '@flight-demo/shared/ai-integration';
import { initAgentStore } from '@flight-demo/shared/ai-integration';
import { flightWidget } from '../ui-ai/flight-widget';
import { hotelWidget } from '../ui-ai/hotel-widget';

const AGENT_ID = 'travelPlannerAgent';

export function injectTravelPlannerAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    components: [messageWidget, flightWidget, hotelWidget],
  });

  return injectAgentStore(AGENT_ID);
}
