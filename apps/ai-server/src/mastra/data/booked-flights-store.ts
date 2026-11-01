import { z } from 'zod';
const FLIGHT_API_BASE =
  process.env['FLIGHT_API_URL'] || 'https://demo.angulararchitects.io/api/flight';

export interface BookedFlight {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

const rawFlightSchema = z.object({
  id: z.number().int().positive(),
  from: z.string(),
  to: z.string(),
  date: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Invalid flight date'),
  delayed: z.boolean().optional(),
  delay: z.number().finite().nonnegative().optional(),
});

const bookedFlightIds = new Set<number>([1, 2, 50, 516]);

const flightCache = new Map<number, BookedFlight>();

export async function fetchFlight(id: number): Promise<BookedFlight | null> {
  if (flightCache.has(id)) {
    return flightCache.get(id)!;
  }

  const url = new URL(FLIGHT_API_BASE);
  url.searchParams.set('id', String(id));
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load flight ${id}: ${response.status}`);
  }

  const raw = rawFlightSchema.parse(await response.json());
  if (raw.id !== id) throw new Error(`Flight lookup returned a different id for ${id}.`);
  const flight: BookedFlight = {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    date: raw.date,
    delay: raw.delay ?? (raw.delayed ? 15 : 0),
  };

  flightCache.set(id, flight);
  return flight;
}

export function isBooked(flightId: number): boolean {
  return bookedFlightIds.has(flightId);
}

export function addBooking(flightId: number): void {
  bookedFlightIds.add(flightId);
}

export function removeBooking(flightId: number): void {
  bookedFlightIds.delete(flightId);
}

export function getBookedFlightIds(): number[] {
  return [...bookedFlightIds];
}

export async function getBookedFlights(): Promise<BookedFlight[]> {
  const ids = getBookedFlightIds();
  const flights = await Promise.all(ids.map((id) => fetchFlight(id)));
  return flights.filter((flight): flight is BookedFlight => flight !== null);
}
