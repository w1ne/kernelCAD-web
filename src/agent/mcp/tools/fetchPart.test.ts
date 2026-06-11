// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchPartTool } from './fetchPart';

describe('fetch_part MCP tool', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    // step.parts is the production default; disable the tier so the
    // remote-disabled path is exercised offline.
    process.env.KERNELCAD_PARTS_BASE_URL = 'off';
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('resolves a bundled id and returns the record + cache path', async () => {
    const r = await fetchPartTool({ id: 'iso-4762-m3x12' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    expect(r.record.id).toBe('iso-4762-m3x12');
    expect(r.source).toBe('local');
    expect(r.cachePath).toMatch(/iso-4762-m3x12\.step$/);
  });

  it('parts.fetch.remote-disabled for unknown id when the tier is disabled (off)', async () => {
    const r = await fetchPartTool({ id: 'made-up-id' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected error');
    expect(r.errorCode).toBe('parts.fetch.remote-disabled');
  });
});
