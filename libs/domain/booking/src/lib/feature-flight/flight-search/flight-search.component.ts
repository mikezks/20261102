import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Flight } from '../../logic-flight/model/flight';
import { BookingStore } from '../../logic-flight/state/booking.store';
import { FlightFilter } from '../../logic-flight/model/flight-filter';
import { FlightCardComponent } from '../../ui-flight/flight-card/flight-card.component';
import { FlightFilterComponent } from '../../ui-flight/flight-filter/flight-filter.component';

@Component({
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- preserves the workshop's pre-v22 behavior
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-flight-search',
  imports: [JsonPipe, FlightCardComponent, FlightFilterComponent],
  templateUrl: './flight-search.component.html',
})
export class FlightSearchComponent {
  private store = inject(BookingStore);

  protected filter = this.store.filter;
  protected flights = this.store.flightEntities;
  protected basket = this.store.basket;
  protected loading = this.store.loading;
  protected error = this.store.error;
  protected selectedFlights = this.store.selectedFlights;

  protected search(filter: FlightFilter): void {
    this.store.updateFilter(filter.from, filter.to, filter.urgent);
  }

  protected delay(flight: Flight): void {
    this.store.delay(flight.id);
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.store.updateBasket(flightId, selected);
  }

  protected reset(): void {
    this.store.reset();
  }
}
