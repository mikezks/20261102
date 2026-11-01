import { Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectCdBlink } from '@flight-demo/shared/core';
import { Flight } from '../../logic-flight/model/flight';
import { departureTime as formatDepartureTime } from '../../logic-flight/model/flight-presentation';

@Component({
  selector: 'app-flight-card',
  imports: [RouterLink],
  styleUrl: './flight-card.component.css',
  template: `
    <div class="card" [style.background-color]="selected() ? 'rgb(204, 197, 185)' : 'white'">
      <div class="card-header">
        <h2 class="card-title">{{ item()?.from }} - {{ item()?.to }}</h2>
      </div>

      <div class="card-body">
        <p>Flight-No.: {{ item()?.id }}</p>
        @if (departureTime(); as departure) {
          <p>Departure: {{ departure.display }}</p>
        }
        <p>
          @if (allowSelection()) {
            <button
              type="button"
              [attr.aria-pressed]="selected() ? 'true' : 'false'"
              (click)="toggleSelection()"
              class="btn btn-info btn-sm"
              style="min-width: 85px; margin-right: 5px"
            >
              {{ selected() ? 'Remove' : 'Select' }}
            </button>
          }
          @if (allowEdit()) {
            <a
              [routerLink]="editLink() ?? ['../edit', item()?.id]"
              class="btn btn-success btn-sm"
              style="min-width: 85px; margin-right: 5px"
              >Edit</a
            >
          }
          @if (allowDelay()) {
            <button
              type="button"
              (click)="delay()"
              class="btn btn-danger btn-sm"
              style="min-width: 85px; margin-right: 5px"
            >
              Delay
            </button>
          }
          <ng-content />
        </p>
      </div>
    </div>

    <!-- {{ blink() }} -->
  `,
})
export class FlightCardComponent {
  readonly item = input<Flight>();
  readonly selected = model(false);
  readonly allowSelection = input(true);
  readonly editLink = input<readonly (string | number)[]>();
  readonly allowDelay = input(true);
  readonly allowEdit = input(true);

  readonly delayTrigger = output<Flight>();

  protected readonly departureTime = computed(() => {
    const flight = this.item();

    return flight ? formatDepartureTime(flight) : undefined;
  });

  protected readonly blink = injectCdBlink();

  toggleSelection(): void {
    this.selected.update((selected) => !selected);
  }

  delay(): void {
    const flight = this.item();

    if (flight) {
      this.delayTrigger.emit(flight);
    }
  }
}
