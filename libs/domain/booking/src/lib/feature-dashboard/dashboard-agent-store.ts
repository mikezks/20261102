import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '@flight-demo/shared/ai-integration';
import { initAgentStore } from '@flight-demo/shared/ai-integration';
import { checkInTool } from '../ai/tools/check-in.tool';
import { submitFlightSearchTool } from './tools/submit-flight-search.tool';

const AGENT_ID = 'dashboardAgent';

export function injectDashboardAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    frontendTools: [submitFlightSearchTool, checkInTool],
  });

  return injectAgentStore(AGENT_ID);
}
