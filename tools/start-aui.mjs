import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function bin(packageName, command) {
  const folder = resolve(root, 'node_modules', packageName);
  const metadata = JSON.parse(readFileSync(resolve(folder, 'package.json'), 'utf8'));
  return resolve(folder, typeof metadata.bin === 'string' ? metadata.bin : metadata.bin[command]);
}
function launch(args) {
  return spawn(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  });
}
const widgetBuild = launch([
  bin('vite', 'vite'),
  'build',
  '--config',
  'apps/mcp-server/vite.config.mts',
]);
const buildCode = await new Promise((resolve, reject) => {
  widgetBuild.once('error', reject);
  widgetBuild.once('exit', resolve);
});
if (buildCode !== 0) process.exit(buildCode ?? 1);

const children = [
  launch([bin('@angular/cli', 'ng'), 'serve', 'shell']),
  launch([
    '--env-file=app.env',
    '--env-file-if-exists=.env',
    bin('mastra', 'mastra'),
    'dev',
    '--dir',
    'apps/ai-server/src/mastra',
  ]),
  launch([
    '--env-file=app.env',
    '--env-file-if-exists=.env',
    '--import',
    'tsx',
    'apps/mcp-server/src/server.ts',
  ]),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
for (const child of children) {
  child.once('error', () => stop(1));
  child.once('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
