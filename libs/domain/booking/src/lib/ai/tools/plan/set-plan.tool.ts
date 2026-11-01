/* eslint-disable @typescript-eslint/no-unused-vars -- Prepared imports are used by the exercise. */
import { inject } from '@angular/core';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { planStepSpecSchema } from '../../plan/plan-model';
import { PlanStore } from '../../plan/plan-store';

export const setPlanTool = createFrontendTool({
  name: 'setPlan',
  description: `
    Creates or replaces the WHOLE co-plan at once. Use this only to draft the
    initial plan, or when the user asks for a fundamentally different plan. For
    incremental changes (add/remove/reorder/swap a single step) use the dedicated
    step tools instead of rewriting everything.

    Example — user: "Rebook flight 390 for 391."
      setPlan({
        "title": "Rebook Paris trip",
        "steps": [
          { "action": "book",   "flightId": 391, "description": "Book replacement flight 391" },
          { "action": "cancel", "flightId": 390, "description": "Cancel existing flight 390" }
        ]
      })
  `,
  parameters: z.object({
    title: z.string().optional().describe('Short title for the plan, e.g. "Rebook Paris trip".'),
    steps: z
      .array(planStepSpecSchema)
      .describe('Ordered steps; the array order IS the execution order.'),
  }),
  handler: async (args) => {
    // TODO: Replace the plan in PlanStore and return its step count.
    throw new Error('Complete the setPlan handler before using this tool.');
  },
});
