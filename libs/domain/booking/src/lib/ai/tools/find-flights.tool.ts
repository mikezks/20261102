import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';

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
    // TODO: Describe the departure and destination cities.
  }),
  handler: async () => {
    // TODO: Navigate to Flight Search, await the Booking Store search and return its result count.
    return { ok: false };
  },
});
