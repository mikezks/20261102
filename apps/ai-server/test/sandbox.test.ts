import assert from 'node:assert/strict';
import test from 'node:test';
import { runSandbox, SandboxTimeoutError } from '../src/mastra/utils/sandbox';

test('isolates globals and transfers asynchronous host data', async () => {
  let result: unknown;
  await runSandbox(
    `
    const flights = await loadFlights('Graz', 'Hamburg');
    submit({ count: flights.length, process: typeof process, fetch: typeof fetch, require: typeof require });
  `,
    {
      functions: {
        loadFlights: async (...args) => {
          assert.deepEqual(args, ['Graz', 'Hamburg']);
          return [{ id: 1 }, { id: 2 }];
        },
        submit: (value) => {
          result = value;
        },
      },
    },
  );
  assert.deepEqual(result, {
    count: 2,
    process: 'undefined',
    fetch: 'undefined',
    require: 'undefined',
  });
});

test('rejects module imports and interrupts a CPU loop', async () => {
  await assert.rejects(runSandbox('import fs from "node:fs";'), /Import is not allowed/);
  await assert.rejects(
    runSandbox('while (true) {}', { timeoutMs: 20, hardTimeoutMs: 100 }),
    /interrupted/,
  );
});

test('disposes pending host calls after a timeout and can run again', async () => {
  let complete: (value: number) => void = () => undefined;
  await assert.rejects(
    runSandbox('await waitForHost();', {
      hardTimeoutMs: 10,
      functions: {
        waitForHost: () =>
          new Promise<number>((resolve) => {
            complete = resolve;
          }),
      },
    }),
    SandboxTimeoutError,
  );
  complete(1);
  await new Promise((resolve) => setImmediate(resolve));
  let result: unknown;
  await runSandbox('submit(42)', {
    functions: {
      submit: (value) => {
        result = value;
      },
    },
  });
  assert.equal(result, 42);
});

test('propagates rejected host calls without returning a success result', async () => {
  await assert.rejects(
    runSandbox('await lookup()', {
      functions: {
        lookup: async () => {
          throw new Error('Flight backend returned 503');
        },
      },
    }),
    /503/,
  );
});
