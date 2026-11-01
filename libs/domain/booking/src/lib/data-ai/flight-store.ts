import { computed, inject, Service } from '@angular/core';
import { BookingStore } from '../logic-flight/state/booking.store';

/** The AUI tools and the existing flight screens share the same booking state. */
@Service()
export class FlightStore {
  readonly booking = inject(BookingStore);
  readonly basket = this.booking.basket;
  readonly flightsValue = this.booking.flightEntities;
  readonly from = computed(() => this.booking.filter().from);
  readonly to = computed(() => this.booking.filter().to);
  readonly updateBasket = this.booking.updateBasket;
  readonly updateFilter = this.booking.updateFilter;
  readonly search = this.booking.search;
}
