/* eslint-disable @typescript-eslint/no-unused-vars -- Prepared imports are used by the exercise. */
import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '@flight-demo/shared/ai-integration';
import { addDeveloperMessage, reset } from '@flight-demo/shared/ai-integration';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { injectTravelRefinementAgentStore } from './travel-refinement-agent-store';

@Injectable()
export class TravelRefinementChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);
  private readonly agentStore = injectTravelRefinementAgentStore();

  public init(): void {
    this.chatRegistry.setChat({
      store: this.agentStore,
      greeting: 'Do you want to refine your travel plan?',
      showModeSelector: false,
    });
  }

  public reset(): void {
    reset(this.agentStore);
    const preamble = buildPreferencePreamble(this.requestStore.preferences());
    // TODO: Add preamble as a developer message when present, without starting a run.
  }
}

function buildPreferencePreamble(preferences: string): string | undefined {
  const trimmed = preferences.trim();
  if (!trimmed) {
    return undefined;
  }
  return (
    `For context, the traveler's original preferences for this trip are: ` +
    `"${trimmed}". Keep honoring them while refining the plan unless I ` +
    `explicitly ask to change them.`
  );
}
