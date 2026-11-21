// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A `<feature>.<ref>` face selector whose ref the feature never created must
// fail with `feature.face-ref.not-resolvable`. The snapshot fallback used to
// take the first face of the named feature, so `fillet`, `chamfer` and
// `shell` silently ran on an unrelated face of the pocket and returned a
// valid but wrong solid with no diagnostic.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: CompilerDiagnostic[] }> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors };
}

// 40 × 30 × 20 box with a 12 × 8 × 5 pocket in the top: created refs are
// `pocket.floor` and `pocket.wall`.
const POCKET = `box(40, 30, 20).cutout(path().moveTo(-6, -4).lineTo(6, -4).lineTo(6, 4).lineTo(-6, 4).close(), { face: 'top', depth: 5, name: 'pocket' })`;
const POCKET_VOLUME = 40 * 30 * 20 - 12 * 8 * 5;

describe('created-ref selector with an unknown ref', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  for (const op of [`fillet(1, { face: 'pocket.nosuch' })`, `chamfer(1, { face: 'pocket.nosuch' })`, `shell(1, { face: 'pocket.nosuch' })`]) {
    it(`${op.split('(')[0]} refuses it and names the real refs`, async () => {
      const { solid, errors } = await lower(`return ${POCKET}.${op};`);
      expect(errors.map((d) => d.code)).toEqual(['feature.face-ref.not-resolvable']);
      // Boolean, not toBeUndefined(): a failure must not pretty-print the
      // WASM-backed shape.
      expect(solid === undefined).toBe(true);
      expect(errors[0].message).toContain('pocket.nosuch');
      expect(errors[0].hint).toContain('floor, wall');
    });
  }

  it('real refs still resolve: a floor fillet adds material only at the concave floor edges', async () => {
    const { solid, errors } = await lower(`return ${POCKET}.fillet(1, { face: 'pocket.floor' });`);
    expect(errors).toEqual([]);
    expect(isValidShape(getOC(), solid!.getReplicadShape().wrapped)).toBe(true);
    // Four concave 1 mm edges along the 12 × 8 floor rim: added area (1 − π/4)
    // per unit length, minus the corner overlap; well under 40 · 0.2146.
    const added = solid!.volume() - POCKET_VOLUME;
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThan(40 * (1 - Math.PI / 4));
  });

  it('a shell that opens the pocket floor still works', async () => {
    const { solid, errors } = await lower(`return ${POCKET}.shell(1, { face: 'pocket.floor' });`);
    expect(errors).toEqual([]);
    expect(isValidShape(getOC(), solid!.getReplicadShape().wrapped)).toBe(true);
    expect(solid!.volume()).toBeLessThan(POCKET_VOLUME / 2);
  });
});
