import process from 'node:process';

const apiKey = process.env.CUSTOM_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey?.trim()) {
  console.error('Set CUSTOM_OPENAI_API_KEY in the ignored .env file or process environment.');
  process.exit(2);
}

const models = [...new Set([
  process.env.OPENAI_MODEL || 'gpt-6-luna',
  process.env.OPENAI_ADVANCED_MODEL || process.env.OPENAI_MODEL || 'gpt-6-luna',
])];
const instruction = 'Compute 17 + 25 and call report_result with the result.';
const probeFunction = {
  name: 'report_result',
  description: 'Return the result of a harmless arithmetic check.',
  strict: true,
  parameters: {
    type: 'object',
    properties: { result: { type: 'integer' } },
    required: ['result'],
    additionalProperties: false,
  },
};

function correctToolCall(data, api) {
  const calls = api === 'responses'
    ? data.output?.filter((item) => item.type === 'function_call')
    : data.choices?.[0]?.message?.tool_calls?.map((item) => item.function);
  if (calls?.length !== 1 || calls[0]?.name !== probeFunction.name) return false;
  try {
    return JSON.parse(calls[0].arguments).result === 42;
  } catch {
    return false;
  }
}

async function probe(model, api, effort) {
  const result = { model, api, effort, httpStatus: null, correctToolCall: false };
  const body = api === 'responses'
    ? {
        model,
        input: instruction,
        reasoning: { effort },
        tools: [{ type: 'function', ...probeFunction }],
        tool_choice: { type: 'function', name: probeFunction.name },
        max_output_tokens: 1500,
        store: false,
      }
    : {
        model,
        messages: [{ role: 'user', content: instruction }],
        reasoning_effort: effort,
        tools: [{ type: 'function', function: probeFunction }],
        tool_choice: { type: 'function', function: { name: probeFunction.name } },
        max_completion_tokens: 1500,
      };

  let response;
  try {
    response = await fetch(`https://api.openai.com/v1/${api}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ...result, error: 'network_or_timeout' };
  }
  result.httpStatus = response.status;

  let data;
  try {
    data = await response.json();
  } catch {
    return { ...result, error: 'invalid_json_response' };
  }

  if (!response.ok) {
    // API error messages can echo credentials. Emit only fixed classifications.
    const error = response.status === 401 ? 'authentication_failed'
      : response.status === 403 ? 'permission_denied'
      : response.status === 429 ? 'rate_limited'
      : response.status === 400 && data?.error?.param === 'reasoning_effort'
        ? 'reasoning_configuration_rejected'
        : 'http_error';
    return { ...result, error };
  }

  try {
    result.correctToolCall = correctToolCall(data, api);
  } catch {
    return { ...result, error: 'unexpected_response' };
  }
  const reasoningTokens = data.usage?.output_tokens_details?.reasoning_tokens
    ?? data.usage?.completion_tokens_details?.reasoning_tokens;
  return {
    ...result,
    reasoningTokens: Number.isFinite(reasoningTokens) ? reasoningTokens : null,
    error: result.correctToolCall ? null : 'unexpected_tool_result',
  };
}

const results = await Promise.all(models.flatMap((model) => [
  probe(model, 'chat/completions', 'none'),
  probe(model, 'chat/completions', 'medium'),
  probe(model, 'responses', 'medium'),
]));
const responsesWithReasoningReady = results
  .filter((result) => result.api === 'responses')
  .every((result) => result.correctToolCall);
console.log(JSON.stringify({ results, responsesWithReasoningReady }, null, 2));
process.exitCode = responsesWithReasoningReady ? 0 : 1;
