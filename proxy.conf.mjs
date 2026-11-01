import { readFileSync } from 'node:fs';
import { HttpsProxyAgent } from 'https-proxy-agent';

const config = JSON.parse(readFileSync(new URL('./proxy.conf.json', import.meta.url), 'utf8'));
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;

// The development proxy must also work on networks that require HTTPS egress
// through a proxy. Local AI and MCP requests keep their direct loopback route.
if (proxyUrl) {
  config['/flight-api/**'].agent = new HttpsProxyAgent(proxyUrl);
}

export default config;
