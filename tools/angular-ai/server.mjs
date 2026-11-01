// stdio only: stdout belongs to MCP. Keep the CLI and its workers in one owned group.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const grouped = process.platform !== 'win32';
const child = spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'mcp'], {
  cwd: root,
  detached: grouped,
  stdio: 'inherit',
  env: { ...process.env, NG_CLI_ANALYTICS: 'false', FORCE_COLOR: '0' },
});

function terminate(signal) {
  if (!child.pid) return;
  try {
    if (grouped) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  terminate('SIGTERM');
  setTimeout(() => terminate('SIGKILL'), 1000).unref();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  // Also clean up workers left behind after an unexpected CLI exit.
  terminate('SIGKILL');
  process.exitCode = code ?? (signal ? 1 : 0);
});
