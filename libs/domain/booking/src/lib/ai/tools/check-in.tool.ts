import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';

export const checkInTool = createFrontendTool({
  name: 'checkIn',
  description: 'Routes to the check-in page for a booked flight.',
  parameters: z.object({
    flightId: z.number().describe('flightId of the flight to check in for'),
  }),
  followUp: false,
  handler: async ({ flightId }) => {
    const router = inject(Router);
    await router.navigate(['/checkin/document', { ticketId: flightId }]);
    return { ok: true };
  },
});
