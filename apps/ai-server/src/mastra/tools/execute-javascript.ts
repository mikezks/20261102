import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { runSandbox } from '../utils/sandbox.js';
import { fetchFlights } from './search-flights.js';

const dataItemSchema = z.object({
  name: z.string(),
  value: z.number().finite(),
});

const dataItemsSchema = z.array(dataItemSchema);

export interface ExecuteJavaScriptResult {
  data: z.infer<typeof dataItemsSchema>;
  code: string;
  title: string;
}

export const executeJavaScriptTool = createTool({
  id: 'executeJavaScript',
  description: `
    Runs a snippet of JavaScript inside a hardened QuickJS sandbox to aggregate flight data into
    chart-ready \`{ name, value }\` pairs.

    The snippet is executed AS AN ES MODULE, so top-level \`await\` is supported. There is NO
    wrapping function — write straight-line statements; do NOT use \`return\`.

    TWO host functions are exposed:

      \`await loadFlights(from: string, to: string): Promise<Flight[]>\`
      \`submitResult(items: { name: string, value: number }[]): void\`

    where \`from\`/\`to\` are city names with the first letter uppercase (e.g. "Graz", "Hamburg")
    and each \`Flight\` has the shape \`{ id: number, from: string, to: string, date: string,
    delay: number }\` (date is ISO, delay is minutes).

    Workflow inside the snippet:
      1. Call \`await loadFlights(from, to)\` once for every connection the request needs.
      2. Aggregate the loaded arrays into the chart-ready \`{ name, value }[]\` shape.
      3. Call \`submitResult(items)\` EXACTLY ONCE with that array. The sandbox treats this as the
         final result.

    The sandbox has NO other host APIs: no \`fetch\`, no \`import\`, no \`require\`, no \`process\`,
    no \`console\`, no network beyond \`loadFlights\`. \`import\`/\`export\` statements are
    rejected. CPU execution is interrupted after 30 s, with a 45 s outer deadline. It is capped at 64 MB memory and
    1 MB stack.

    The tool returns \`{ data, code, title }\`; the client renders \`data\` as a chart titled
    \`title\` directly from this result.
  `,
  inputSchema: z.object({
    code: z.string().describe(
      `
          Module body. Use \`await loadFlights(from, to)\` to load flights for each connection,
          aggregate into \`{ name, value }[]\`, then call \`submitResult(items)\` exactly once.
        `,
    ),
    title: z.string().describe('Human-readable chart title.'),
  }),
  outputSchema: z.object({
    data: dataItemsSchema,
    code: z.string(),
    title: z.string(),
  }),
  execute: async ({ code, title }) => {
    let captured: z.infer<typeof dataItemsSchema> = [];

    const controller = new AbortController();
    let submitted = false;
    let loads = 0;
    try {
      await runSandbox(code, {
        functions: {
          loadFlights: (from: unknown, to: unknown) => {
            if (++loads > 20) throw new Error('At most 20 flight searches are allowed per report.');
            return fetchFlights(
              z.string().min(1).max(100).parse(from),
              z.string().min(1).max(100).parse(to),
              controller.signal,
            );
          },
          submitResult: (items: unknown) => {
            if (submitted) throw new Error('submitResult must be called exactly once.');
            captured = dataItemsSchema.max(200).parse(items);
            submitted = true;
          },
        },
      });
    } finally {
      controller.abort();
    }
    if (!submitted) throw new Error('The report did not submit a result.');
    return { data: captured, code, title };
  },
});
