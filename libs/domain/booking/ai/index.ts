import type { Provider } from '@angular/core';
import { TicketingChatService } from '../src/lib/ai/ticketing-chat-service';
import { PlanHandoff } from '../src/lib/ai/plan/plan-handoff';
import { TravelPlanStore } from '../src/lib/feature-travel-planner/travel-plan-store';
import { TravelRefinementChatService } from '../src/lib/feature-travel-planner/travel-refinement-chat-service';

/** Shared by routed screens and widgets rendered in the surrounding chat. */
export function provideBookingAi(): Provider[] {
  return [TicketingChatService, PlanHandoff, TravelPlanStore, TravelRefinementChatService];
}
