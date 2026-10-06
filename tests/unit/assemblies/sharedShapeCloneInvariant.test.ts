// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared part shapes must survive every consumer that places parts in the
// world: all of them must clone before applyTransform. Aliasing also shares
// the followers' SOURCE records, so `part.originalShape.lower()` returns one
// OCCT object for N parts — URDF, BOM and inspect walk exactly that path.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/composition/buildModel';
import { exportSceneToSTEPAsync, initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { urdfSerialize } from '../../../src/modeling/export/urdf/urdfSerializer';
import { computeBom } from '../../../src/agent/script-runtime/bom';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const CODE = `
  const arm = assembly('row');
  for (let i = 0; i < 4; i++) arm.part('r' + i, box(20, 10, 10).subtract(cylinder(20, 2).translate(10, 5, -5)), { at: [i * 15, 0, 0] });
  const scene = arm.model();
  scene.toCompound();
  return scene;
`;

function sceneOf(model: Awaited<ReturnType<typeof buildModel>>): SceneBackend {
  for (const r of model.records) {
    const s = model.shapes.get(r.id);
    if (r.kind === 'assemblyModel' && isSceneBackend(s)) return s;
  }
  throw new Error('no assemblyModel scene');
}

describe('shared part shapes are never mutated by consumers', () => {
  beforeAll(async () => { await initOcct(); });

  it('keeps the shared local bbox after world-frame walk, interference, STEP, URDF, BOM and compound export', async () => {
    const model = await buildModel({ code: CODE, fileName: 'row.kcad.ts' });
    const scene = sceneOf(model);
    const shared = scene.parts[0].shape as OcctBackend;
    expect(scene.parts[2].shape).toBe(shared);
    const before = shared.boundingBox({ exact: true });

    sceneToWorldFrameParts(scene);
    detectInterferences(scene, 1e-3, new Set());
    await exportSceneToSTEPAsync(scene);
    const arm = model.session.assemblies.get('row') as Assembly;
    const urdf = await urdfSerialize(arm, {});
    expect(urdf.urdf).toContain('<robot');
    const bom = await computeBom(arm, model.session);
    expect(bom.rows.reduce((n, r) => n + r.quantity, 0)).toBe(4);

    const after = shared.boundingBox({ exact: true });
    expect(after.min).toEqual(before.min);
    expect(after.max).toEqual(before.max);
    // A second world walk still places every copy at its own `at:`.
    const world = sceneToWorldFrameParts(scene).map((p) => p.shape.boundingBox({ exact: true }).min[0]);
    world.forEach((x, i) => expect(x).toBeCloseTo(i * 15, 6));
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  }, 120_000);

  it('inspect({ of: "assembly" }) reports every shared copy at its own placement', async () => {
    const out = await inspectAssemblyTool({ code: CODE });
    if (!out.ok) throw new Error(out.error);
    expect(out.parts.map((p) => p.name)).toEqual(['r0', 'r1', 'r2', 'r3']);
    const sizes = out.parts.map((p) => p.bbox.max[0] - p.bbox.min[0]);
    for (const s of sizes) expect(s).toBeCloseTo(20, 6);
    // Inspect again on the same process: shared handles were not destroyed.
    const again = await inspectAssemblyTool({ code: CODE });
    expect(again.ok).toBe(true);
  }, 120_000);
});
