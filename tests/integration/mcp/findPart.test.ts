import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findPartTool } from '../../../src/agent/mcp/tools/findPart';

describe('find_part — end-to-end against bundled catalog', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('returns deterministic results for an M3 screw query', async () => {
    const r = await findPartTool({ query: 'M3 screw' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results.every((p) => p.tags.some((t) => /M3/.test(t)))).toBe(true);
  });

  it('filters by family', async () => {
    const r = await findPartTool({
      query: '',
      family: 'deep-groove-ball-bearing',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(
      r.results.every((p) => p.family === 'deep-groove-ball-bearing'),
    ).toBe(true);
  });
});
