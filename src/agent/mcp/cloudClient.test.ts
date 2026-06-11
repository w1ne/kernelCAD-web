// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  callCloudTool,
  listCloudTools,
  listCloudResources,
  readCloudResource,
  resolveCloudMcpOptions,
} from './cloudClient';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.KERNELCAD_API_TOKEN;
  delete process.env.KERNELCAD_API_BASE_URL;
});

describe('cloud MCP client', () => {
  it('requires a token for cloud mode', () => {
    expect(() => resolveCloudMcpOptions()).toThrow(/KERNELCAD_API_TOKEN/);
  });

  it('lists tools from the hosted MCP gateway', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tools: [{ name: 'evaluate_script', description: 'eval', inputSchema: { type: 'object' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const tools = await listCloudTools({ apiBaseUrl: 'https://api.test/', token: 'kc_test' });

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/mcp/tools', {
      headers: { Authorization: 'Bearer kc_test' },
    });
    expect(tools[0]?.name).toBe('evaluate_script');
  });

  it('lists resources from the hosted MCP gateway', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resources: [
          {
            uri: 'kernelcad://skills/authoring',
            name: 'kernelcad-authoring',
            mimeType: 'text/markdown',
            description: 'Authoring guide for kernelCAD .kcad.ts',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const resources = await listCloudResources({ apiBaseUrl: 'https://api.test', token: 'kc_test' });

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/mcp/resources/list', {
      headers: { Authorization: 'Bearer kc_test' },
    });
    expect(resources[0]?.uri).toBe('kernelcad://skills/authoring');
    expect(resources[0]?.mimeType).toBe('text/markdown');
  });

  it('returns an empty list when the gateway has no resources surface yet (404)', async () => {
    // The bridge can ship before the server-side resources endpoints land.
    // Until then, a 404 from /resources/list must not break the MCP
    // connection — Claude Desktop tolerates an empty list, but a thrown
    // error tears the whole stdio session down. Same gate is used by the
    // server-side feature flag if we ever roll it out behind one.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'not found',
    });
    vi.stubGlobal('fetch', fetchMock);

    const resources = await listCloudResources({ apiBaseUrl: 'https://api.test', token: 'kc_test' });

    expect(resources).toEqual([]);
  });

  it('reads a resource body from the hosted MCP gateway', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contents: [
          {
            uri: 'kernelcad://skills/authoring',
            mimeType: 'text/markdown',
            text: '# kernelcad-authoring\n\nHello world.',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const contents = await readCloudResource('kernelcad://skills/authoring', {
      apiBaseUrl: 'https://api.test',
      token: 'kc_test',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/mcp/resources/read', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer kc_test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uri: 'kernelcad://skills/authoring' }),
    });
    expect(contents[0]?.text).toContain('kernelcad-authoring');
  });

  it('surfaces a non-404 error from resources/read so the client can show it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'kaboom',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      readCloudResource('kernelcad://skills/authoring', {
        apiBaseUrl: 'https://api.test',
        token: 'kc_test',
      }),
    ).rejects.toThrow(/kaboom/);
  });

  it('calls a hosted MCP tool', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callCloudTool('evaluate_script', { code: 'return box(1,1,1);' }, {
      apiBaseUrl: 'https://api.test',
      token: 'kc_test',
    })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/mcp/call', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer kc_test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'evaluate_script',
        arguments: { code: 'return box(1,1,1);' },
      }),
    });
  });
});
