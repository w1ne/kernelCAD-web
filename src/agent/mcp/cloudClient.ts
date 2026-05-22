import type { McpToolDefinition } from './toolRegistry';

export interface CloudMcpOptions {
  apiBaseUrl?: string;
  token?: string;
}

const DEFAULT_API_BASE_URL = 'https://api.kernelcad.com';

export function resolveCloudMcpOptions(options: CloudMcpOptions = {}): Required<CloudMcpOptions> {
  const apiBaseUrl = (options.apiBaseUrl ?? process.env.KERNELCAD_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  const token = options.token ?? process.env.KERNELCAD_API_TOKEN ?? '';
  if (!token) throw new Error('Missing MCP token. Set KERNELCAD_API_TOKEN or pass --token.');
  return { apiBaseUrl, token };
}

export async function listCloudTools(options: CloudMcpOptions = {}): Promise<McpToolDefinition[]> {
  const { apiBaseUrl, token } = resolveCloudMcpOptions(options);
  const res = await fetch(`${apiBaseUrl}/api/v1/mcp/tools`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await responseError(res));
  const payload = await res.json() as { tools?: McpToolDefinition[] };
  if (!Array.isArray(payload.tools)) throw new Error('Invalid cloud MCP tools response.');
  return payload.tools;
}

export async function callCloudTool(
  name: string,
  args: Record<string, unknown>,
  options: CloudMcpOptions = {},
): Promise<unknown> {
  const { apiBaseUrl, token } = resolveCloudMcpOptions(options);
  const res = await fetch(`${apiBaseUrl}/api/v1/mcp/call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, arguments: args }),
  });
  if (!res.ok) throw new Error(await responseError(res));
  const payload = await res.json() as { result?: unknown };
  return payload.result;
}

async function responseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}
