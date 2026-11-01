import { Component, computed, input } from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod/v3';

import { createComponentTool } from '@flight-demo/shared/ai-integration';

const destinationInfoSchema = z.object({
  city: z.string().describe('Destination city.'),
  country: z.string().describe('Country the city is located in.'),
  summary: z.string().describe('One or two sentences describing the destination.'),
  highlights: z
    .array(z.string())
    .max(4)
    .describe('Up to four short highlights: sights, food, practical tips.'),
});

type DestinationInfoArgs = z.infer<typeof destinationInfoSchema>;

@Component({
  selector: 'app-destination-info-card',
  template: `
    @let info = toolCall().args;
    @if (info.city) {
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">{{ info.city }}</h2>
        </div>
        <div class="card-body">
          <p class="country">{{ info.country }}</p>
          <p class="summary">{{ info.summary }}</p>
          @if (highlights().length > 0) {
            <ul class="highlights">
              @for (highlight of highlights(); track $index) {
                <li>{{ highlight }}</li>
              }
            </ul>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .country {
      color: var(--color-label);
      font-size: var(--font-size-tiny);
      margin: 0 0 8px;
    }

    .summary {
      margin: 0 0 8px;
    }

    .highlights {
      margin: 0;
      padding-left: 18px;
      font-size: var(--font-size-sm);
    }
  `,
})
export class DestinationInfoCard implements ToolRenderer<DestinationInfoArgs> {
  readonly toolCall = input.required<AngularToolCall<DestinationInfoArgs>>();

  protected readonly highlights = computed(() => this.toolCall().args.highlights ?? []);
}

export const destinationInfoCard = createComponentTool({
  name: 'destinationInfoCard',
  description: `
    Shows a compact info card about a destination city: country, a short
    summary and up to four highlights (sights, food, practical tips).
    Use it when the user asks what a destination is like or wants tips for a
    city they fly to. Fill the card from your own knowledge; it needs no data
    from any other tool.
  `,
  parameters: destinationInfoSchema,
  component: DestinationInfoCard,
  followUp: false,
});
