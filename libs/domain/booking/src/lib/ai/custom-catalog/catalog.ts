/* eslint-disable @typescript-eslint/no-unused-vars -- Prepared imports are used by the exercise. */
import { createAngularCatalog } from '@copilotkit/angular/a2ui';

import { TicketWidget } from './ticket/ticket-widget';
import { ticketingExtraComponents } from './ticketing-extra-components';

export const customCatalog = createAngularCatalog(
  ticketingExtraComponents,
  {}, // TODO: Map TicketWidget to its Angular component.
  {
    catalogId: 'https://example.com/catalogs/flights42-a2ui-demo',
    includeBasicCatalog: true,
  },
);
