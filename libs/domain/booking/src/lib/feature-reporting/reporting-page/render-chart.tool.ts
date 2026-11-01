import { Component, computed, effect, inject, input } from '@angular/core';
import type { AngularToolCall, ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod/v3';

import { createRenderToolCall } from '@flight-demo/shared/ai-integration';
import { ReportingChartStore } from './reporting-chart-store';

const executeJavaScriptArgsSchema = z.object({ code: z.string(), title: z.string() });
const renderChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ name: z.string(), value: z.number().finite() })).max(200),
});
type ExecuteJavaScriptArgs = z.infer<typeof executeJavaScriptArgsSchema>;

export function parseResult(result: string | undefined): z.infer<typeof renderChartSchema> | null {
  if (!result) return null;
  try {
    const parsed = renderChartSchema.safeParse(JSON.parse(result));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

@Component({ selector: 'app-render-chart', template: '' })
export class RenderChart implements ToolRenderer<ExecuteJavaScriptArgs> {
  readonly toolCall = input.required<AngularToolCall<ExecuteJavaScriptArgs>>();
  private readonly result = computed(() => this.toolCall().result);
  constructor() {
    const store = inject(ReportingChartStore);
    effect(() => {
      const chart = parseResult(this.result());
      if (chart) store.setChart(chart.title, chart.data);
    });
  }
}

export const renderChartToolCall = createRenderToolCall({
  name: 'executeJavaScript',
  args: executeJavaScriptArgsSchema,
  component: RenderChart,
});
