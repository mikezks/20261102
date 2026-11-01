import { Flight } from '../logic-flight/model/flight';

export interface FlightInfo {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

export function toBookingFlight(flight: FlightInfo): Flight {
  return {
    id: flight.id,
    from: flight.from,
    to: flight.to,
    date: flight.date,
    delayed: flight.delay > 0,
  };
}
