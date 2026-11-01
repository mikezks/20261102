/* eslint-disable @typescript-eslint/no-unused-vars -- Prepared imports are used by the exercise. */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getBookedFlights } from '../data/booked-flights-store.js';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

export const findBookedFlightsTool = createTool({
  id: 'findBookedFlights',
  description: 'Returns the flights that are already booked by the current passenger.',
  inputSchema: z.object({}),
  // TODO: Describe the flights array with flightSchema.
  outputSchema: z.object({}),
  execute: async () => {
    // TODO: Load and return the booked flights.
    return {};
  },
});
