import { inject } from '@angular/core';
import { TicketingChatService } from '../ai/ticketing-chat-service';
import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { Airport } from '../feature-flight/airport/airport';
import { FlightBookingComponent } from '../feature-flight/flight-booking/flight-booking.component';
import { FlightEditComponent } from '../feature-flight/flight-edit/flight-edit.component';
import { FlightSearchComponent } from '../feature-flight/flight-search/flight-search.component';
import { MyFlightsComponent } from '../feature-flight/my-flights/my-flights.component';
import { resolveFlight } from '../logic-flight/data-access/flight.resolver';
import { TicketEffects } from '../logic-flight/state/redux/effects';
import { ticketFeature } from '../logic-flight/state/redux/reducer';

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    component: FlightBookingComponent,
    canActivateChild: [
      () => {
        inject(TicketingChatService).init();
        return true;
      },
    ],
    providers: [provideState(ticketFeature), provideEffects([TicketEffects])],
    children: [
      {
        path: '',
        redirectTo: 'flight',
        pathMatch: 'full',
      },
      {
        path: 'flight',
        children: [
          {
            path: '',
            redirectTo: 'search',
            pathMatch: 'full',
          },
          {
            path: 'search',
            component: FlightSearchComponent,
          },
          {
            path: 'edit/:id',
            component: FlightEditComponent,
            resolve: {
              flight: resolveFlight,
            },
          },
        ],
      },
      {
        path: 'my-flights',
        component: MyFlightsComponent,
      },
      {
        path: 'mcp-hotels',
        loadComponent: () => import('../feature-mcp-hotels/mcp-hotels').then((m) => m.McpHotels),
      },
      {
        path: 'reporting',
        loadComponent: () =>
          import('../feature-reporting/reporting-page/reporting-page').then((m) => m.ReportingPage),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('../feature-dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'travel-planner',
        loadComponent: () =>
          import('../feature-travel-planner/travel-planner-page').then((m) => m.TravelPlannerPage),
      },
      {
        path: 'next-flights',
        loadComponent: () =>
          import('../feature-flight/next-flights/next-flights').then((m) => m.NextFlightsOverview),
      },
      {
        path: 'demo-bookings',
        redirectTo: 'next-flights',
        pathMatch: 'full',
      },
      {
        path: 'airport',
        component: Airport,
      },
    ],
  },
];

export default BOOKING_ROUTES;
