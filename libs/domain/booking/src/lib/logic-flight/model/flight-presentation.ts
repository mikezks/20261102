import { formatZonedDateTime } from '@flight-demo/shared/core';
import type { Flight } from './flight';

/** The card and tool results share the browser's configured timezone. */
export function departureTime(
  flight: Flight,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  return { timeZone, display: formatZonedDateTime(flight.date, timeZone) };
}

export function withDepartureTime(flight: Flight) {
  return { ...flight, departure: departureTime(flight) };
}

export type PresentedFlight = ReturnType<typeof withDepartureTime>;
