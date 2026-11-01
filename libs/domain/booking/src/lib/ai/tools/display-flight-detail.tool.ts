import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';

export const displayFlightDetailTool = createFrontendTool({
  name: 'displayFlightDetail',
  description: 'Routes to the detail of a flight. This detail view can be used to edit the flight.',
  parameters: z.object({
    flightId: z.number().describe('flightId of the flight to display'),
  }),
  handler: async ({ flightId }) => {
    const router = inject(Router);
    await router.navigate(['/booking/flight/edit', flightId]);
    return { ok: true };
  },
});
