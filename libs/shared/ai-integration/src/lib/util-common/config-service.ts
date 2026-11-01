import { Service } from '@angular/core';

/** Public endpoints only. API keys stay in the AI server's .env file. */
@Service()
export class ConfigService {
  readonly baseUrl = '/flight-api';
  readonly aiServerUrl = '/ai';
  readonly mcpServerUrl = '/mcp';
  get agUiUrl(): string {
    return this.agUiUrlFor('ticketingAgent');
  }
  agUiUrlFor(agentId: string): string {
    return new URL(`${this.aiServerUrl}/ag-ui/${encodeURIComponent(agentId)}`, location.origin)
      .href;
  }
}
