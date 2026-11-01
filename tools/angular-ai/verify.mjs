import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { get } from 'node:http';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { connectAngular, workspaceRoot } from './mcp.mjs';

const report = {
  checkedAt: new Date().toISOString(),
  connection: 'script-based stdio MCP',
  calls: [],
};
const session = await connectAngular();
const addresses = [];
report.server = session.server;
report.tools = session.tools;
const onSignal = async () => {
  await session.close();
  process.exit(130);
};
process.once('SIGINT', onSignal);
process.once('SIGTERM', onSignal);

async function call(name, args = {}) {
  // Inspect the current catalogue rather than assuming a tool or argument exists.
  const schema = session.tools.find((tool) => tool.name === name)?.inputSchema;
  assert.ok(schema, `Tool not offered: ${name}`);
  for (const arg of Object.keys(args))
    assert.ok(schema.properties?.[arg], `${name} has no ${arg} input`);
  for (const arg of schema.required ?? []) assert.ok(arg in args, `Missing ${name}.${arg}`);
  const result = await session.call(name, args);
  report.calls.push({ name, arguments: args, result });
  return result;
}

async function listening(address) {
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

async function assertStopped(address) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (!(await listening(address))) return;
    await delay(100);
  }
  assert.fail(`Server still listening after cleanup: ${address}`);
}

async function requestHttp(address) {
  return new Promise((resolve, reject) => {
    // Direct loopback HTTP; the application backends and external APIs are not needed.
    const request = get(address, (response) => {
      response.resume();
      response.on('end', () => {
        if (response.statusCode === 200) resolve();
        else reject(new Error(`Dev server returned HTTP ${response.statusCode}`));
      });
    });
    request.on('error', reject);
    request.setTimeout(10000, () => request.destroy(new Error('Local HTTP request timed out')));
  });
}

async function assertHttp(address) {
  // The CLI can report a completed compilation before Vite starts listening.
  let lastError;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await requestHttp(address);
      return;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Dev server did not become HTTP-ready: ${String(lastError)}`);
}

try {
  const projects = (await call('list_projects')).structuredContent;
  assert.deepEqual(projects.parsingErrors, []);
  assert.deepEqual(projects.versioningErrors, []);
  const workspace = projects.workspaces.find(
    (item) => dirname(item.path) === workspaceRoot.slice(0, -1),
  );
  assert.ok(workspace, 'Workspace not discovered');
  const project = workspace.projects.find((item) => item.name === 'shell');
  assert.ok(project?.targets.includes('build') && project.targets.includes('serve'));
  const practices = await call('get_best_practices', { workspacePath: workspace.path });
  const coreRoot = join(workspaceRoot, 'node_modules/@angular/core');
  const core = JSON.parse(await readFile(join(coreRoot, 'package.json'), 'utf8'));
  const expected = await readFile(join(coreRoot, core.angular.bestPractices.path), 'utf8');
  assert.equal(practices.content.find((item) => item.type === 'text').text, expected);
  report.bestPractices = {
    angular: core.version,
    sha256: createHash('sha256').update(expected).digest('hex'),
  };
  const args = { workspace: dirname(workspace.path), project: project.name };
  console.log('MCP discovery and version-specific best practices passed; building shell.');
  const build = await call('run_target', { ...args, target: 'build', configuration: 'production' });
  assert.equal(build.structuredContent.status, 'success', JSON.stringify(build));
  console.log('MCP production build passed; starting dev server in the same session.');
  const start = (await call('devserver_start', args)).structuredContent;
  assert.ok(start.address);
  addresses.push(start.address);
  assert.equal(
    (await call('devserver_wait_for_build', { ...args, timeout: 180000 })).structuredContent.status,
    'success',
  );
  await assertHttp(start.address);
  // A second observation proves that the same MCP process retained the server.
  assert.equal((await call('devserver_wait_for_build', args)).structuredContent.status, 'success');
  await call('devserver_stop', args);
  await assertStopped(start.address);
  console.log(
    'MCP start, repeated observation, HTTP 200 and explicit stop passed; checking automatic cleanup.',
  );
  const restart = (await call('devserver_start', args)).structuredContent;
  assert.ok(restart.address);
  addresses.push(restart.address);
  assert.equal((await call('devserver_wait_for_build', args)).structuredContent.status, 'success');
  await assertHttp(restart.address);
  // Deliberately omit devserver_stop: close() must stop the tracked server before disconnecting.
  await session.close();
  await assertStopped(restart.address);
  report.result = 'passed';
  report.lifecycle = {
    repeatedObservation: true,
    httpStatus: 200,
    explicitStop: true,
    automaticClose: true,
  };
} catch (error) {
  report.result = 'failed';
  report.error = error.message || String(error);
  process.exitCode = 1;
} finally {
  try {
    await session.close();
    for (const address of addresses) await assertStopped(address);
  } catch (error) {
    report.result = 'failed';
    report.cleanupError = error.message;
    process.exitCode = 1;
  }
  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);
  const output = join(workspaceRoot, '.angular/ai/verification.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      result: report.result,
      error: report.error,
      cleanupError: report.cleanupError,
      report: output,
    }),
  );
}
