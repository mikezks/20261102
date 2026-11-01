import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { FlightStore } from '../../data-ai/flight-store';

export const submitFlightSearchTool = createFrontendTool({
  name: 'submitFlightSearch',
  description: `
    Triggers a flight search from the dashboard flight-search tile.
    Updates the global flight filter and navigates the user to the booking flight-search page.
    Use city names with the first letter in upper case (no airport codes).
  `,
  parameters: z.object({
    from: z.string().describe('Departure city, e.g. "Graz".'),
    to: z.string().describe('Destination city, e.g. "Hamburg".'),
  }),
  followUp: false,
  handler: async ({ from, to }) => {
    const store = inject(FlightStore);
    const router = inject(Router);
    await router.navigate(['/booking/flight/search']);
    const flights = await store.search({ from, to, urgent: false });
    return { ok: true, count: flights.length };
  },
});
