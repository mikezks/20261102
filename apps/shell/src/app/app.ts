import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderbarComponent, SidebarComponent } from '@flight-demo/shared/core';

@Component({
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- preserves the workshop's pre-v22 behavior
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet, HeaderbarComponent, SidebarComponent],
  template: `
    <div class="wrapper">
      <nav
        aria-label="Main navigation"
        id="primary-navigation"
        class="sidebar"
        data-color="white"
        data-active-color="danger"
      >
        <app-sidebar-cmp />
      </nav>

      <div class="main-panel">
        <app-headerbar-cmp />

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class App {}
