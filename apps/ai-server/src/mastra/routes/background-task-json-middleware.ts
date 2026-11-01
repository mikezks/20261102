import {
  type AbstractAgent,
  type ActivityDeltaEvent,
  type BaseEvent,
  EventType,
  Middleware,
  type RunAgentInput,
} from '@ag-ui/client';
import { MASTRA_BACKGROUND_TASK_ACTIVITY_TYPE } from '@ag-ui/mastra';
import { map, type Observable } from 'rxjs';

export class BackgroundTaskJsonMiddleware extends Middleware {
  override run(input: RunAgentInput, next: AbstractAgent): Observable<BaseEvent> {
    return this.runNext(input, next).pipe(
      map((event) => {
        if (
          event.type !== EventType.ACTIVITY_DELTA ||
          (event as ActivityDeltaEvent).activityType !== MASTRA_BACKGROUND_TASK_ACTIVITY_TYPE
        ) {
          return event;
        }

        // @ag-ui/mastra 2.0.2 forwards raw workflow output, including nested
        // undefined fields. Apply the same JSON conversion as SSE before the
        // server's patch validator sees it. Do not discard malformed operations.
        return JSON.parse(JSON.stringify(event)) as ActivityDeltaEvent;
      }),
    );
  }
}
