import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FlightService } from '../logic-flight/data-access/flight.service';
import { BookingStore } from '../logic-flight/state/booking.store';
import { Flight } from '../logic-flight/model/flight';
import { MyFlightsComponent } from '../feature-flight/my-flights/my-flights.component';
import { FlightCardComponent } from '../ui-flight/flight-card/flight-card.component';
import { toBookingFlight } from '../data-ai/flight-info';
import { FlightWidget } from './flight-widget';

const flight = { id: 901, from: 'Graz', to: 'Hamburg', date: '2026-11-02T10:00:00Z', delay: 0 };

describe('FlightWidget and shared flight cards', () => {
  let searchResults: Flight[];
  beforeEach(() => {
    searchResults = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FlightService, useValue: { find: vi.fn(() => of(searchResults)) } },
      ],
    });
  });

  async function render(status = 'other') {
    const fixture = TestBed.createComponent(FlightWidget);
    fixture.componentRef.setInput('toolCall', {
      id: 'flight-card',
      name: 'flightWidget',
      args: { flight, status },
      status: 'complete',
    });
    await fixture.whenStable();
    await vi.waitFor(() => expect(TestBed.inject(FlightService).find).toHaveBeenCalled());
    await fixture.whenStable();
    return fixture;
  }

  it('waits for streamed flight arguments and keeps a stored delay when they arrive', async () => {
    const widget = TestBed.createComponent(FlightWidget);
    const toolCall = { id: 'streaming-flight', name: 'flightWidget', status: 'executing' };
    widget.componentRef.setInput('toolCall', { ...toolCall, args: {} });
    await widget.whenStable();
    expect(widget.nativeElement.querySelector('app-flight-card')).toBeNull();

    const store = TestBed.inject(BookingStore);
    store.delay(flight.id, 5, toBookingFlight(flight));
    widget.componentRef.setInput('toolCall', {
      ...toolCall,
      args: { flight, status: 'other' },
    });
    await widget.whenStable();
    const card = widget.debugElement.query(By.directive(FlightCardComponent))
      .componentInstance as FlightCardComponent;
    expect(card.item()?.date).toBe('2026-11-02T10:05:00.000Z');
    card.toggleSelection();
    await widget.whenStable();
    expect(store.selectedFlights()[0].date).toBe('2026-11-02T10:05:00.000Z');
  });

  it('selects a server flight absent from the search and removes it from either view', async () => {
    const widget = await render();
    const store = TestBed.inject(BookingStore);
    const selectedView = TestBed.createComponent(MyFlightsComponent);
    await selectedView.whenStable();
    const card = widget.debugElement.query(By.directive(FlightCardComponent))
      .componentInstance as FlightCardComponent;
    expect(store.flightEntities()).toEqual([]);
    card.toggleSelection();
    await widget.whenStable();
    expect(store.selectedFlights()).toEqual([toBookingFlight(flight)]);
    expect((selectedView.nativeElement as HTMLElement).textContent).toContain('Graz - Hamburg');
    store.reset();
    await selectedView.whenStable();
    const remove = (selectedView.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button',
    );
    remove?.click();
    await widget.whenStable();
    expect(store.selectedFlights()).toEqual([]);
    expect(card.selected()).toBe(false);
  });

  it('shares delay changes for a flight absent from the search and retains them when selected', async () => {
    const widget = await render();
    const card = widget.debugElement.query(By.directive(FlightCardComponent))
      .componentInstance as FlightCardComponent;
    const store = TestBed.inject(BookingStore);
    card.delay();
    await widget.whenStable();
    expect(card.item()?.date).toBe('2026-11-02T10:05:00.000Z');
    card.toggleSelection();
    await widget.whenStable();
    expect(store.selectedFlights()[0].date).toBe('2026-11-02T10:05:00.000Z');
    expect(store.flightEntities()).toEqual([]);
    expect(widget.nativeElement.querySelector('a').getAttribute('href')).toBe(
      '/booking/flight/edit/901',
    );
  });

  it('uses live search data rather than the stale flight snapshot from the chat', async () => {
    searchResults = [{ ...toBookingFlight(flight), date: '2026-11-02T11:00:00Z' }];
    const widget = await render();
    const store = TestBed.inject(BookingStore);
    const card = widget.debugElement.query(By.directive(FlightCardComponent))
      .componentInstance as FlightCardComponent;
    expect(card.item()?.date).toBe('2026-11-02T11:00:00Z');
    store.updateBasket(flight.id, true);
    store.delay(flight.id);
    await widget.whenStable();
    expect(card.selected()).toBe(true);
    expect(card.item()?.date).toBe('2026-11-02T11:05:00.000Z');
  });

  it('keeps informational cards read-only and booked cards limited to check-in', async () => {
    const widget = await render('none');
    expect(widget.nativeElement.querySelector('button, a')).toBeNull();
    widget.componentRef.setInput('toolCall', {
      id: 'booked',
      name: 'flightWidget',
      args: { flight, status: 'booked' },
      status: 'complete',
    });
    await widget.whenStable();
    expect(widget.nativeElement.querySelectorAll('button')).toHaveLength(1);
    expect(widget.nativeElement.textContent).toContain('Check in');
  });
});
