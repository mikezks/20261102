import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import { Component, signal } from '@angular/core';
import type { A2UIClientEventMessage } from '@copilotkit/angular';
import { CopilotA2UISurface } from '@copilotkit/angular/a2ui';

import { customCatalog } from './custom-catalog/custom-catalog';
import { passengerSchema } from './custom-catalog/miles-progress-context';
import { createSurfaceMessages } from './passenger-card';

@Component({
  selector: 'app-root',
  imports: [CopilotA2UISurface],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly catalog = customCatalog;
  protected readonly surfaceId = 'passenger-card-surface';
  protected readonly operations = signal<A2uiMessage[]>(
    createSurfaceMessages(this.surfaceId, {
      id: 42,
      firstName: 'Anna',
      lastName: 'Miller',
      bonusMiles: 1200,
    }),
  );

  protected onAction({ userAction }: A2UIClientEventMessage): void {
    console.log('[A2UI Event]', userAction);

    if (userAction.name !== 'increaseMiles') {
      return;
    }

    const passenger = passengerSchema.parse(userAction.context);
    this.operations.update((operations) => [
      ...operations,
      {
        version: 'v0.9',
        updateDataModel: {
          surfaceId: this.surfaceId,
          path: '/passenger',
          value: {
            ...passenger,
            bonusMiles: passenger.bonusMiles + 300,
          },
        },
      },
    ]);
  }
}
