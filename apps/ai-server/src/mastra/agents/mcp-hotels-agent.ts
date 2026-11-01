import { A2UIMiddleware } from '@ag-ui/a2ui-middleware';
import { MCPAppsMiddleware, type MCPClientConfig } from '@ag-ui/mcp-apps-middleware';
import { Agent } from '@mastra/core/agent';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { defaultOptions, model } from '../config.js';
import { agUiRouteConfig } from '../routes/ag-ui-route-config.js';

const HOTELS_MCP_SERVER: MCPClientConfig = {
  type: 'http',
  url: 'http://127.0.0.1:3002/mcp',
  serverId: 'hotels',
};

// A separate agent keeps the MCP Apps and hotel-delegation labs usable together.
export const mcpHotelsAgent = new Agent({
  id: 'mcpHotelsAgent',
  name: 'MCP Hotels Assistant',
  tools: { findBookedFlightsTool },
  instructions:
    'For booked flight questions, use findBookedFlightsTool and present its results with flightWidget if available. Never invent booked flights. Find hotels in the requested city with the hotels MCP tool. Its interactive app displays the results. Do not invent hotels or claim to make reservations.',
  model,
  defaultOptions,
});

agUiRouteConfig[mcpHotelsAgent.id] = {
  middlewares: [
    new MCPAppsMiddleware({ mcpServers: [HOTELS_MCP_SERVER] }),
    new A2UIMiddleware({ a2uiToolNames: [] }),
  ],
};
