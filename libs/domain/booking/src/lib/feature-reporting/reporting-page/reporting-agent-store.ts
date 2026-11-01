import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '@flight-demo/shared/ai-integration';
import { initAgentStore } from '@flight-demo/shared/ai-integration';
import { renderChartTool } from './render-chart.tool';

const AGENT_ID = 'reportingAgent';

export function injectReportingAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    frontendTools: [renderChartTool],
  });

  return injectAgentStore(AGENT_ID);
}
