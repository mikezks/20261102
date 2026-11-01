import { Component, inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';
import { flightWidget } from '../ui-ai/flight-widget';
import { ChatRegistry, ConfigService, initAgentStore } from '@flight-demo/shared/ai-integration';

@Component({
  selector: 'app-mcp-hotels',
  template: `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">MCP Hotels</h2>
      </div>
      <div class="card-body">
        <p>
          Ask the assistant for hotels in a city. The hotel server returns an interactive widget that
          can refresh its own data through the MCP Apps bridge.
        </p>
        <button class="btn btn-primary" (click)="open()">Open hotel assistant</button>
      </div>
    </section>
  `,
})
export class McpHotels {
  private readonly registry = inject(ChatRegistry);
  constructor() {
    const agentId = 'mcpHotelsAgent';
    initAgentStore({
      agentId,
      url: inject(ConfigService).agUiUrlFor(agentId),
      components: [flightWidget],
    });
    this.registry.setChat({
      store: injectAgentStore(agentId),
      showModeSelector: false,
      greeting: 'Which city would you like hotel suggestions for?',
    });
  }
  protected open(): void {
    this.registry.requestOpen();
  }
}
