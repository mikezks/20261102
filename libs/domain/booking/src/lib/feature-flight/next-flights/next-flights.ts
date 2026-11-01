import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketClient } from '../../data-ai/ticket-client';
import { BookingStore } from '../../logic-flight/state/booking.store';
import { FlightCardComponent } from '../../ui-flight/flight-card/flight-card.component';

@Component({
  selector: 'app-next-flights',
  imports: [FlightCardComponent, RouterLink],
  template: `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">Your Next Flights</h2>
      </div>
      <div class="card-body">
        <button
          type="button"
          class="btn btn-default"
          (click)="tickets.reload()"
          [disabled]="tickets.isLoading()"
        >
          Refresh
        </button>
        @if (tickets.error()) {
          <p class="alert alert-danger" role="alert">
            Could not load your booked flights. Please try again.
          </p>
        }
        @if (tickets.isLoading()) {
          <p role="status">Loading bookings…</p>
        }
      </div>
    </section>

    <div class="row">
      @for (flight of flights(); track flight.id) {
        <div class="col-xs-12 col-sm-6 col-md-4">
          <app-flight-card
            [item]="flight"
            [selected]="!!store.basket()[flight.id]"
            [editLink]="['/booking/flight/edit', flight.id]"
            (selectedChange)="store.updateBasket(flight.id, $event, flight)"
            (delayTrigger)="store.delay($event.id, 5, $event)"
          >
            <button
              type="button"
              class="btn btn-default btn-sm"
              [routerLink]="['/checkin/passenger/search', { ticketId: flight.id }]"
            >
              Check in
            </button>
          </app-flight-card>
        </div>
      } @empty {
        @if (!tickets.isLoading() && !tickets.error()) {
          <div class="col-12">
            <p role="status">No flights booked.</p>
          </div>
        }
      }
    </div>
  `,
})
export class NextFlightsOverview {
  protected readonly tickets = inject(TicketClient).findTickets();
  protected readonly store = inject(BookingStore);
  protected readonly flights = computed(() => {
    const booked = this.tickets.hasValue() ? this.tickets.value() : [];
    const entities = this.store.flightEntityMap();
    const details = this.store.flightDetails();

    return booked.map((flight) => entities[flight.id] ?? details[flight.id] ?? flight);
  });
}
