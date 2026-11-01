import { Component, computed, input } from '@angular/core';

import { type HotelInfo } from '../data-ai/hotel-info';

@Component({
  selector: 'app-hotel-card',
  template: `
    @let hotelValue = hotel();
    <div class="card">
      <div class="media">
        <img [src]="hotelValue.imageUrl" [alt]="hotelValue.name" />
      </div>
      <div class="card-header">
        <h2 class="card-title">{{ hotelValue.name }}</h2>
      </div>
      <div class="card-body">
        <p class="city">{{ hotelValue.city }}</p>
        <p class="stars" [attr.aria-label]="hotelValue.stars + ' stars'">
          @for (star of starsArray(); track $index) {
            <span class="star filled">★</span>
          }
          @for (star of emptyStarsArray(); track $index) {
            <span class="star empty">★</span>
          }
        </p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .card {
      margin: 0;
      overflow: hidden;
    }

    .media {
      width: 100%;
      aspect-ratio: 5 / 3;
      background: #e5e7eb;
      overflow: hidden;
    }

    .media img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .city {
      color: var(--color-label);
      font-size: var(--font-size-tiny);
      margin: 0 0 8px;
    }

    .stars {
      margin: 0;
      font-size: 1.1em;
      letter-spacing: 2px;
      line-height: 1;
    }

    .star.filled {
      color: #f5b301;
    }

    .star.empty {
      color: #d1d5db;
    }
  `,
})
export class HotelCard {
  readonly hotel = input.required<HotelInfo>();

  protected readonly starsArray = computed(() => Array.from({ length: this.hotel().stars }));
  protected readonly emptyStarsArray = computed(() =>
    Array.from({ length: Math.max(0, 5 - this.hotel().stars) }),
  );
}
