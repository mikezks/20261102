import { provideBookingAi } from '@flight-demo/domain/booking/ai';
import { CopilotKit, CopilotkitAgentFactory, provideCopilotKit } from '@copilotkit/angular';
import { provideMarkdown } from 'ngx-markdown';

/** Loaded with the AUI routes, never during the home page bootstrap. */
export const auiProviders = [
  provideBookingAi(),
  CopilotKit,
  CopilotkitAgentFactory,
  provideCopilotKit({
    defaultToolRendering: true,
    enableInspector: false,
    // TODO: Enable the A2UI catalog.
  }),
  // TODO: Provide the MCP Apps host configuration.
  provideMarkdown(),
];
