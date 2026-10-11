// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A base + lid enclosure with no mates is a set of independent bodies (a
// print layout) — the skill calls it "valid as-is" and mechanism-truth's
// orphan-part rule short-circuits zero-mate assemblies to real. review_cad
// and verify still emitted assembly.part.floating for both parts while the
// same response said geometry.floatingParts: []. Zero-mate assemblies no
// longer get floating warnings; a loose part in a MATED assembly still does.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';

const BASE_LID = `
const base = box(60, 40, 20).shell(2, { face: 'top' });
const lid = box(60, 40, 2).translate(0, 0, 20);
const arm = assembly('case');
arm.part('base', base, { material: 'abs' });
arm.part('lid', lid, { material: 'abs' });
return arm.model();
`;

const MATED_PLUS_LOOSE = `
const arm = assembly('rig');
arm.part('a', box(10, 10, 10)).connector('c', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
arm.part('b', box(10, 10, 10)).connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.part('loose', box(10, 10, 10), { at: [40, 0, 0] });
arm.mate('ab', 'a.c', 'b.c', 'fastened');
return arm.model();
`;

const floatingOf = (diags: readonly { code: string; partName?: string }[]) =>
  diags.filter((d) => d.code === 'assembly.part.floating').map((d) => d.partName);

describe('floating-part policy for zero-mate assemblies', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('review_cad: an unmated base + lid has no floating warnings and passes', async () => {
    const r = await reviewCadTool({ code: BASE_LID });
    expect(floatingOf(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 180000);

  it('verify (assembly): an unmated base + lid has no floating warnings', async () => {
    const r = await verifyTool({ code: BASE_LID, check: 'assembly' }) as { ok: boolean; diagnostics: { code: string; partName?: string }[] };
    expect(floatingOf(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 180000);

  it('review_cad: a loose part in a mated assembly is still flagged', async () => {
    const r = await reviewCadTool({ code: MATED_PLUS_LOOSE, includePoseEnvelope: false });
    expect(floatingOf(r.diagnostics)).toEqual(['loose']);
    expect(r.diagnostics.find((d) => d.code === 'assembly.part.floating')?.severity).toBe('warning');
  }, 180000);
});
