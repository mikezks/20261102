# Flight App

- [Run locally](#run-locally)
- [Live coding demos](#live-coding-demos)
- [Checks](#checks)
- [Configuration](#configuration)

Angular application with flight booking, reporting, an AI assistant, A2UI widgets, MCP hotel apps, travel planning, document check-in and browser speech support.

## Run locally

Use the Node version in `.nvmrc` and the npm version declared in `package.json`.

Install dependencies during the initial setup. Repeat this only when dependencies change:

```bash
npm i
```

If `.env` does not exist yet, create it from the example:

```bash
cp .env.example .env
```

Put only `CUSTOM_OPENAI_API_KEY=your-key` in the ignored `.env` file. Model names and service URLs are configured separately in `app.env`. An injected environment secret also works without a `.env` file. Never put API keys in Angular source or client configuration.

The AI server uses OpenAI Responses with reasoning set to `medium`. Travel Refinement and Plan Finalizer use `high`. Choose models that support the requested reasoning levels together with function tools; document check-in also requires image input.

Start the application and both servers:

```bash
npm run start:aui
```

The application runs on port 4200, the AI server on 3001, and the MCP server on 3002. Alternatively, start them with `npm start`, `npm run start:ai` and `npm run start:mcp` in separate terminals.

## Live coding demos

See [the demo commands](demos/README.md) for the Weather Agent's terminal and Angular
clients, AG-UI event examples, MCP Apps bridge and the standalone Voice API demo.
The Weather server uses the API key from the root `.env` file.

## Checks

Stop the AI development server before running `build:ai`; Mastra uses the same output directory for development and production builds.

```bash
npm run build
npm run check:ai
npm run build:ai
npm run build:mcp
npm run lint
npm test
npm run test:booking
npx ng test ai-integration --watch=false
npm run test:ai
```

## Configuration

Run `npm run check:openai` to check the configured models against Chat Completions with `none`/`medium` and Responses with `medium`. The command sends three small arithmetic requests per distinct configured model using the key from the environment or ignored `.env`. It prints HTTP statuses, fixed error classifications and whether the expected tool call succeeded; it never prints credentials or raw API error messages. Exit code 0 means Responses with `medium` succeeded for every configured model; 1 means that Responses check did not pass for every model; 2 means the key is missing. The check does not change the application's API or reasoning settings.

`angular.json` defines the Angular CLI projects. AI routes load lazily and the chat uses `@defer` in its template. The initial bundle has a 1 MB warning budget and a 2.6 MB error budget.

`proxy.conf.json` defines the local API routes. `proxy.conf.mjs` also respects `HTTPS_PROXY` for the external flight API when the development network requires an outbound proxy.

The servers use local demo bookings; no payment is processed. If the flight API supplies only a boolean delay flag, the AI demo maps a delayed flight to 15 illustrative minutes.
