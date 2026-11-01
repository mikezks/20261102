import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent, provideNavigationService } from '@flight-demo/shared/navigation';

@Component({
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- preserves the workshop's pre-v22 behavior
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-flight-booking',
  imports: [RouterOutlet, NavigationComponent],
  template: `
    <app-navigation class="nav-standalone" />

    <div>
      <router-outlet></router-outlet>
    </div>
  `,
  providers: [
    provideNavigationService([
      {
        route: 'flight/search',
        label: 'Flight Search',
        icon: 'flight-search',
      },
      {
        route: 'my-flights',
        label: 'Selected Flights',
        icon: 'selected-flights',
      },
      { route: 'next-flights', label: 'Next Flights', icon: 'ticket' },
      { route: 'dashboard', label: 'AI Dashboard', icon: 'dashboard' },
      { route: 'mcp-hotels', label: 'MCP Hotels', icon: 'hotel' },
      { route: 'reporting', label: 'Reporting', icon: 'reporting' },
      { route: 'travel-planner', label: 'Travel Planner', icon: 'travel-planner' },
      {
        route: 'airport',
        label: 'Airports',
        icon: 'airport',
      },
    ]),
  ],
})
export class FlightBookingComponent {
  private readonly chat = inject(TicketingChatService);
  constructor() {
    this.chat.init();
  }
}

import { TicketingChatService } from '../../ai/ticketing-chat-service';
