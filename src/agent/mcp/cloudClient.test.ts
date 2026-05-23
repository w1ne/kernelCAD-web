import { afterEach, describe, expect, it, vi } from 'vitest';
import { callCloudTool, listCloudTools, resolveCloudMcpOptions } from './cloudClient';

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
