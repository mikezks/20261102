import { inject } from '@angular/core';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { ReportingChartStore } from './reporting-chart-store';

const renderChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number().finite() })).max(200),
});

export const renderChartTool = createFrontendTool({
  name: 'renderChart',
  description:
    'Renders the supplied data as a bar chart in the user interface.',
  parameters: renderChartSchema,
  handler: async ({ title, data }) => {
    const store = inject(ReportingChartStore);
    store.setChart(title, data);
    return { ok: true };
  },
});
