import process from 'node:process';
import { fileURLToPath } from 'node:url';

if (!process.env.OPENAI_API_KEY && process.env.CUSTOM_OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.CUSTOM_OPENAI_API_KEY;
}
process.env.NODE_USE_ENV_PROXY ??= '1';

const cli = new URL('../node_modules/mastra/dist/index.js', import.meta.url);
const args = process.argv.slice(2);
process.chdir(fileURLToPath(new URL('../demos/ai-demo/', import.meta.url)));
process.argv = [process.execPath, fileURLToPath(cli), 'dev', '--dir', 'server', ...args];
await import(cli.href);
