# Shared AI integration

- [Public API](#public-api)
- [Providers](#providers)
- [Checks](#checks)

## Public API

The public entry provides the AG-UI/CopilotKit helpers, chat and shared browser voice service. The `config` secondary entry contains plain TypeScript feature flags that the Mastra server can also import. Application keys stay on the server.

## Providers

CopilotKit and its agent-store factory are scoped to the AUI route group; services that inject them must use that injector. See `apps/shell/src/app/aui/aui.config.ts` and the feature route providers.

## Checks

Run the voice lifecycle checks with `npx ng test ai-integration --watch=false`.
