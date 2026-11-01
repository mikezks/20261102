import type { CreateAngularCatalogOptions } from '@copilotkit/angular/a2ui';
import { z } from 'zod/v3';

type CatalogFunction = NonNullable<CreateAngularCatalogOptions['functions']>[number];

const formatIdSchema = z
  .object({
    value: z.number(),
  })
  .strict();

export const formatIdImplementation: CatalogFunction = {
  name: 'formatId',
  returnType: 'string' as const,
  schema: formatIdSchema as unknown as CatalogFunction['schema'],
  execute(args: unknown) {
    const { value } = formatIdSchema.parse(args);
    const normalizedValue = Math.max(0, Math.trunc(value));

    return `P-${String(normalizedValue).padStart(4, '0')}`;
  },
};
