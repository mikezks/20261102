import { inject } from '@angular/core';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { FlightStore } from '../../data-ai/flight-store';

export const getCurrentBasketTool = createFrontendTool({
  name: 'getCurrentBasket',
  description: 'Returns all selected flights as an object mapping flightIds to booleans.',
  parameters: z.object({}),
  handler: async () => {
    const store = inject(FlightStore);
    return store.basket();
  },
});
