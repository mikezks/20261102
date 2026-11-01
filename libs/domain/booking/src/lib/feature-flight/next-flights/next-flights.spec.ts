import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { TicketClient } from '../../data-ai/ticket-client';
import { FlightService } from '../../logic-flight/data-access/flight.service';
import type { Flight } from '../../logic-flight/model/flight';
import { BookingStore } from '../../logic-flight/state/booking.store';
import { NextFlightsOverview } from './next-flights';

const flight: Flight = {
  id: 901,
  from: 'Graz',
  to: 'Rome',
  date: '2026-11-12T09:00:00Z',
  delayed: false,
};

describe('Next Flights shared state', () => {
  let booked: Flight[];

  beforeEach(() => {
    booked = [flight];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: FlightService, useValue: { find: () => of([]) } },
      ],
    });
    vi.spyOn(TestBed.inject(TicketClient), 'find').mockImplementation(() => of(booked));
  });

  function button(element: HTMLElement, label: string): HTMLButtonElement {
    const match = [...element.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    if (!match) throw new Error(`Missing button: ${label}`);
    return match;
  }

  it('selects and delays a booked flight outside the search results and retains both after returning', async () => {
    const first = TestBed.createComponent(NextFlightsOverview);
    await first.whenStable();
    const store = TestBed.inject(BookingStore);
    const before = first.nativeElement.textContent;
    expect(store.flightEntities()).toEqual([]);

    button(first.nativeElement, 'Select').click();
    await first.whenStable();
    expect(store.selectedFlights().map((item) => item.id)).toEqual([flight.id]);

    button(first.nativeElement, 'Delay').click();
    await first.whenStable();
    button(first.nativeElement, 'Delay').click();
    await first.whenStable();
    expect(store.selectedFlights()[0].date).toBe('2026-11-12T09:10:00.000Z');
    expect(store.selectedFlights()[0].delayed).toBe(true);
    expect(first.nativeElement.textContent).not.toBe(before);
    const departure = first.nativeElement.querySelector('app-flight-card').textContent;
    first.destroy();

    const next = TestBed.createComponent(NextFlightsOverview);
    await next.whenStable();
    expect(next.nativeElement.querySelector('app-flight-card').textContent).toBe(departure);
    button(next.nativeElement, 'Remove').click();
    await next.whenStable();
    expect(store.selectedFlights()).toEqual([]);
    expect(next.nativeElement.querySelectorAll('app-flight-card')).toHaveLength(1);
  });

  it('reflects changes from other views and refreshes booking membership independently of selection', async () => {
    const fixture = TestBed.createComponent(NextFlightsOverview);
    await fixture.whenStable();
    const store = TestBed.inject(BookingStore);
    const before = fixture.nativeElement.querySelector('app-flight-card').textContent;

    store.updateBasket(flight.id, true, flight);
    store.delay(flight.id);
    await fixture.whenStable();
    expect(button(fixture.nativeElement, 'Remove')).toBeDefined();
    expect(fixture.nativeElement.querySelector('app-flight-card').textContent).not.toBe(before);

    button(fixture.nativeElement, 'Refresh').click();
    await fixture.whenStable();
    expect(store.selectedFlights()[0].date).toBe('2026-11-12T09:05:00.000Z');
    expect(button(fixture.nativeElement, 'Remove')).toBeDefined();

    booked = [];
    button(fixture.nativeElement, 'Refresh').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-flight-card')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No flights booked.');
    expect(store.selectedFlights()).toHaveLength(1);
  });
});
