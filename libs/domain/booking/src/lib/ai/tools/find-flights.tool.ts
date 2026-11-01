import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { FlightStore } from '../../data-ai/flight-store';

export const findFlightsTool = createFrontendTool({
  name: 'findFlights',
  description: `
    Searches for flights and redirects the user to the result page where the found flights are shown.

    Remarks:
    - For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
    - Do not announce this tool call before executing it. The UI already shows that the tool is running.
    - Do not render flights or flight lists in the chat after this tool: the user is taken to the booking flight-search route where results appear.
    - If needed, send at most one short text confirmation after the tool call has completed.
  `,
  parameters: z.object({
    from: z.string().describe('Departure city'),
    to: z.string().describe('Destination city'),
  }),
  handler: async ({ from, to }) => {
    const store = inject(FlightStore);
    const router = inject(Router);
    await router.navigate(['/booking/flight/search']);
    const flights = await store.search({ from, to, urgent: false });
    return { ok: true, count: flights.length };
  },
});
