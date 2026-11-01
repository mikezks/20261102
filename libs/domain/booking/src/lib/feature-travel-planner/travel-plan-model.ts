import { FlightInfo } from '../data-ai/flight-info';
import { HotelInfo } from '../data-ai/hotel-info';

export interface TravelPlan {
  summary: string;
  flights: FlightInfo[];
  hotels: HotelInfo[];
}

export const initialTravelPlan: TravelPlan = {
  summary: '',
  flights: [],
  hotels: [],
};
