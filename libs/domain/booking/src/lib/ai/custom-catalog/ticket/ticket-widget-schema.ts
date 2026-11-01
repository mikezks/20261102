/* eslint-disable @typescript-eslint/no-unused-vars -- Prepared imports are used by the exercise. */
import { z } from 'zod/v3';

import { binding, type WithoutBinding } from '@flight-demo/shared/ai-integration';

export const ticketSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number().optional(),
});

export const ticketWidgetSchema = z
  .object({
    // TODO: Describe the ticket prop with binding(ticketSchema).
  })
  .strict();

export type TicketWidgetProps = WithoutBinding<z.infer<typeof ticketWidgetSchema>>;
