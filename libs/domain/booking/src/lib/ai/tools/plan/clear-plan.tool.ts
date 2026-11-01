import { inject } from '@angular/core';
import { z } from 'zod/v3';

import { createFrontendTool } from '@flight-demo/shared/ai-integration';
import { PlanStore } from '../../plan/plan-store';

export const clearPlanTool = createFrontendTool({
  name: 'clearPlan',
  description: `
    Removes all steps and resets the co-plan. Use when the user wants to start over.

    Example — user: "Forget all this, let's start over."
      clearPlan()
  `,
  parameters: z.object({}),
  handler: async () => {
    const store = inject(PlanStore);
    store.clear();
    return { cleared: true };
  },
});
