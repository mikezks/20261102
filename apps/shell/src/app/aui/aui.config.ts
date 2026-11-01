import { provideBookingAi } from '@flight-demo/domain/booking/ai';
import { CopilotKit, CopilotkitAgentFactory, provideCopilotKit } from '@copilotkit/angular';
import { provideMCPApps } from '@copilotkit/angular/mcp-apps';
import { provideMarkdown } from 'ngx-markdown';
import { mcpAppsConfig } from '@flight-demo/shared/ai-integration';
import { customCatalog } from '@flight-demo/domain/booking/catalog';

/** Loaded with the AUI routes, never during the home page bootstrap. */
export const auiProviders = [
  provideBookingAi(),
  CopilotKit,
  CopilotkitAgentFactory,
  provideCopilotKit({
    defaultToolRendering: true,
    enableInspector: false,
    a2ui: { catalog: customCatalog, includeSchema: false },
  }),
  provideMCPApps(mcpAppsConfig),
  provideMarkdown(),
];
