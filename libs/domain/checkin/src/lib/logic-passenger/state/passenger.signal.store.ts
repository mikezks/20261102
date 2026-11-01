import { inject } from '@angular/core';
import { delegated } from '@flight-demo/shared/core';
import { patchState, signalStore, type, withMethods, withProps, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { PassengerService } from '../data-access/passenger.service';
import { Passenger, PassengerFilter } from '../model/passenger';


export const PassengerStore = signalStore(
  { providedIn: 'root' },
  // State
  withState({
    filter: {
      firstname: '',
      lastname: 'Smith'
    }
  }),
  withEntities({ entity: type<Passenger>(), collection: 'passenger' }),
  // Updater
  withMethods(store => ({
    setFilter: (filter: PassengerFilter) => patchState(store, { filter }),
    setPassengers: (state: { passengers: Passenger[] }) => patchState(store,
      setAllEntities(state.passengers, { collection: 'passenger' })),
  })),
  withProps(store => ({
    writableFilter: delegated(store.filter, store.setFilter),
  })),
  // Effects
  withMethods((
    store,
    passengerService = inject(PassengerService)
  ) => ({
    loadPassengers: rxMethod<{
      firstName: string,
      name: string
    }>(pipe(
      tap(console.log),
      switchMap(filter => passengerService.find(
        filter.firstName, filter.name
      )),
      tap(passengers => store.setPassengers({ passengers }))
    ))
  })),
);
