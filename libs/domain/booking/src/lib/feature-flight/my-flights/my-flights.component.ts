import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FlightCardComponent } from '../../ui-flight/flight-card/flight-card.component';
import { BookingStore } from '../../logic-flight/state/booking.store';

@Component({
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- preserves the workshop's pre-v22 behavior
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-my-flights',
  imports: [FlightCardComponent],
  template: `
    <div class="card page-title-card">
      <div class="card-header">
        <h2 class="card-title">Selected Flights</h2>
      </div>

      <div class="card-body"></div>
    </div>

    <div class="row">
      @for (flight of store.selectedFlights(); track flight.id) {
        <div class="col-xs-12 col-sm-6 col-md-4">
          <app-flight-card
            [item]="flight"
            [selected]="true"
            [editLink]="['/booking/flight/edit', flight.id]"
            (selectedChange)="store.updateBasket(flight.id, $event)"
            (delayTrigger)="store.delay($event.id)"
          />
        </div>
      } @empty {
        <div class="col-12">
          <div class="alert alert-info" role="status">
            @if (store.loading()) {
              Loading flights…
            } @else {
              No flights selected. Select flights in Flight Search or Next Flights, or ask the
              booking assistant.
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .alert-info {
      color: #153b4a;
    }
  `,
})
export class MyFlightsComponent {
  protected readonly store = inject(BookingStore);
}
