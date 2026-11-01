# Live coding demos

- [Weather: server and clients](#weather-server-and-clients)
- [AG-UI events](#ag-ui-events)
- [A2UI Passenger Card](#a2ui-passenger-card)
- [MCP Apps](#mcp-apps)
- [Voice API demo](#voice-api-demo)
- [Integrated servers](#integrated-servers)
- [Feature flags](#feature-flags)
- [Source files](#source-files)

## Weather: server and clients

Use the API key from the ignored `.env` file in the repository root:

```dotenv
CUSTOM_OPENAI_API_KEY=your-key
```

No exported key variable is required. The server command loads the root `app.env`
and `.env` before starting Mastra. It supplies the custom key as `OPENAI_API_KEY`
to the demo SDK; an explicitly configured `OPENAI_API_KEY` takes precedence.
Keep all other settings in `app.env`. Do not put a key in either client.

Start the server, then a client in a separate terminal:

```bash
npm run ai-demo-server
```

```bash
npm run ai-demo-client
```

Use `npm run ai-demo-client:details` to display the AG-UI events. The terminal
client accepts weather questions and `exit` to quit.

For the Angular chat interface instead:

```bash
npm run simple-client
```

Open <http://localhost:4300>. Both clients connect to the same Weather Agent at
`http://localhost:4555/chat`. The demo generates sample weather values, cached
per city; its natural-language conversation uses the model.

The original agent explicitly selects `gpt-5.6-luna`. The Flight App's
`OPENAI_MODEL` setting does not change that selection. The API key must have
access to that model. A running server or HTTP 200 stream alone does not prove
that a model request succeeded; check for a completed answer or `RUN_ERROR`.

Mastra's generated files stay in `demos/ai-demo/.mastra/`, separate from the
Flight App server. The launcher passes the proxy setting to child Node processes
when the environment requires an HTTP proxy.

## AG-UI events

These examples run in the terminal without a server or API key:

```bash
npm run ag-ui-simple:client
npm run ag-ui-simple:client-tools
```

The first shows a simulated agent's event sequence. The second demonstrates
executing a client-side tool and returning its result to the agent.

## A2UI Passenger Card

```bash
npm run a2ui-demo
```

Open <http://localhost:4301>. This standalone Angular demo renders a passenger
card from A2UI messages, including data bindings, an action and a custom
`MilesProgress` component. **Increase Miles** adds 300 miles to the surface's
data model; both the passenger card and progress indicator update.

The demo uses the existing CopilotKit A2UI renderer. It runs entirely in the
browser, without an AI server, an LLM or an API key.

Build it with `npm run a2ui-demo:build`.

## MCP Apps

```bash
npm run mcp-apps-demo
```

Vite opens `/host.html`, normally at <http://localhost:5173/host.html>. The host
sends sample hotel data to an iframe through the MCP Apps bridge. This demo
does not need the hotel MCP server or an API key.

Build it with `npm run mcp-apps-demo:build`.

The original `vite.config.ts` currently produces a Vite warning about ESM syntax
in a CommonJS package and the future native config loader. The default loader
still builds and serves the demo. Keep that warning visible when using the
unchanged configuration.

## Voice API demo

```bash
npm run voice-demo
```

Open the URL printed by Vite, normally <http://localhost:5173>. This separate
browser app uses speech recognition and synthesis directly. It does not need an
AI server, an API key or a `.env` file. Keep secrets out of browser code.

The original language list depends on the voices available in the browser and
operating system. If German is missing, install or enable a German reading voice;
voice discovery may finish asynchronously. Speech recognition normally requires
Chrome or Edge, microphone permission and localhost or HTTPS. The browser may use
an online recognition service.

The integrated Flight App page at <http://localhost:4200/voice> and chat voice
controls are available from `voice-starter` onward. Start that app with `npm start`.

## Integrated servers

The AI server remains in `apps/ai-server`; the hotel MCP server remains in
`apps/mcp-server`. The original script names are available alongside the existing
Flight App commands:

| Command | Purpose |
| --- | --- |
| `npm run ai-server` / `npm run agent` | AI development server |
| `npm run ai-server:build` / `npm run agent:build` | AI production build |
| `npm run ai-server:start` / `npm run agent:start` | Start the built AI server |
| `npm run mcp-server` | Watch the hotel widget and MCP server |
| `npm run mcp-server:app:build` | Build the hotel widget |
| `npm run mcp-server:app:watch` | Watch the hotel widget |
| `npm run mcp-server:start` | Build the widget and start the MCP server |

The integrated Voice page and ticketing chat share `VoiceService`. Voice uses
browser speech APIs, not an LLM API key. Recognition, voices and microphone
permission depend on the browser and operating system; Chrome or Edge is
recommended. Stop an existing server before starting another command for its port.

## Feature flags

Shared flags are in `libs/shared/ai-integration/config/feature-flags.ts`:

| Flag | Purpose |
| --- | --- |
| `USE_ACTION_CARDS` | Register booking and cancellation action cards |
| `USE_APPROVAL` | Suspend booking/cancellation tools for user approval |
| `ADD_BASIC_CATALOG` | Include the basic A2UI component catalog in the prompt |
| `DISPLAY_PROMPT` | Log the assembled A2UI prompt |
| `DISPLAY_DSL` | Log the dashboard specification |
| `USE_GUARDRAILS` | Enable the ticketing agent's input processors |

These are source-level constants shared by client and server. Their values can
vary by exercise stage. They are independent of API-key configuration.

## Source files

The files in `ag-ui-simple/`, `ai-demo/`, `mcp-apps-demo/`, `simple-client/` and `voice-demo/`
are preserved byte for byte from `angular-architects/flights42`, branch
`AGU-ag-ui-starter`, commit `0e459deb0279073318b0f2766deddbba656984e1`.
[source-manifest.json](source-manifest.json) records the original paths and SHA-256
checksums. Start commands and Angular workspace paths are configured at the
repository root.

The `a2ui-demo/` sources come from `projects/a2ui-demo` in the same repository,
branch `AGU-a2ui-solution`, commit `b8f37069e9c71a5f3280f3837dbabb97977c9326`.
Its renderer integration and CSS selectors use CopilotKit; the A2UI messages,
passenger data and mileage calculations are preserved. The manifest records
original checksums and checksums for adapted files separately.
