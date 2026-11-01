import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { HttpAgent, type RunAgentInput } from '@ag-ui/client';
import { EventSchema } from '@ag-ui/core/schemas';
import { Agent } from '@mastra/core/agent';
import { RequestContext } from '@mastra/core/request-context';

import { streamAgentEvents } from '../src/mastra/routes/ag-ui-stream';
import { toAgUiAgent } from '../src/mastra/routes/route-utils';

const input: RunAgentInput = {
  threadId: 'activity-fixture-thread',
  runId: 'activity-fixture-run',
  messages: [],
  tools: [],
  state: {},
  context: [],
  forwardedProps: {},
};
const task = {
  taskId: 'activity-fixture-task',
  toolCallId: 'activity-fixture-call',
  toolName: 'workflow-packageTourWorkflow',
};

async function streamTask(t: TestContext, output: unknown) {
  const errors: string[] = [];
  for (const level of ['error', 'warn'] as const) {
    t.mock.method(console, level, (...messages: unknown[]) => {
      errors.push(messages.map(String).join(' '));
    });
  }
  const agent = new Agent({
    id: 'activity-fixture',
    name: 'Activity fixture',
    instructions: 'Fixture only.',
    model: 'openai/gpt-6-luna',
  });
  t.mock.method(agent, 'stream', async () => ({
    fullStream: (async function* () {
      yield { type: 'background-task-started', payload: task };
      yield {
        type: 'background-task-output',
        payload: { ...task, payload: output },
      };
      yield {
        type: 'background-task-progress',
        payload: { taskIds: [task.taskId], elapsedMs: 0 },
      };
      yield {
        type: 'background-task-completed',
        payload: { ...task, result: { ok: true }, completedAt: new Date('2026-11-03T00:00:00Z') },
      };
    })(),
  }));
  const bridge = toAgUiAgent({
    agentId: agent.id,
    mastraAgent: agent,
    input,
    requestContext: new RequestContext(),
  });
  const data: string[] = [];
  await streamAgentEvents(
    {
      writeSSE: async (message) => {
        data.push(message.data);
      },
    },
    bridge,
    input,
  );
  return {
    data,
    errors,
    messages: bridge.messages,
    events: data.map((value) => EventSchema.parse(JSON.parse(value))),
  };
}

test('streams workflow output with optional undefined fields through the real adapter and HTTP client', async (t) => {
  const plan = { summary: 'Three days in Rome.', flights: [], hotels: [] };
  const output = {
    output: {
      type: 'workflow-finish',
      payload: {
        workflowStatus: 'success',
        metadata: { optional: undefined },
        output: { usage: { inputTokens: undefined } },
        finalWorkflowResult: plan,
      },
    },
    values: [0, false, null, undefined],
    toolCallId: task.toolCallId,
    toolName: task.toolName,
  };
  const { data, events, errors, messages } = await streamTask(t, output);
  assert.deepEqual(errors, [], 'The server must apply workflow progress without patch errors.');
  assert.deepEqual(
    events.filter((event) => event.type === 'RUN_ERROR'),
    [],
  );
  assert.equal(events.at(-1)?.type, 'RUN_FINISHED');

  const client = new HttpAgent({
    url: 'https://fixture.invalid/ag-ui/travelPlannerAgent',
    threadId: input.threadId,
    fetch: async () =>
      new Response(data.map((value) => `data: ${value}\n\n`).join(''), {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
  });
  await client.runAgent(input);
  const activity = client.messages.find((message) => message.role === 'activity');
  assert.equal(activity?.role, 'activity');
  if (activity?.role !== 'activity') assert.fail('The background task activity is missing.');
  assert.equal(activity.content['status'], 'completed');
  assert.equal(activity.content['elapsedMs'], 0);
  assert.equal(activity.content['completedAt'], '2026-11-03T00:00:00.000Z');
  assert.deepEqual(activity.content['outputs'], [
    {
      output: {
        type: 'workflow-finish',
        payload: {
          workflowStatus: 'success',
          metadata: {},
          output: { usage: {} },
          finalWorkflowResult: plan,
        },
      },
      values: [0, false, null, null],
      toolCallId: task.toolCallId,
      toolName: task.toolName,
    },
  ]);
  const serverActivity = messages.find((message) => message.role === 'activity');
  assert.equal(serverActivity?.role, 'activity');
  if (serverActivity?.role !== 'activity') assert.fail('Server activity is missing.');
  assert.deepEqual(
    serverActivity.content,
    activity.content,
    'Server and HTTP client must retain the same progress.',
  );
  assert(
    Object.hasOwn(output.output.payload.metadata, 'optional'),
    'Do not mutate workflow output.',
  );
});
