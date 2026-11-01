import {
  CopilotA2UICatalog,
  basicCatalog,
} from '@copilotkit/angular/a2ui';

import { formatIdImplementation } from './format-id';
import { milesProgressEntry } from './miles-progress';

export const customCatalog = new CopilotA2UICatalog(
  'https://example.com/catalogs/flights42-a2ui-demo',
  [...basicCatalog.components.values(), milesProgressEntry],
  [...basicCatalog.functions.values(), formatIdImplementation],
);
