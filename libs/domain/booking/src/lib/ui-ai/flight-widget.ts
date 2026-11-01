import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod/v3';

import { createComponentTool } from '@flight-demo/shared/ai-integration';
import { toBookingFlight } from '../data-ai/flight-info';
import { BookingStore } from '../logic-flight/state/booking.store';
import { FlightCardComponent } from '../ui-flight/flight-card/flight-card.component';

const flightSchema = z.object({
  id: z.number().describe('The flight id'),
  from: z.string().describe('Departure city'),
  to: z.string().describe('Arrival city'),
  date: z.string().describe(
    `
        Full ISO date-time including the time, e.g. "2026-06-24T08:20:00.000Z".
        Copy it character-for-character from the flight data you received; a
        value without a time component is an error.
      `,
  ),
  delay: z.number().describe('Delay in minutes'),
});

const flightWidgetSchema = z.object({
  flight: flightSchema,
  status: z.enum(['booked', 'other', 'none']).describe('Status of the flight'),
});

type FlightWidgetArgs = z.infer<typeof flightWidgetSchema>;

@Component({
  selector: 'app-flight-widget',
  imports: [FlightCardComponent, RouterLink],
  template: `
    @if (flight(); as flight) {
      @let status = toolCall().args.status ?? 'other';
      <app-flight-card
        [item]="flight"
        [selected]="!!booking.basket()[flight.id]"
        [allowSelection]="status === 'other'"
        [allowEdit]="status === 'other'"
        [allowDelay]="status === 'other'"
        [editLink]="['/booking/flight/edit', flight.id]"
        (selectedChange)="booking.updateBasket(flight.id, $event, flight)"
        (delayTrigger)="booking.delay($event.id, 5, $event)"
      >
        @if (status === 'booked') {
          <button
            class="btn btn-default"
            [routerLink]="['/checkin/document', { ticketId: flight.id }]"
          >
            Check in
          </button>
        }
      </app-flight-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class FlightWidget implements ToolRenderer<FlightWidgetArgs> {
  protected readonly booking = inject(BookingStore);

  readonly toolCall = input.required<AngularToolCall<FlightWidgetArgs>>();

  protected readonly flight = computed(() => {
    const flight = this.toolCall().args.flight;
    if (!flight) return undefined;
    return (
      this.booking.flightEntityMap()[flight.id] ??
      this.booking.flightDetails()[flight.id] ??
      toBookingFlight(flight)
    );
  });
}

export const flightWidget = createComponentTool({
  name: 'flightWidget',
  description: `
    Interactive card displaying one concrete flight.
    Call this whenever users should see flights: booked flight lists, specific booked-flight confirmations (e.g. "Did I book Paris?"), or current search/working-set flights.
    For booked flights use status: "booked"; for search/current flights use status: "other".
    Use status: "none" for purely informational proposals (e.g. flight suggestions in a chat) that must NOT show any action button.
  `,
  parameters: flightWidgetSchema,
  component: FlightWidget,
  followUp: false,
});
