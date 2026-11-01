import type { Routes } from '@angular/router';
import { AuiLayout } from './aui-layout';
import { auiProviders } from './aui.config';

export default [
  {
    path: '',
    component: AuiLayout,
    providers: auiProviders,
    children: [
      { path: 'booking', loadChildren: () => import('@flight-demo/domain/booking') },
      { path: 'checkin', loadChildren: () => import('@flight-demo/domain/checkin') },
      {
        path: 'voice',
        loadComponent: () => import('@flight-demo/shared/ai-integration').then((m) => m.VoicePage),
      },
    ],
  },
] satisfies Routes;
