import { HttpAgent, type BaseEvent, type RunAgentInput } from '@ag-ui/client';
import {
  EventType,
  type Message,
  type MessagesSnapshotEvent,
  type RunErrorEvent,
  type RunFinishedEvent,
  type RunStartedEvent,
} from '@ag-ui/core';
import { lastValueFrom, of, Subject, throwError, toArray } from 'rxjs';

import { SentFilterMiddleware } from './agent-middlewares';

const started: RunStartedEvent = {
  type: EventType.RUN_STARTED,
  threadId: 'thread',
  runId: 'run',
};
const finished: RunFinishedEvent = {
  type: EventType.RUN_FINISHED,
  threadId: 'thread',
  runId: 'run',
};
const failed: RunErrorEvent = { type: EventType.RUN_ERROR, message: 'The model failed.' };
const question: Message = { id: 'question', role: 'user', content: 'Find flights to Graz.' };
const earlier: Message = { id: 'earlier', role: 'user', content: 'Hello.' };
const answer: Message = { id: 'answer', role: 'assistant', content: 'Here are your flights.' };

function input(messages: Message[]): RunAgentInput {
  return {
    threadId: 'thread',
    runId: 'run',
    messages,
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
  };
}

describe('SentFilterMiddleware', () => {
  let middleware: SentFilterMiddleware;
  let agent: HttpAgent;

  beforeEach(() => {
    middleware = new SentFilterMiddleware();
    agent = new HttpAgent({ url: 'https://unused.invalid/ag-ui' });
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['transport error', 'RUN_ERROR', 'incomplete stream'] as const)(
    'retries unconfirmed input after %s without resending confirmed history',
    async (failure) => {
      const run = vi.spyOn(agent, 'run').mockReturnValue(of(started, finished));
      await lastValueFrom(middleware.run(input([earlier]), agent).pipe(toArray()));

      const request = input([earlier, question]);
      if (failure === 'transport error') {
        run.mockReturnValue(throwError(() => new Error('Connection lost')));
        await expect(lastValueFrom(middleware.run(request, agent))).rejects.toThrow(
          'Connection lost',
        );
      } else {
        run.mockReturnValue(failure === 'RUN_ERROR' ? of(started, failed) : of(started));
        await lastValueFrom(middleware.run(request, agent).pipe(toArray()));
      }

      run.mockReturnValue(of(started, finished));
      await lastValueFrom(middleware.run(request, agent).pipe(toArray()));
      expect(run.mock.lastCall?.[0].messages).toEqual([question]);
    },
  );

  it('retries messages after an in-progress run is cancelled', async () => {
    const events = new Subject<BaseEvent>();
    const run = vi.spyOn(agent, 'run').mockReturnValue(events);
    const request = input([question]);
    const subscription = middleware.run(request, agent).subscribe();
    events.next(started);
    subscription.unsubscribe();
    events.complete();

    run.mockReturnValue(of(started, finished));
    await lastValueFrom(middleware.run(request, agent).pipe(toArray()));
    expect(run.mock.lastCall?.[0].messages).toEqual([question]);
  });

  it('confirms both input and generated messages only after a successful run', async () => {
    // A server snapshot can replace the local message list, omitting the consumed input.
    const snapshot: MessagesSnapshotEvent = {
      type: EventType.MESSAGES_SNAPSHOT,
      messages: [answer],
    };
    const run = vi.spyOn(agent, 'run').mockReturnValue(of(started, snapshot, finished));
    await lastValueFrom(middleware.run(input([question]), agent).pipe(toArray()));

    run.mockReturnValue(of(started, finished));
    await lastValueFrom(middleware.run(input([question, answer]), agent).pipe(toArray()));
    expect(run.mock.lastCall?.[0].messages).toEqual([]);
  });

  it('keeps the matching assistant call with a new tool result', async () => {
    const call: Message = {
      id: 'assistant-tool-call',
      role: 'assistant',
      toolCalls: [
        { id: 'search-call', type: 'function', function: { name: 'findFlights', arguments: '{}' } },
      ],
    };
    const result: Message = {
      id: 'result',
      role: 'tool',
      toolCallId: 'search-call',
      content: '[]',
    };
    const run = vi.spyOn(agent, 'run').mockReturnValue(of(started, finished));
    await lastValueFrom(middleware.run(input([question, call]), agent).pipe(toArray()));

    await lastValueFrom(middleware.run(input([question, call, result]), agent).pipe(toArray()));
    expect(run.mock.lastCall?.[0].messages).toEqual([call, result]);
  });

  it('does not filter or confirm proxied MCP requests', async () => {
    const run = vi.spyOn(agent, 'run').mockReturnValue(of(started, finished));
    await lastValueFrom(middleware.run(input([earlier]), agent).pipe(toArray()));
    const request = {
      ...input([earlier, question]),
      forwardedProps: { __proxiedMCPRequest: true },
    };
    await lastValueFrom(middleware.run(request, agent).pipe(toArray()));
    expect(run.mock.lastCall?.[0]).toBe(request);

    await lastValueFrom(middleware.run(input([earlier, question]), agent).pipe(toArray()));
    expect(run.mock.lastCall?.[0].messages).toEqual([question]);
  });

  it('sends the full history again after an explicit reset', async () => {
    const run = vi.spyOn(agent, 'run').mockReturnValue(of(started, finished));
    const request = input([question]);
    await lastValueFrom(middleware.run(request, agent).pipe(toArray()));
    middleware.clear();

    await lastValueFrom(middleware.run(request, agent).pipe(toArray()));
    expect(run.mock.lastCall?.[0].messages).toEqual([question]);
  });
});
