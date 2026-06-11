// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findPartTool } from './findPart';

describe('find_part MCP tool', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    delete process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('returns bundled-only results when partsBaseUrl is unset', async () => {
    const r = await findPartTool({ query: 'M3 screw', limit: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    expect(r.remoteEnabled).toBe(false);
    expect(r.results.length).toBeGreaterThan(0);
  });

  it('source: "remote" with no partsBaseUrl returns parts.fetch.remote-disabled', async () => {
    const r = await findPartTool({ query: 'M3', source: 'remote' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected error');
    expect(r.errorCode).toBe('parts.fetch.remote-disabled');
  });

  it('requires id or query', async () => {
    const r = await findPartTool({});
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected error');
    expect(r.errorCode).toBe('parts.input.id-or-query-required');
  });
});
