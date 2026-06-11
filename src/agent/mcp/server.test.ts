// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Bridge wiring for MCP `resources/*` — Slice C of the meaningful-onboarding
 * iteration (2026-05-24).
 *
 * The `kernelcad mcp --cloud` bridge proxies tools/* to the hosted
 * `/api/v1/mcp/...` gateway. Slice C extends the same pattern to resources/*:
 * the local stdio MCP client (Claude Desktop) lists and reads resources
 * through the bridge, the bridge calls the hosted gateway, the response is
 * returned as a normal MCP result.
 *
 * These tests verify the bridge advertises the `resources` capability ONLY
 * in cloud mode (local-only mode doesn't have resources to advertise) and
 * that the resources/list and resources/read handlers proxy to the cloud
 * client we tested in cloudClient.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

vi.mock('./cloudClient', () => ({
  listCloudTools: vi.fn().mockResolvedValue([]),
  callCloudTool: vi.fn().mockResolvedValue({ ok: true }),
  listCloudResources: vi.fn().mockResolvedValue([
    {
      uri: 'kernelcad://skills/authoring',
      name: 'kernelcad-authoring',
      mimeType: 'text/markdown',
      description: 'Authoring guide for kernelCAD .kcad.ts',
    },
  ]),
  readCloudResource: vi.fn().mockResolvedValue([
    {
      uri: 'kernelcad://skills/authoring',
      mimeType: 'text/markdown',
      text: '# kernelcad-authoring\n\nstub body',
    },
  ]),
  resolveCloudMcpOptions: vi.fn().mockReturnValue({
    apiBaseUrl: 'https://api.test',
    token: 'kc_test',
  }),
}));

import { createMcpServer } from './server';
import * as cloud from './cloudClient';

afterEach(() => {
  vi.clearAllMocks();
});

describe('createMcpServer — cloud bridge resources surface', () => {
  it('advertises the `resources` capability in cloud mode', () => {
    const server = createMcpServer({ cloud: true, cloudOptions: { apiBaseUrl: 'https://api.test', token: 'kc_test' } });
    // The MCP SDK exposes the announced capabilities via the
    // `getServerCapabilities()` helper. The local Server.capabilities is a
    // read-only snapshot, so reach in to verify the shape.
    const capabilities = (server as any)._capabilities ?? (server as any).options?.capabilities;
    expect(capabilities).toBeDefined();
    expect(capabilities.tools).toBeDefined();
    expect(capabilities.resources).toBeDefined();
  });

  it('does NOT advertise resources in local-only mode', () => {
    const server = createMcpServer({ cloud: false });
    const capabilities = (server as any)._capabilities ?? (server as any).options?.capabilities;
    expect(capabilities).toBeDefined();
    expect(capabilities.resources).toBeUndefined();
  });

  it('proxies resources/list to listCloudResources in cloud mode', async () => {
    const server = createMcpServer({ cloud: true, cloudOptions: { apiBaseUrl: 'https://api.test', token: 'kc_test' } });
    // Access the registered handler — the SDK keeps them on `_requestHandlers`.
    const handlers = (server as any)._requestHandlers as Map<string, (req: unknown) => Promise<unknown>>;
    const handler = handlers.get(ListResourcesRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const result = (await handler!({
      method: 'resources/list',
      params: {},
    })) as { resources: { uri: string }[] };

    expect(cloud.listCloudResources).toHaveBeenCalledOnce();
    expect(result.resources[0]?.uri).toBe('kernelcad://skills/authoring');
  });

  it('proxies resources/read to readCloudResource in cloud mode', async () => {
    const server = createMcpServer({ cloud: true, cloudOptions: { apiBaseUrl: 'https://api.test', token: 'kc_test' } });
    const handlers = (server as any)._requestHandlers as Map<string, (req: unknown) => Promise<unknown>>;
    const handler = handlers.get(ReadResourceRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const result = (await handler!({
      method: 'resources/read',
      params: { uri: 'kernelcad://skills/authoring' },
    })) as { contents: { uri: string; text: string }[] };

    expect(cloud.readCloudResource).toHaveBeenCalledWith(
      'kernelcad://skills/authoring',
      expect.any(Object),
    );
    expect(result.contents[0]?.text).toContain('kernelcad-authoring');
  });

  it('does NOT register resources handlers in local-only mode', () => {
    const server = createMcpServer({ cloud: false });
    const handlers = (server as any)._requestHandlers as Map<string, unknown>;
    expect(handlers.has(ListResourcesRequestSchema.shape.method.value)).toBe(false);
    expect(handlers.has(ReadResourceRequestSchema.shape.method.value)).toBe(false);
  });
});
