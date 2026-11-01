import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { FlightService } from '../data-access/flight.service';
import type { Flight } from '../model/flight';
import { BookingStore } from './booking.store';

const flight: Flight = {
  id: 3,
  from: 'Hamburg',
  to: 'Graz',
  date: '2026-10-12T09:00:00Z',
  delayed: false,
};

describe('BookingStore search completion', () => {
  let requests: { from: string; to: string; urgent: boolean; response: Subject<Flight[]> }[];

  beforeEach(() => {
    requests = [];

    TestBed.configureTestingModule({
      providers: [
        {
          provide: FlightService,
          useValue: {
            find: (from: string, to: string, urgent: boolean) => {
              const response = new Subject<Flight[]>();
              requests.push({ from, to, urgent, response });

              return response;
            },
          },
        },
      ],
    });
  });

  const waitForRequest = async (count: number) => {
    TestBed.tick();
    await vi.waitFor(() => expect(requests).toHaveLength(count));

    return requests[count - 1];
  };

  it('loads once on initialization and preserves entities, selection and reset behavior', async () => {
    const store = TestBed.inject(BookingStore);
    const request = await waitForRequest(1);
    expect([request.from, request.to]).toEqual(['Hamburg', 'Graz']);
    request.response.next([flight]);
    request.response.complete();
    expect(store.selectedFlights()).toEqual([flight]);
    store.delay(3);
    expect(store.flightEntities()[0].date).toBe('2026-10-12T09:05:00.000Z');
    expect(store.delayedFlights()).toHaveLength(1);
    store.reset();
    expect(store.flightEntities()).toEqual([]);
    expect(store.basket()[3]).toBe(true);
    expect(store.filter().from).toBe('Hamburg');
    TestBed.tick();
    expect(requests).toHaveLength(1);
  });

  it('awaits an empty result without issuing a duplicate request', async () => {
    const store = TestBed.inject(BookingStore);
    const result = store.search({ from: 'Paris', to: 'London', urgent: false });
    const request = await waitForRequest(1);
    expect(request.from).toBe('Paris');
    request.response.next([]);
    request.response.complete();
    await expect(result).resolves.toEqual([]);
    expect(store.loading()).toBe(false);
    expect(requests).toHaveLength(1);
  });

  it('preselects real results once and retains selected details across searches and reset', async () => {
    const store = TestBed.inject(BookingStore);
    const initial = await waitForRequest(1);
    const other = { ...flight, id: 77 };
    initial.response.next([flight, other, { ...flight, id: 88 }]);
    initial.response.complete();
    expect(store.selectedFlights().map((item) => item.id)).toEqual([3, 77]);
    const result = store.search({ from: 'Paris', to: 'London', urgent: false });
    const next = await waitForRequest(2);
    next.response.next([{ ...flight, id: 99 }]);
    next.response.complete();
    await result;
    expect(store.selectedFlights().map((item) => item.id)).toEqual([3, 77]);
    store.delay(77);
    expect(store.selectedFlights()[1].date).toBe('2026-10-12T09:05:00.000Z');
    store.reset();
    expect(store.selectedFlights()).toHaveLength(2);
    store.updateBasket(3, false);
    store.updateBasket(77, false);
    expect(store.selectedFlights()).toEqual([]);
    const reload = store.search({ from: 'Paris', to: 'London', urgent: false });
    const last = await waitForRequest(3);
    last.response.next([flight]);
    last.response.complete();
    await reload;
    expect(store.selectedFlights()).toEqual([]);
    expect(store.flightDetails()[77].delayed).toBe(true);
  });

  it('settles superseded calls and rejects stale results before the next debounce completes', async () => {
    const store = TestBed.inject(BookingStore);
    const first = store.search({ from: 'Paris', to: 'London', urgent: false });
    const firstRejected = expect(first).rejects.toThrow('superseded');
    const old = await waitForRequest(1);
    const second = store.search({ from: 'Graz', to: 'Hamburg', urgent: false });
    await firstRejected;
    expect(old.response.observed).toBe(false);
    old.response.next([flight]);
    expect(store.flightEntities()).toEqual([]);
    const current = await waitForRequest(2);
    current.response.next([]);
    current.response.complete();
    await expect(second).resolves.toEqual([]);
  });

  it('rejects invalid city names and recovers after the Urgent error', async () => {
    const store = TestBed.inject(BookingStore);

    await expect(store.search({ from: 'ab', to: 'Graz', urgent: false })).rejects.toThrow(
      'three characters',
    );

    const failed = store.search({ from: 'Hamburg', to: 'Graz', urgent: true });
    const rejection = expect(failed).rejects.toThrow('Could not load');
    const bad = await waitForRequest(1);
    expect(bad.urgent).toBe(true);
    bad.response.error(new Error('403'));
    await rejection;
    const recovered = store.search({ from: 'Hamburg', to: 'Graz', urgent: false });
    const good = await waitForRequest(2);
    good.response.next([flight]);
    good.response.complete();
    await expect(recovered).resolves.toEqual([flight]);
    expect(store.error()).toBe('');
  });

  it('cancels before debounce and while HTTP is pending', async () => {
    const store = TestBed.inject(BookingStore);
    const early = new AbortController();
    const first = store.search({ from: 'Graz', to: 'London', urgent: false }, early.signal);
    const firstRejected = expect(first).rejects.toThrow('cancelled');
    early.abort();
    await firstRejected;
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(requests).toHaveLength(0);
    const active = new AbortController();
    const second = store.search({ from: 'Graz', to: 'London', urgent: false }, active.signal);
    const secondRejected = expect(second).rejects.toThrow('cancelled');
    const request = await waitForRequest(1);
    active.abort();
    await secondRejected;
    expect(request.response.observed).toBe(false);
    expect(store.loading()).toBe(false);
  });
});
