import assert from 'node:assert/strict';
import test from 'node:test';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// This test worker uses an in-process HTTP fixture and no real credential.
process.env['CUSTOM_OPENAI_API_KEY'] = 'test-key';

interface ModelRequest {
  model: string;
  reasoning?: { effort?: string };
  stream?: boolean;
  input: { type?: string; call_id?: string; output?: string }[];
  text?: { format?: { type?: string } };
}

function modelResponse(body: ModelRequest, toolCall: boolean, text = '42') {
  const item = toolCall
    ? {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_1',
        name: 'add',
        arguments: '{"a":17,"b":25}',
        status: 'completed',
      }
    : {
        type: 'message',
        id: 'msg_1',
        role: 'assistant',
        status: 'completed',
        content: [{ type: 'output_text', text, annotations: [] }],
      };
  const response = {
    id: toolCall ? 'resp_tool' : 'resp_text',
    object: 'response',
    created_at: 1,
    model: body.model,
    status: 'completed',
    output: [item],
    error: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
  if (!body.stream) return Response.json(response);
  const events = [
    { type: 'response.created', response },
    {
      type: 'response.output_item.added',
      output_index: 0,
      item: toolCall ? { ...item, arguments: '' } : item,
    },
    toolCall
      ? {
          type: 'response.function_call_arguments.delta',
          item_id: item.id,
          output_index: 0,
          delta: item.arguments,
        }
      : { type: 'response.output_text.delta', item_id: item.id, output_index: 0, delta: text },
    { type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response },
  ];
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

for (const mode of ['generate', 'stream'] as const) {
  test(`completes a ${mode} tool round trip with medium reasoning via Responses`, async (t) => {
    const requests: ModelRequest[] = [];
    t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(String(url), 'https://api.openai.com/v1/responses');
      const body = JSON.parse(String(init?.body)) as ModelRequest;
      requests.push(body);
      assert.equal(body.reasoning?.effort, 'medium');
      assert.equal(Boolean(body.stream), mode === 'stream');
      assert.ok(requests.length <= 2);
      return modelResponse(body, requests.length === 1);
    });
    let executions = 0;
    const { model, defaultOptions } = await import('../src/mastra/config');
    const agent = new Agent({
      id: `responses-${mode}`,
      name: 'Arithmetic assistant',
      instructions: 'Use the add tool.',
      model,
      defaultOptions,
      tools: {
        add: createTool({
          id: 'add',
          description: 'Add two integers.',
          inputSchema: z.object({ a: z.number(), b: z.number() }),
          outputSchema: z.object({ result: z.number() }),
          execute: async ({ a, b }) => {
            executions++;
            return { result: a + b };
          },
        }),
      },
    });
    const output = await agent[mode]('Add 17 and 25.', { maxSteps: 2 });
    assert.equal(await output.text, '42');
    assert.equal(executions, 1);
    assert.equal(requests.length, 2);
    const result = requests[1].input.find((item) => item.type === 'function_call_output');
    assert.equal(result?.call_id, 'call_1');
    assert.deepEqual(JSON.parse(result?.output ?? 'null'), { result: 42 });
  });
}

test('finalizes a structured plan with high reasoning via Responses', async (t) => {
  const plan = { summary: 'Demo plan', flights: [], hotels: [] };
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body)) as ModelRequest;
    requests++;
    assert.equal(body.reasoning?.effort, 'high');
    assert.equal(body.text?.format?.type, 'json_schema');
    return modelResponse(body, false, JSON.stringify(plan));
  });
  const { planFinalizerAgent } = await import('../src/mastra/workflows/plan-finalizer-agent');
  const { finalPlanSchema } = await import('../src/mastra/workflows/schemas');
  const output = await planFinalizerAgent.generate('Summarize the supplied empty plan.', {
    structuredOutput: { schema: finalPlanSchema },
  });
  assert.deepEqual(output.object, plan);
  assert.equal(requests, 1);
});
