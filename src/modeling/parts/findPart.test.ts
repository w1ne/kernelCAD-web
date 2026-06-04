import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findPartHost } from './findPart';

describe('findPart orchestrator', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('returns bundled matches for a category filter', async () => {
    const r = await findPartHost('', { category: 'fastener', source: 'local' });
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results.every((x) => x.category === 'fastener')).toBe(true);
  });

  it('source: "remote" with no partsBaseUrl returns parts.fetch.remote-disabled', async () => {
    try {
      await findPartHost('M3', { source: 'remote' });
      throw new Error('expected findPartHost to throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('parts.fetch.remote-disabled');
    }
  });

  it('source: "auto" with no partsBaseUrl returns local-only without throwing', async () => {
    const r = await findPartHost('M3', { source: 'auto' });
    expect(r.remoteEnabled).toBe(false);
    expect(r.results.length).toBeGreaterThan(0);
  });
});
