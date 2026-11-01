import { CheckinChatService } from '../feature-document/checkin-chat-service';
import { Routes } from '@angular/router';
import { MilesComponent } from '../feature-miles/miles/miles.component';
import { PassengerEditComponent } from '../feature-passenger/passenger-edit/passenger-edit.component';
import { PassengerSearchComponent } from '../feature-passenger/passenger-search/passenger-search.component';

export const CHECKIN_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'passenger',
        pathMatch: 'full',
      },
      {
        path: 'passenger',
        children: [
          {
            path: '',
            redirectTo: 'search',
            pathMatch: 'full',
          },
          {
            path: 'search',
            component: PassengerSearchComponent,
          },
          {
            path: 'edit/:id',
            component: PassengerEditComponent,
          },
        ],
      },
      {
        path: 'document',
        providers: [CheckinChatService],
        loadComponent: () => import('../feature-document/checkin-page').then((m) => m.CheckinPage),
      },
      {
        path: 'miles',
        component: MilesComponent,
      },
    ],
  },
];

export default CHECKIN_ROUTES;
