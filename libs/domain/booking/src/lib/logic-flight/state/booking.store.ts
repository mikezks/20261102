import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  removeAllEntities,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  debounceTime,
  EMPTY,
  filter,
  finalize,
  pipe,
  Subject,
  switchMap,
  takeUntil,
  timeout,
} from 'rxjs';
import { FlightService } from '../data-access/flight.service';
import { FlightFilter } from '../model/flight-filter';
import { Flight } from '../model/flight';

export const BookingStore = signalStore(
  { providedIn: 'root' },
  withState({
    filter: { from: 'Hamburg', to: 'Graz', urgent: false } as FlightFilter,
    basket: {} as Record<number, boolean>,
    flightDetails: {} as Record<number, Flight>,
    loading: false,
    error: '',
  }),
  withEntities({ entity: type<Flight>(), collection: 'flight' }),
  withComputed(({ flightEntities, flightEntityMap, basket, flightDetails }) => ({
    selectedFlights: computed(() =>
      Object.entries(basket())
        .filter(([, selected]) => selected)
        .map(([id]) => flightEntityMap()[Number(id)] ?? flightDetails()[Number(id)])
        .filter((flight): flight is Flight => !!flight),
    ),
    delayedFlights: computed(() => flightEntities().filter((flight) => flight.delayed)),
  })),
  withMethods((store, flightService = inject(FlightService)) => {
    let revision = 0;
    let initializeSelection = true;
    const cancelledFilters = new WeakSet<FlightFilter>();
    const cancelRequest = new Subject<void>();

    let waiting:
      { revision: number; finish: (flights?: Flight[], error?: Error) => void } | undefined;

    const supersede = () => {
      cancelledFilters.add(store.filter());
      revision++;
      cancelRequest.next();
      waiting?.finish(undefined, new Error('Search superseded.'));
      patchState(store, { loading: false });
    };

    const updateFilter = (from: string, to: string, urgent = false) => {
      supersede();
      patchState(store, { filter: { from, to, urgent }, error: '' });
    };

    return {
      updateFilter,
      search: (filter: FlightFilter, signal?: AbortSignal): Promise<Flight[]> => {
        if (signal?.aborted) return Promise.reject(new Error('Search cancelled.'));

        if (filter.from.length < 3 || filter.to.length < 3)
          return Promise.reject(new Error('City names require at least three characters.'));

        updateFilter(filter.from, filter.to, filter.urgent);
        const requestRevision = revision;
        const requestFilter = store.filter();

        return new Promise((resolve, reject) => {
          const cancel = () => {
            cancelledFilters.add(requestFilter);

            if (revision === requestRevision) revision++;

            cancelRequest.next();
            patchState(store, { loading: false });
            finish(undefined, new Error('Search cancelled.'));
          };

          const timer = setTimeout(() => {
            cancelledFilters.add(requestFilter);

            if (revision === requestRevision) revision++;

            cancelRequest.next();
            patchState(store, { loading: false, error: 'Search timed out.' });
            finish(undefined, new Error('Search timed out.'));
          }, 20_000);

          const finish = (flights?: Flight[], error?: Error) => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);

            if (waiting?.revision === requestRevision) waiting = undefined;

            if (error) reject(error);
            else resolve(flights ?? []);
          };

          waiting = { revision: requestRevision, finish };
          signal?.addEventListener('abort', cancel, { once: true });
        });
      },
      updateBasket: (flightId: number, selected: boolean, fallback?: Flight) => {
        initializeSelection = false;
        const details = { ...store.flightDetails() };
        const flight =
          store.flightEntityMap()[flightId] ??
          details[flightId] ??
          (fallback?.id === flightId ? fallback : undefined);

        if (selected && !flight) return;

        if (selected) details[flightId] = { ...flight };

        patchState(store, ({ basket }) => ({
          basket: { ...basket, [flightId]: selected },
          flightDetails: details,
        }));
      },
      delay: (id: number, addMin = 5, fallback?: Flight) => {
        const flight =
          store.flightEntityMap()[id] ??
          store.flightDetails()[id] ??
          (fallback?.id === id ? fallback : undefined);

        if (!flight) return;

        const changes = {
          date: new Date(new Date(flight.date).getTime() + 1000 * 60 * addMin).toISOString(),
          delayed: true,
        };

        patchState(
          store,
          updateEntity(
            {
              id,
              changes,
            },
            { collection: 'flight' },
          ),
          {
            flightDetails: {
              ...store.flightDetails(),
              [id]: { ...flight, ...changes },
            },
          },
        );
      },
      load: rxMethod<FlightFilter>(
        pipe(
          filter((filter) => filter.from.length >= 3 && filter.to.length >= 3),
          debounceTime(300),
          switchMap((filter) => {
            if (filter !== store.filter() || cancelledFilters.has(filter)) return EMPTY;

            const requestRevision = revision;
            patchState(store, { loading: true, error: '' });

            return flightService.find(filter.from, filter.to, filter.urgent).pipe(
              takeUntil(cancelRequest),
              timeout(15_000),
              tapResponse({
                next: (flights) => {
                  if (requestRevision !== revision) return;

                  const basket = initializeSelection
                    ? Object.fromEntries(flights.slice(0, 2).map((flight) => [flight.id, true]))
                    : store.basket();

                  initializeSelection = false;
                  const flightDetails = { ...store.flightDetails() };

                  for (const flight of flights) {
                    if (basket[flight.id]) flightDetails[flight.id] = { ...flight };
                  }

                  patchState(store, setAllEntities(flights, { collection: 'flight' }), {
                    basket,
                    flightDetails,
                  });

                  if (waiting?.revision === requestRevision) waiting.finish(flights);
                },
                error: () => {
                  if (requestRevision !== revision) return;

                  const error = new Error('Could not load flights. Please try again.');
                  patchState(store, { error: error.message });

                  if (waiting?.revision === requestRevision) waiting.finish(undefined, error);
                },
              }),
              finalize(() => {
                if (requestRevision === revision) patchState(store, { loading: false });
              }),
            );
          }),
        ),
      ),
      reset: () => {
        supersede();
        patchState(store, removeAllEntities({ collection: 'flight' }), { error: '' });
      },
      disposeSearch: () => supersede(),
    };
  }),
  withHooks({
    onInit: ({ filter, load }) => load(filter),
    onDestroy: (store) => store.disposeSearch(),
  }),
);
