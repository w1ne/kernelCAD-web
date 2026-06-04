import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchPartTool } from '../../../src/agent/mcp/tools/fetchPart';

describe('fetch_part — end-to-end against bundled catalog', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('resolves bearing-608 to a record + non-empty cache path', async () => {
    const r = await fetchPartTool({ id: 'bearing-608' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.record.id).toBe('bearing-608');
    expect(r.cachePath).toMatch(/bearing-608\.step$/);
    expect(r.sha256.length).toBe(64);
  });
});
