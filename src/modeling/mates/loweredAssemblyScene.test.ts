// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../composition/buildModel';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { Assembly } from '../capture/assembly';
import { reposedLoweredAssemblyScene } from './loweredAssemblyScene';
import { solveMates } from './solver';

// `link` carries an `at:` that is part of its placed frame; mate FK then
// moves that placed frame. Re-posing a lowered scene must keep the `at:`.
const CODE = `
  const arm = assembly('two-link');
  const base = arm.part('base', box(20, 20, 6), { at: [0, 0, 0] });
  const link = arm.part('link', box(80, 10, 6), { at: [30, 0, 6] });
  base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 6] }, axis: [0, 0, 1] });
  link.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.mate('shoulder', 'base.shoulder', 'link.shoulder', 'revolute', { limitsDeg: [-90, 90] });
  return arm.solvedModel({ shoulder: 30 });
`;

describe('reposedLoweredAssemblyScene', () => {
  beforeAll(async () => { await initOcct(); });

  it('re-posing at the lowered pose reproduces the lowered world transforms', async () => {
    const model = await buildModel({ code: CODE, fileName: 'repose.kcad.ts' });
    const scene = model.rootShape;
    if (!isSceneBackend(scene)) throw new Error('expected a scene');
    const arm = model.session.assemblies.get('two-link') as Assembly;
    const solved = await solveMates(arm, { shoulder: 30 });

    const reposed = reposedLoweredAssemblyScene(arm, scene, solved.poses);
    if (reposed === undefined) throw new Error('re-pose refused');
    for (let i = 0; i < scene.parts.length; i++) {
      const want = scene.parts[i].worldTransform.point([1, 2, 3]);
      const got = reposed.parts[i].worldTransform.point([1, 2, 3]);
      for (let k = 0; k < 3; k++) expect(got[k], `${scene.parts[i].name}[${k}]`).toBeCloseTo(want[k], 6);
    }
  }, 120_000);
});
