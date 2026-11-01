import { provideCopilotKit } from '@copilotkit/angular';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideRouterFeature } from '@flight-demo/shared/state';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient } from '@angular/common/http';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // CopilotKit 0.6 has a root-scoped inspector; disable it before lazy routes create their scoped kit.
    provideCopilotKit({ enableInspector: false }),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(APP_ROUTES),
    provideStore(),
    provideEffects(),
    provideRouterFeature(),
    provideStoreDevtools(),
  ],
};
