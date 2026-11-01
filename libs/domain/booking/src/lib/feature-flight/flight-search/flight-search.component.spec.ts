import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FlightSearchComponent } from './flight-search.component';
import { BookingStore } from '../../logic-flight/state/booking.store';

describe('FlightSearchComponent without Zone.js', () => {
  it('renders a later HTTP response without another user interaction', async () => {
    TestBed.configureTestingModule({
      imports: [FlightSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(FlightSearchComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.autoDetectChanges();

    const element = fixture.nativeElement as HTMLElement;
    // The root store starts the initial request after its 300 ms debounce.
    const request = await vi.waitFor(() => http.expectOne((req) => req.url.endsWith('/flight')));
    expect(request.request.params.get('from')).toBe('Hamburg');
    expect(request.request.params.get('to')).toBe('Graz');
    // Finish initial change detection before delivering the later response.
    expect(element.querySelectorAll('app-flight-card').length).toBe(0);

    request.flush([
      { id: 101, from: 'Paris', to: 'New York', date: '2026-09-21T10:00:00Z', delayed: false },
    ]);

    expect(TestBed.inject(BookingStore).error()).toBe('');
    expect(TestBed.inject(BookingStore).flightEntities()).toHaveLength(1);
    await fixture.whenStable();

    expect(element.querySelectorAll('app-flight-card').length).toBe(1);
    expect(element.querySelector('app-flight-card')?.textContent).toContain('Paris - New York');
    http.verify();
  });
});
