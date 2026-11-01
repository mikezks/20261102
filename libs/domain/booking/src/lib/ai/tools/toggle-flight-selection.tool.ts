import { inject } from '@angular/core';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { FlightStore } from '../../data-ai/flight-store';

export const toggleFlightSelectionTool = createFrontendTool({
  name: 'toggleFlightSelection',
  description: 'Selects a flight or deselects it. Selected flights are added to the basket.',
  parameters: z.object({
    flightId: z.number().describe('id of flight to select or deselect'),
    selected: z.boolean().describe('whether flight should be selected or deselected'),
  }),
  handler: async ({ flightId, selected }) => {
    const store = inject(FlightStore);
    store.updateBasket(flightId, selected);
    return { selected };
  },
});
