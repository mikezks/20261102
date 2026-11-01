import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { connect } from 'node:net';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { workspaceRoot } from './mcp.mjs';

function portOpen(address) {
  const url = new URL(address);
  return new Promise((resolve) => {
    const socket = connect({ host: url.hostname, port: Number(url.port) });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

for (const ending of ['EOF', 'SIGTERM']) {
  test(
    `persistent session cleans up its dev server on ${ending}`,
    { timeout: 90000 },
    async (context) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL('./mcp.mjs', import.meta.url)), 'session'],
        {
          cwd: workspaceRoot,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        },
      );
      const exited = once(child, 'exit');
      const abort = () => child.kill('SIGTERM');
      context.signal.addEventListener('abort', abort, { once: true });
      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data;
      });
      const reader = createInterface({ input: child.stdout });
      const messages = reader[Symbol.asyncIterator]();
      const receive = async () => {
        const message = await messages.next();
        assert.equal(message.done, false, `Client ended unexpectedly: ${stderr}`);
        return JSON.parse(message.value);
      };
      let address;
      try {
        const ready = await receive();
        assert.equal(ready.ready, true);
        assert.ok(ready.tools.find((tool) => tool.name === 'devserver_start'));
        const call = async (name, args = {}) => {
          child.stdin.write(
            JSON.stringify({ method: 'tools/call', params: { name, arguments: args } }) + '\n',
          );
          const response = await receive();
          assert.equal(response.error, undefined);
          return response.result;
        };
        const projects = await call('list_projects');
        const path = projects.structuredContent.workspaces[0].path;
        await call('get_best_practices', { workspacePath: path });
        const args = { workspace: workspaceRoot, project: 'shell' };
        address = (await call('devserver_start', args)).structuredContent.address;
        assert.ok(address);
        assert.equal(
          (await call('devserver_wait_for_build', args)).structuredContent.status,
          'success',
        );
        for (let attempt = 0; attempt < 40 && !(await portOpen(address)); attempt++)
          await delay(250);
        assert.equal(
          await portOpen(address),
          true,
          'Server must be listening before the cleanup test',
        );
        if (ending === 'EOF') child.stdin.end();
        else child.kill('SIGTERM');
        const [code] = await exited;
        assert.equal(code, ending === 'EOF' ? 0 : 143, stderr);
        for (let attempt = 0; attempt < 40 && (await portOpen(address)); attempt++)
          await delay(100);
        assert.equal(await portOpen(address), false, `Leaked dev server: ${address}`);
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await exited;
        reader.close();
        context.signal.removeEventListener('abort', abort);
        if (address) assert.equal(await portOpen(address), false, `Cleanup failed: ${address}`);
      }
    },
  );
}
