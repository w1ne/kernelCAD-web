// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// review_cad on a single part returned ok: false with errorCode
// review.no-assembly, so a clean bracket "failed review". It now reports the
// part-level verdict (build, union guard, DFM) with the mechanism stages
// marked not applicable; a broken part still fails, and naming an assembly
// that does not exist is still an error.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

describe('review_cad on a single part', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('a clean part passes with the part-level verdict', async () => {
    const r = await reviewCadTool({ code: "return box(40, 20, 5).holes({ byNormal: 'Z' }, { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 4.5, depth: 'through' }).fillet(1, { parallel: 'Z' });" });
    expect(r.ok).toBe(true);
    expect('errorCode' in r).toBe(false);
    expect(r.assembly).toBe('part-only');
    expect(r.mechanism).toBe('unverified');
    expect(r.fitness?.functional).toBe(true);
  }, 120000);

  it('a part that fails to build still fails the review', async () => {
    const r = await reviewCadTool({ code: 'return box(20, 20, 10).fillet(6);' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some((d) => d.code === 'feature.kernel-failed')).toBe(true);
  }, 120000);

  it('asking for an assembly the script does not have is still review.no-assembly', async () => {
    const r = await reviewCadTool({ code: 'return box(10, 10, 10);', assembly: 'arm' });
    expect(r.ok).toBe(false);
    expect((r as { errorCode?: string }).errorCode).toBe('review.no-assembly');
  }, 120000);
});
