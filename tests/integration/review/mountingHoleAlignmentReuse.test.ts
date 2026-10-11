// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The mounting-hole alignment gate lowered every fastened part again
// (`part.originalShape.lower()`), a full extra recompute per evaluate: on the
// gt2-shop-release-actuator cookbook that was 77 more booleans (243 → 324
// builds, ~100 s → ~124 s). The validator now hands it the part shapes from
// the joint-axis gate's single scene lowering. Same findings, no re-lower.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { validateMountingHoleAlignment } from '../../../src/modeling/mates/mountingHoleAlignment';

describe('mounting-hole alignment reuses lowered part shapes', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('gives the same misalignment finding without lowering any part again', async () => {
    const code = readFileSync('tests/fixtures/verdictCorpus/bad-03-misaligned-holes.kcad.ts', 'utf8');
    const m = await buildModel({ fileName: 'bad-03.kcad.ts', code });
    const arm = [...m.session.assemblies.values()][0] as Assembly;
    const scene = m.tailShape;
    expect(isSceneBackend(scene)).toBe(true);
    const local = new Map((scene as { parts: Array<{ name: string; shape: unknown }> }).parts
      .map((p) => [p.name, p.shape as OcctBackend] as const));

    const fresh = await validateMountingHoleAlignment(arm);
    expect(fresh.map((d) => d.code)).toContain('assembly.mounting-hole.misaligned');

    const spies = arm.__parts().map((p) => vi.spyOn(p.originalShape, 'lower'));
    const reused = await validateMountingHoleAlignment(arm, undefined, local);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    expect(reused).toEqual(fresh);
  }, 180_000);
});
