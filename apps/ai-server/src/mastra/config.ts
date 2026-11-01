import { createOpenAI } from '@ai-sdk/openai';
import type { MastraModelConfig } from '@mastra/core/llm';

const openai = createOpenAI({
  apiKey: process.env['CUSTOM_OPENAI_API_KEY'] || process.env['OPENAI_API_KEY'],
});

export const model: MastraModelConfig = openai.responses(process.env['OPENAI_MODEL'] || 'gpt-6-luna');
export const modelAdvancedTasks: MastraModelConfig = openai.responses(
  process.env['OPENAI_ADVANCED_MODEL'] || process.env['OPENAI_MODEL'] || 'gpt-6-luna',
);
// Responses supports reasoning together with function tools.
export const defaultOptions = { providerOptions: { openai: { reasoningEffort: 'medium' } } };
