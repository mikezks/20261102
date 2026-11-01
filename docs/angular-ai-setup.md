# Angular AI tooling

## Contents

- [Workspace and versions](#workspace-and-versions)
- [Pinned official skills](#pinned-official-skills)
- [Set up a Cloud session](#set-up-a-cloud-session)
- [MCP access](#mcp-access)
- [Persistent development sessions](#persistent-development-sessions)
- [Verification](#verification)
- [Host setup and limitations](#host-setup-and-limitations)

## Workspace and versions

This is an Angular CLI workspace with `angular.json`, application `shell` in
`apps/shell`, and seven libraries in `libs/`. Existing targets are discovered through
MCP before use. No extra application is needed for this integration.

Workspace toolchain:

| Component               | Installed and locked version        |
| ----------------------- | ----------------------------------- |
| Node (`.nvmrc`)         | 24.19.0                             |
| npm (`packageManager`)  | 11.9.0                              |
| Angular framework       | 22.2.4                              |
| Angular CLI             | 22.2.5                              |
| Existing MCP client SDK | `@modelcontextprotocol/sdk` 1.32.2  |
| Package manager / lock  | npm / `package-lock.json`, format 3 |

The setup retains the dependency versions and lockfile. The SDK was already a
direct dependency. MCP tools belong to the Angular CLI; no separate tool packages,
global CLI installation, Angular upgrade or dependency overrides are required.

## Pinned official skills

Source: [angular/skills](https://github.com/angular/skills), commit
[`2a2b801eb9bf3304424ddedfa1ace347e1fff6a6`](https://github.com/angular/skills/tree/2a2b801eb9bf3304424ddedfa1ace347e1fff6a6).

- [angular-developer](../.agents/skills/angular-developer/SKILL.md): use for Angular
  development and tooling; load relevant references as needed.
- [angular-new-app](../.agents/skills/angular-new-app/SKILL.md): load and apply only
  when a new application is actually requested, before scaffolding.
- [Source manifest and SHA-256 checksums](../.agents/skills/angular-skills.lock.json):
  45 original skill/reference files, plus the original `BUILD_INFO` and license.
- [MIT license](../.agents/skills/angular-source/LICENSE): the skills declare MIT in
  their original front matter. The skills repository has no standalone license
  file; this unmodified copy comes from Angular source commit
  `fdb4517612cf191da3c3e2df251f9f79f026448b`, recorded in upstream `BUILD_INFO`.

All supplied references are retained byte-for-byte. Checksums are integrity
checks against the committed manifest, not a cryptographic signature. Updates
require a deliberate upstream review and manifest update; setup never fetches
`latest` or overwrites edited skill files.

Check whether the current host has discovered these skills. If it has not, read
`angular-developer/SKILL.md` and the references relevant to the task explicitly.
Use `cli.md` and `mcp.md` for tooling, and `testing-fundamentals.md` for tests.
Installation alone does not mean an agent has loaded a skill. Apply `angular-new-app`
only when creating a new application.

The skills describe current Angular practices. Apply them to the installed version
and existing architecture. The verification command compares the MCP best-practices
response with `node_modules/@angular/core/resources/best-practices.md` from the
installed framework.

## Set up a Cloud session

From the repository root containing these files:

```bash
node --version
npm --version
npm run setup:angular-ai
```

For an environment setup hook, including a writable npm-cache default:

```bash
bash tools/angular-ai/cloud-setup.sh
```

The hook resolves the checkout from its own location. It does not clone a
repository, switch branches, reset files, install Node or update Angular.

`setup:angular-ai` verifies pinned skills and runtime versions, compares manifest
dependencies with the lockfile, and checks the installed dependency tree. A valid
installation is reused. If dependencies are absent or invalid, it uses
`npm ci --no-audit --no-fund` internally to restore the **existing lockfile** without
changing package versions. This setup-specific frozen installation avoids a new
dependency resolution; it is not an extra workshop installation step. Modified
skills or mismatched manifests stop setup with an error and remain untouched.

Finally the command creates a real MCP stdio connection, initializes the local
CLI, lists its tools, calls `list_projects`, and retrieves `get_best_practices`.
It does not start the application or require an OpenAI key. A second run repeats
verification while reusing the installation.

## MCP access

Official documentation: [Angular CLI MCP server](https://angular.dev/ai/mcp).

The actual server is the CLI already installed from the lockfile:

```bash
node node_modules/@angular/cli/bin/ng.js mcp
```

It speaks MCP over stdio to a client. Running it manually in an interactive terminal
may display integration instructions; that is not proof of an MCP connection.

### Script-based access

When the host does not expose native Angular MCP tools or dynamic MCP registration,
use the existing official MCP SDK through
[`tools/angular-ai/mcp.mjs`](../tools/angular-ai/mcp.mjs):

```bash
# Actual initialize handshake and tools/list, including input/output schemas:
npm run mcp:angular -- catalog

# A read-only tool call through MCP:
npm run mcp:angular -- call list_projects '{}'

# Complete integration check: discovery, guide, production build, dev server, cleanup:
npm run check:angular-ai

# Real persistent-client EOF and SIGTERM cleanup tests:
npm run test:angular-ai
```

The SDK sends `initialize`, `notifications/initialized`, `tools/list` and
`tools/call`. A `roots/list` handler identifies this workspace. These are actual MCP
exchanges; the npm commands merely launch the client. The launcher
[`server.mjs`](../tools/angular-ai/server.mjs) starts the local CLI from the correct
workspace and isolates its process group for cleanup on Linux/POSIX.

CLI 22.2.5 tool catalogue:

| Tool                        | Relevant inputs                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `list_projects`             | `{}`; returns workspaces with `path`, projects and targets                                                                     |
| `get_best_practices`        | `workspacePath`: absolute **angular.json file path** from `list_projects`                                                      |
| `run_target`                | `workspace`: absolute **directory** containing angular.json; `project`, required `target`, optional `configuration`, `options` |
| `devserver_start`           | workspace directory, project, optional port                                                                                    |
| `devserver_wait_for_build`  | same workspace/project, optional timeout in milliseconds                                                                       |
| `devserver_stop`            | same workspace/project                                                                                                         |
| `search_documentation`      | required `query`, optional `version` and `includeTopContent`                                                                   |
| `ai_tutor`                  | `{}`                                                                                                                           |
| `onpush_zoneless_migration` | required `fileOrDirPath`                                                                                                       |

Always inspect the current catalogue before use. The guide tool's schema description
mentions a workspace directory ambiguously; its implementation and returned
`list_projects.path` use the **angular.json file**. The target/dev-server tools use
the **directory** instead. No tool named `modernize` was offered. Discovery of a
tool is not evidence that it has been called.

### Optional native host configuration

[`.codex/config.toml`](../.codex/config.toml) defines `angular-cli` for Codex hosts
that load trusted project configuration. Start that host in the repository root.
Its command uses the same local launcher, not an unpinned `npx` download.

Check whether the host loads this configuration, for example with
`codex mcp get angular-cli --json`, and inspect the active session's callable tools.
A configuration entry alone does not prove a native MCP connection. Supported hosts
may require project trust, registration and a new session. Verify initialization
and actual tool calls; otherwise use the script-based client.

## Persistent development sessions

Do not use separate `call` invocations to start, inspect and stop one server. The
CLI holds dev-server state in its MCP process. The client rejects these one-shot
dev-server commands and instead provides one persistent session:

```bash
node tools/angular-ai/mcp.mjs session
```

The first output line reports readiness and actual tool schemas. Then send one
JSON command per line, substituting the absolute checkout path discovered by
`list_projects`:

```json
{"id":1,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}
{"id":2,"method":"tools/call","params":{"name":"get_best_practices","arguments":{"workspacePath":"/absolute/checkout/angular.json"}}}
{"id":3,"method":"tools/call","params":{"name":"devserver_start","arguments":{"workspace":"/absolute/checkout","project":"shell"}}}
{"id":4,"method":"tools/call","params":{"name":"devserver_wait_for_build","arguments":{"workspace":"/absolute/checkout","project":"shell","timeout":180000}}}
{"id":5,"method":"tools/call","params":{"name":"devserver_stop","arguments":{"workspace":"/absolute/checkout","project":"shell"}}}
{"method":"quit"}
```

This outer JSON command format controls the reusable client; the SDK implements
the actual MCP protocol on its separate connection to the CLI. Keep stdin and the
terminal session alive between commands. With a shell execution tool, retain its
session ID and send later lines through that same terminal session.

The programmatic `connectAngular()` API also keeps one connection. Always call
`await session.close()` in `finally`. It stops tracked dev servers before closing
the transport. `quit`, EOF, SIGINT and SIGTERM also trigger cleanup in the command
client. The launcher provides a process-group fallback for interrupted or failed
CLI calls. It only targets processes it started.

`devserver_wait_for_build` proves compilation, not immediate HTTP readiness. The
verification command therefore polls the returned loopback address with a bounded
deadline. Stop returns after sending a signal; verification also waits until the
port is closed. Never terminate an unrelated server to free a requested port.

## Verification

`npm run check:angular-ai` writes the actual server information, schemas, tool
arguments and results to ignored `.angular/ai/verification.json`. It verifies:

1. MCP initialization and the currently offered tools.
2. `list_projects`: this workspace and its available build/serve targets.
3. `get_best_practices`: exact match to the installed framework's guide.
4. `run_target`: existing `shell:build:production` target succeeds.
5. Start, two build observations and HTTP 200 in the same session; explicit stop
   closes the port.
6. Restart in that session; `close()` stops the remaining server automatically.

Keep build warnings visible. Record the actual command results and distinguish MCP
tool calls from shell lint/syntax checks, HTTP requests and filesystem checksum
checks. This integration check does not exercise LLM calls, microphone quality,
browser accessibility, documentation search or migrations.

## Host setup and limitations

Select this repository in the environment, provision the Node/npm versions above,
and configure the setup hook for the actual checkout path:

```bash
bash /absolute/checkout/tools/angular-ai/cloud-setup.sh
```

The absolute path belongs to the environment settings, not the portable helper.
Run the hook on the machine that will host the agent. CI can validate it but cannot
provide this session's dependencies or MCP connection.

Keep inherited proxy and CA settings. Dependency installation needs the configured
npm registry; official documentation needs `angular.dev`; updating vendored skills
needs GitHub. These MCP build/discovery checks work locally after installation.
No secret values are logged or copied to configuration. No extra environment
variables belong in `.env` for this setup.

Saving an environment draft does not execute a setup hook, apply settings, publish
a snapshot, restart the host, or prove restoration in a fresh Cloud task. After
reviewing a saved hook, the environment owner must save/publish it as required by
the host. A new task must contain the tooling files. Re-run setup and check
native-tool/skill discovery after restoration.

The launcher uses process-group cleanup on Linux/POSIX. Validate process-tree
cleanup separately when using Windows. An uncatchable SIGKILL of the client/launcher
or destruction of the host cannot run JavaScript cleanup handlers; use the host's
task-process cleanup in that case.
