import type { CopilotA2UIComponentImplementation } from '@copilotkit/angular/a2ui';
import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { calcNextThreshold, calcProgressPercent, calcRemainingMiles } from './miles-calc';
import {
  initialContext,
  MilesProgressContext,
  milesProgressSchema,
} from './miles-progress-context';

@Component({
  selector: 'app-miles-progress',
  imports: [DecimalPipe],
  template: `
    <section class="miles-progress">
      <p class="eyebrow">Miles Progress</p>
      <p class="current">{{ passenger().bonusMiles | number }}</p>
      <p class="remaining">
        {{ remainingMiles() | number }} miles to {{ nextThreshold() | number }}
      </p>

      <div aria-hidden="true" class="track">
        <div class="fill" [style.width.%]="progressPercent()"></div>
      </div>
    </section>
  `,
  styleUrl: './miles-progress.css',
})
export class MilesProgress {
  readonly props = input<MilesProgressContext>(initialContext);

  protected readonly passenger = computed(() => this.props().passenger);
  protected readonly nextThreshold = computed(() => calcNextThreshold(this.passenger().bonusMiles));
  protected readonly remainingMiles = computed(() =>
    calcRemainingMiles(this.nextThreshold(), this.passenger().bonusMiles),
  );
  protected readonly progressPercent = computed(() =>
    calcProgressPercent(this.nextThreshold(), this.passenger().bonusMiles),
  );
}

export const milesProgressEntry = {
  name: 'MilesProgress',
  component: MilesProgress,
  schema: milesProgressSchema as unknown,
} as unknown as CopilotA2UIComponentImplementation;
