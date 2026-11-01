import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '@flight-demo/shared/ai-integration';
import { initAgentStore } from '@flight-demo/shared/ai-integration';
import { fillCheckinFormClientTool } from './fill-checkin-form.tool';

const AGENT_ID = 'checkinAgent';

export function injectCheckinAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    frontendTools: [fillCheckinFormClientTool],
  });

  return injectAgentStore(AGENT_ID);
}
