// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

/**
 * MCP resource descriptor matching the hosted gateway shape
 * (`GET /api/v1/mcp/resources/list`). Slice C of the meaningful-onboarding
 * iteration. URI/mimeType match the MCP `resources/list` response schema so
 * the bridge can pass them through to the local stdio client unmodified.
 */
export interface McpResourceDescriptor {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

/** Resource body shape matching the hosted gateway's `resources/read` response. */
export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * List MCP resources advertised by the hosted gateway.
 *
 * Graceful 404 handling: the bridge can ship ahead of the server-side
 * resources endpoints landing. When `/api/v1/mcp/resources/list` returns
 * 404, we treat that as "this gateway has no resources surface yet" and
 * return an empty list — Claude Desktop will simply not advertise any
 * resources to the model. Throwing here would tear down the whole stdio
 * MCP session, which is worse.
 *
 * Non-404 errors (auth failure, 5xx) still throw so they surface to the
 * client/operator.
 */
export async function listCloudResources(options: CloudMcpOptions = {}): Promise<McpResourceDescriptor[]> {
  const { apiBaseUrl, token } = resolveCloudMcpOptions(options);
  const res = await fetch(`${apiBaseUrl}/api/v1/mcp/resources/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(await responseError(res));
  const payload = await res.json() as { resources?: McpResourceDescriptor[] };
  if (!Array.isArray(payload.resources)) throw new Error('Invalid cloud MCP resources response.');
  return payload.resources;
}

/**
 * Read a resource by URI from the hosted gateway. Returns the `contents`
 * array verbatim so it can be passed straight to the MCP SDK's
 * `ReadResourceResultSchema`.
 *
 * No 404 fallback here — if the caller asks for a specific URI, surfacing
 * the error is the right behavior (the local model just asked for
 * something the gateway doesn't have).
 */
export async function readCloudResource(
  uri: string,
  options: CloudMcpOptions = {},
): Promise<McpResourceContent[]> {
  const { apiBaseUrl, token } = resolveCloudMcpOptions(options);
  const res = await fetch(`${apiBaseUrl}/api/v1/mcp/resources/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uri }),
  });
  if (!res.ok) throw new Error(await responseError(res));
  const payload = await res.json() as { contents?: McpResourceContent[] };
  if (!Array.isArray(payload.contents)) throw new Error('Invalid cloud MCP resource-read response.');
  return payload.contents;
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
