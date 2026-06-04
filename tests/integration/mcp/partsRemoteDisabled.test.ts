import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findPartTool } from '../../../src/agent/mcp/tools/findPart';
import { fetchPartTool } from '../../../src/agent/mcp/tools/fetchPart';

describe('parts.fetch.remote-disabled — coverage across tools', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('find_part with source:remote returns parts.fetch.remote-disabled', async () => {
    const r = await findPartTool({ query: 'x', source: 'remote' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected error');
    expect(r.errorCode).toBe('parts.fetch.remote-disabled');
  });

  it('fetch_part with non-bundled id returns parts.fetch.remote-disabled', async () => {
    const r = await fetchPartTool({ id: 'totally-fake-part-id' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected error');
    expect(r.errorCode).toBe('parts.fetch.remote-disabled');
  });
});
