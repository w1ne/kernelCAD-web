import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchStats } from './stats';

beforeEach(() => {
  process.env.KERNELCAD_ADMIN_TOKEN = 'tok';
  process.env.KERNELCAD_API_BASE = 'https://api.example.test';
});
afterEach(() => { delete process.env.KERNELCAD_ADMIN_TOKEN; delete process.env.KERNELCAD_API_BASE; vi.restoreAllMocks(); });

describe('fetchStats', () => {
  it('GETs the admin endpoint with the bearer token and returns parsed JSON', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ windowDays: 7, toolDistribution: [{ tool: 'extrude', calls: 3 }] }), { status: 200 }),
    );
    const data = await fetchStats(7);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/api/v1/admin/telemetry?days=7');
    expect((init.headers as Record<string,string>).Authorization).toBe('Bearer tok');
    expect(data.toolDistribution[0].tool).toBe('extrude');
  });

  it('throws a clear error when KERNELCAD_ADMIN_TOKEN is missing', async () => {
    delete process.env.KERNELCAD_ADMIN_TOKEN;
    await expect(fetchStats(7)).rejects.toThrow(/KERNELCAD_ADMIN_TOKEN/);
  });
});
