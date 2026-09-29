// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Dogfood friction: `feature.face-ref.ambiguous-after-split` after a union
// printed only a count ("split into 3 children"), so the agent guessed. The
// diagnostic now names every candidate (centre + normal) and a FaceQuery that
// picks it — and that selector must actually work when pasted back.

import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const UNION = 'box(40, 20, 10).union(box(10, 20, 30).translate(15, 0, 0))';

describe('ambiguous-after-split names its candidates', () => {
  beforeAll(async () => { await initOcct(); });

  it('lists each candidate face with centre, normal and selector', async () => {
    const m = await buildModel({
      fileName: 'ambiguous-top.kcad.ts',
      code: `return ${UNION}.fillet(1, { face: 'top' });`,
    });
    const d = m.diagnostics.find((x) => x.code === 'feature.face-ref.ambiguous-after-split');
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error'); // never auto-resolved: 'top' is lineage, not "highest face"
    expect(d!.message).toContain('split into 3 children');
    expect(d!.message).toContain("Candidates for 'top':");
    // Two coplanar halves of the base top + the tower top.
    expect(d!.message).toContain("centre (7.5, 10, 10), normal (0, 0, 1) → face: { byNormal: 'Z', atX: 7.5, atY: 10, atZ: 10 }");
    expect(d!.message).toContain("centre (32.5, 10, 10), normal (0, 0, 1)");
    expect(d!.message).toContain("centre (20, 10, 30), normal (0, 0, 1)");
    expect(d!.message).toContain('BEFORE the union/cut');
    expect(d!.hint).toContain("{ byNormal: 'Z', atX: 20, atY: 10, atZ: 30 }");
  });

  it('a printed candidate selector resolves when pasted back', async () => {
    const m = await buildModel({
      fileName: 'picked-top.kcad.ts',
      code: `return ${UNION}.fillet(1, { face: { byNormal: 'Z', atX: 20, atY: 10, atZ: 30 } });`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // The tower top's four edges are rounded: less volume than the sharp union.
    const sharp = await buildModel({ fileName: 'sharp.kcad.ts', code: `return ${UNION};` });
    expect(m.tailShape!.volume()).toBeLessThan(sharp.tailShape!.volume() - 1);
  });
});
