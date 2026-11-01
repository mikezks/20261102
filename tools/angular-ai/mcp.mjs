import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
const emit = (value) => console.log(JSON.stringify(value));

/** A real SDK MCP session; one CLI process owns all of its development servers. */
export async function connectAngular() {
  const client = new Client(
    { name: 'workspace-angular-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: false } } },
  );
  client.setRequestHandler(ListRootsRequestSchema, () => ({
    roots: [{ uri: pathToFileURL(workspaceRoot).href, name: 'Angular workspace' }],
  }));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./server.mjs', import.meta.url))],
    cwd: workspaceRoot,
    env: { ...process.env },
    stderr: 'pipe',
  });
  transport.stderr.on('data', (data) => process.stderr.write(data));
  const activeServers = new Map();
  let closing;
  let tools;
  const key = (args) => JSON.stringify([args.workspace, args.project]);

  async function close() {
    closing ??= (async () => {
      const failures = [];
      for (const args of activeServers.values()) {
        try {
          const result = await client.callTool(
            { name: 'devserver_stop', arguments: args },
            undefined,
            { timeout: 10000 },
          );
          if (result.isError) throw new Error(JSON.stringify(result.content));
        } catch (error) {
          failures.push(error.message);
        }
      }
      activeServers.clear();
      // The transport's launcher also terminates its owned process group on exit.
      await client.close();
      if (failures.length)
        throw new Error(`MCP stop failed; launcher cleanup used: ${failures.join('; ')}`);
    })();
    return closing;
  }

  try {
    // SDK performs initialize + notifications/initialized over stdio.
    await client.connect(transport);
    tools = [];
    let cursor;
    do {
      const page = await client.listTools(cursor ? { cursor } : {});
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
  } catch (error) {
    await client.close();
    throw error;
  }

  return {
    server: client.getServerVersion(),
    instructions: client.getInstructions(),
    capabilities: client.getServerCapabilities(),
    tools,
    close,
    async call(name, args = {}, timeout = 300000) {
      if (closing) throw new Error('Session is closing.');
      const tool = tools.find((entry) => entry.name === name);
      if (!tool) throw new Error(`Tool not offered by this CLI: ${name}`);
      // Explicit keys avoid default-project ambiguity and make cleanup deterministic.
      if (name.startsWith('devserver_')) {
        if (!args.workspace || !args.project) {
          throw new Error('Dev-server calls require explicit workspace (directory) and project.');
        }
        args = { ...args, workspace: resolve(args.workspace) };
      }
      if (name === 'devserver_start') {
        // Track before the request, including a start interrupted by a timeout.
        activeServers.set(key(args), { workspace: args.workspace, project: args.project });
      }
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout });
      if (result.isError) throw new Error(`${name}: ${JSON.stringify(result.content)}`);
      if (name === 'devserver_stop') activeServers.delete(key(args));
      return result;
    },
  };
}

async function main() {
  const [mode = 'catalog', name, rawArgs = '{}'] = process.argv.slice(2);
  if (!['catalog', 'call', 'session'].includes(mode)) {
    throw new Error('Usage: mcp.mjs catalog | call TOOL JSON | session');
  }
  if (mode === 'call' && (!name || name.startsWith('devserver_'))) {
    throw new Error(
      'Use session for devserver_start, devserver_wait_for_build and devserver_stop.',
    );
  }
  const session = await connectAngular();
  const stop = async (signal) => {
    try {
      await session.close();
    } catch (error) {
      console.error(error.message);
    }
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  const onInt = () => void stop('SIGINT');
  const onTerm = () => void stop('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  try {
    if (mode === 'catalog') {
      emit({ server: session.server, capabilities: session.capabilities, tools: session.tools });
    } else if (mode === 'call') {
      if (name !== 'list_projects') await session.call('list_projects');
      const result = await session.call(name, JSON.parse(rawArgs));
      emit(result);
      if (['failure', 'timeout', 'unknown'].includes(result.structuredContent?.status))
        process.exitCode = 1;
    } else {
      emit({ ready: true, server: session.server, tools: session.tools });
      // One JSON command per line. EOF/quit closes this SAME connection and its servers.
      const input = createInterface({ input: process.stdin, terminal: false });
      try {
        for await (const line of input) {
          if (!line.trim()) continue;
          let command;
          try {
            command = JSON.parse(line);
            if (command.method === 'quit') break;
            if (command.method === 'tools/list') emit({ id: command.id, tools: session.tools });
            else if (command.method === 'tools/call') {
              const result = await session.call(command.params.name, command.params.arguments);
              emit({ id: command.id, result });
              if (['failure', 'timeout', 'unknown'].includes(result.structuredContent?.status))
                process.exitCode = 1;
            } else throw new Error('Expected tools/list, tools/call or quit.');
          } catch (error) {
            emit({ id: command?.id, error: error.message });
            process.exitCode = 1;
          }
        }
      } finally {
        input.close();
      }
    }
  } finally {
    await session.close();
    process.off('SIGINT', onInt);
    process.off('SIGTERM', onTerm);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
