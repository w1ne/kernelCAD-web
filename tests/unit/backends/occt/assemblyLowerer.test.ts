import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { createApi } from '../../../../src/modeling/api';
import { isSceneBackend, type SceneBackend } from '../../../../src/kernel/backends/sceneBackend';
import { Transform } from '../../../../src/runtime/se3';

describe('OCCT assembly lowerer', () => {
  beforeAll(async () => { await initOcct(); });

  it('keeps assembly part and joint records executable as geometry passthroughs', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link arm');
    const base = arm.part('base', kcad.box(20, 20, 6), { at: [0, 0, 0] });
    const link = arm.part('link', kcad.box(80, 10, 6), { at: [30, 0, 6] });
    const shoulder = arm.revolute('shoulder', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 6],
      limitsDeg: [-90, 90],
    });

    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());

    expect(result.diagnostics).toEqual([]);
    expect(result.shapes.get(base.id)).toBeDefined();
    expect(result.shapes.get(link.id)).toBeDefined();
    expect(result.shapes.get(shoulder.id)).toBeDefined();
    expect(result.shapes.get(link.id)?.boundingBox().min[0]).toBeGreaterThan(20);
  });

  it('lowers assembly.model() to a SceneBackend with one entry per placed part', async () => {
    // Per Task 14: assembly.model() lowers to a SceneBackend (multi-body),
    // not a single boolean-fused Shape. Per-part identity is preserved so
    // downstream consumers can color, filter, or compound without a fuse.
    // The legacy "one fused exportable shape" semantics live behind an
    // explicit Scene.toUnion() / Scene.toCompound() — see
    // sceneToCompoundUnion.test.ts.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const assembly = kcad.assembly('static assembly');
    assembly.part('left', kcad.box(10, 10, 10), { at: [0, 0, 0] });
    assembly.part('right', kcad.box(10, 10, 10), { at: [30, 0, 0] });
    assembly.model();

    const records = session.getRecords();
    const modelRecord = records.at(-1)!;
    expect(modelRecord.kind).toBe('assemblyModel');

    const result = await new RecomputeEngine(new OcctLowerer()).run(records);

    expect(result.diagnostics).toEqual([]);
    const lowered = result.shapes.get(modelRecord.id);
    expect(lowered).toBeDefined();
    expect(isSceneBackend(lowered)).toBe(true);
    const scene = lowered as unknown as SceneBackend;
    expect(scene.assemblyName).toBe('static assembly');
    expect(scene.parts.length).toBe(2);
    expect(scene.parts.map(p => p.name)).toEqual(['left', 'right']);
    // model() is the kinematic-zero view: per-part worldTransform is identity
    // (the `at:` placement is already baked into each part's local shape).
    for (const p of scene.parts) {
      expect(p.worldTransform).toBeInstanceOf(Transform);
    }
    // Each part lowers to its own OcctBackend with non-empty geometry.
    const left = scene.parts[0].shape as OcctBackend;
    expect(left).toBeInstanceOf(OcctBackend);
    expect(left.volume()).toBeGreaterThan(900);
    const right = scene.parts[1].shape as OcctBackend;
    expect(right).toBeInstanceOf(OcctBackend);
    expect(right.volume()).toBeGreaterThan(900);
    // Per-part bbox reflects each part's own local frame (with `at:` baked in
    // upstream). The 'right' part's local shape was authored at +X = 30.
    const rightBb = right.boundingBox();
    expect(rightBb.min[0]).toBeGreaterThan(20);
    expect(rightBb.max[0]).toBeGreaterThan(30);
  });

  it('lowers connector-placed parts as SceneBackend parts at the computed fixed placement', async () => {
    // Per Task 14: connector-driven placement bakes into each part's local
    // shape (via the `at:` translate during capture). The lowerer emits one
    // SceneBackend part per assembly.part(...); we assert the structural
    // properties and the per-part bbox extents instead of a unioned bbox.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const assembly = kcad.assembly('connector assembly');
    const base = assembly.part('base', kcad.box(20, 20, 8), {
      at: [0, 0, 0],
      connectors: { mount: { origin: [10, 0, 8] } },
    });
    assembly.part('link', kcad.box(60, 8, 6), {
      connectors: { root: { origin: [-30, 0, 0] } },
      connect: { connector: 'root', to: base.connector('mount') },
    });
    assembly.model();

    const records = session.getRecords();
    const modelRecord = records.at(-1)!;
    expect(modelRecord.kind).toBe('assemblyModel');

    const result = await new RecomputeEngine(new OcctLowerer()).run(records);

    expect(result.diagnostics).toEqual([]);
    const lowered = result.shapes.get(modelRecord.id);
    expect(lowered).toBeDefined();
    expect(isSceneBackend(lowered)).toBe(true);
    const scene = lowered as unknown as SceneBackend;
    expect(scene.assemblyName).toBe('connector assembly');
    expect(scene.parts.map(p => p.name)).toEqual(['base', 'link']);

    // Per-part bbox span: the 'link' part is placed via connector so its local
    // shape carries the computed translation. The combined assembly extent
    // (legacy bbox) is exercised by sceneToCompoundUnion / sceneAssemblyModel.
    const baseShape = scene.parts[0].shape as OcctBackend;
    const baseBb = baseShape.boundingBox();
    expect(baseBb.min[0]).toBeCloseTo(0, 5);
    expect(baseBb.max[0]).toBeCloseTo(20, 5);

    const linkShape = scene.parts[1].shape as OcctBackend;
    const linkBb = linkShape.boundingBox();
    // link's right edge sits at base.mount.origin.x (10) + link.length/2 from
    // the connector — full extent reaches +X = 100 in world.
    expect(linkBb.max[0]).toBeCloseTo(100, 5);
    // link is 6mm tall, placed atop base (z = 8), so top reaches z = 14.
    expect(linkBb.max[2]).toBeCloseTo(14, 5);
  });
});
