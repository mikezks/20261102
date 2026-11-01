import { Routes } from '@angular/router';
import { HomeComponent } from '@flight-demo/shared/core';

export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'boarding',
    loadChildren: () => import('@flight-demo/domain/boarding'),
  },
  { path: '', loadChildren: () => import('./aui/aui.routes') },
  {
    path: '**',
    redirectTo: 'home',
  },
];
