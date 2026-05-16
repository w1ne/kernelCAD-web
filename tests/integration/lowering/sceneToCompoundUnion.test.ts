// tests/integration/lowering/sceneToCompoundUnion.test.ts
//
// Integration coverage for `Scene.toCompound()` and `Scene.toUnion()` —
// the export-time hatch that lowers a multi-body Scene back into a single
// `Shape` for downstream chaining (fillet / exportSTEP / exportSTL).
//
// Both methods record a new `assemblyExport` FeatureKind whose
// `inputs.scene` references the upstream `solvedAssembly` /
// `assemblyModel` feature. The lowerer reads the SceneBackend, applies
// each part's worldTransform, and either:
//   - 'compound': groups the transformed parts into a TopoDS_Compound via
//     replicad.makeCompound (lossless on per-part identity).
//   - 'union'   : boolean-fuses them (lossy on color, name, metadata).
//
// Tests:
//   - toCompound() lowers to a TopoDS_Compound (volume = sum of parts;
//     compound does not fuse), preserves boundingBox(), and chains.
//   - toUnion() lowers to a single fused solid (volume <= sum if parts
//     overlap; equal if disjoint), and chains via .fillet().
//   - hand-constructed Scene with no exportFn throws a clear KernelError.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import { Scene } from '../../../src/intent/scene';
import { Transform } from '../../../src/runtime/se3';
import { KernelError } from '../../../src/intent/kernelError';
import { buildModel, updateModelParams } from '../../../src/kernel/buildModel';
import type { Shape } from '../../../src/shared/capture/proxy';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

interface LowerResult {
  shape: OcctBackend | undefined;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id) as OcctBackend | undefined,
    diagnostics: r.diagnostics,
  };
}

describe('Scene.toCompound + Scene.toUnion', () => {
  beforeAll(async () => { await initOcct(); });

  it('toCompound() returns a Shape that lowers to a TopoDS_Compound (lossless on per-part identity)', async () => {
    // Two disjoint boxes: 10x10x10 at origin and 10x10x10 at +X = 30.
    // Volume of each is 1000mm^3; sum = 2000mm^3. A boolean union of
    // disjoint shapes equals the sum; a compound (which does not fuse)
    // also reports the sum. The lossless property is asserted via
    // boundingBox() + per-part bbox preservation in the dedicated
    // sceneAssemblyModel test; here we assert the compound chain works.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('a', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('b', box(10, 10, 10).translate(30, 0, 0), { at: [0, 0, 0] });
      return arm.model().toCompound();
    `);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    expect(shape).toBeInstanceOf(OcctBackend);

    // Volume reflects sum of part volumes — compounds don't fuse.
    const vol = shape!.volume();
    expect(vol).toBeCloseTo(2000, 3);

    // boundingBox() is computed across all sub-shapes in the compound.
    const bb = shape!.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 3);
    expect(bb.max[0]).toBeCloseTo(40, 3);
    expect(bb.max[1]).toBeCloseTo(10, 3);
    expect(bb.max[2]).toBeCloseTo(10, 3);
  });

  it('toUnion() returns a Shape that lowers to a single boolean-fused solid', async () => {
    // Two overlapping boxes: 20x20x20 at origin (centered=false → spans
    // [0..20] in each axis), and 20x20x20 translated by [10,10,10]
    // (spans [10..30]). They share an 10x10x10 corner cube. Sum volume
    // = 2 * 8000 = 16000; fused volume = 16000 - 1000 = 15000.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('a', box(20, 20, 20), { at: [0, 0, 0] });
      arm.part('b', box(20, 20, 20).translate(10, 10, 10), { at: [0, 0, 0] });
      return arm.model().toUnion();
    `);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    expect(shape).toBeInstanceOf(OcctBackend);
    const vol = shape!.volume();
    // Fused volume strictly less than the sum (overlap removed).
    expect(vol).toBeLessThan(16000 - 100); // overlap ~= 1000mm^3
    expect(vol).toBeGreaterThan(14000);
  });

  it('toUnion() result chains capture-time ops (.fillet)', async () => {
    // Disjoint parts, then call .fillet on the union — confirms the
    // returned Shape behaves as any other capture-time Shape.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('a', box(20, 20, 20), { at: [0, 0, 0] });
      arm.part('b', box(20, 20, 20).translate(40, 0, 0), { at: [0, 0, 0] });
      return arm.model().toUnion().fillet(1);
    `);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    expect(shape).toBeInstanceOf(OcctBackend);
    // Filleted volume strictly less than 2 * 8000 (corners shaved).
    expect(shape!.volume()).toBeLessThan(16000);
  });

  it('regression: assemblyExport survives params.update with non-identity worldTransforms', async () => {
    // Replicad's translate()/rotate() destroy the source OCCT handle. The
    // assemblyExport lowerer iterates SceneBackend.parts on every recompute;
    // those part shapes are cached across `params.update` runs, so without a
    // fresh clone the second recompute hit "This object has been deleted." on
    // any part with a non-identity worldTransform. Identity transforms early-
    // return `this` from applyTransform, which is why a yaw=0 path historically
    // worked while ball-joint poses caught the bug. This test pins the fix.
    const model = await buildModel({
      fileName: 'reactive-double-update.kcad.ts',
      code: `
        const xDeg = param('xDeg', 10, { min: -180, max: 180 });
        const arm = assembly('test');
        const base = arm.part('base', box(10, 10, 10));
        const tip  = arm.part('tip',  box(10, 10, 50));
        arm.ball('wrist', base, tip, { origin: [0, 0, 10] });
        return (await arm.solvedModel({ wrist: [xDeg, 0, 0] })).toUnion();
      `,
    });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(model.tailShape).toBeDefined();
    const initial = (model.tailShape as OcctBackend).boundingBox();

    // First param edit — exercises the cached SceneBackend path with a fresh
    // non-identity worldTransform on the tip part.
    const first = await updateModelParams(model, [{ name: 'xDeg', value: 20 }]);
    expect(first.result.warnings).toEqual([]);
    expect(first.result.shape).toBeDefined();
    const afterFirst = (first.result.shape as OcctBackend).boundingBox();

    // Second param edit — without the clone fix, the part shape's OCCT handle
    // has been destroyed by the first applyTransform and this throws
    // "recompute.lowering.exception — This object has been deleted."
    const second = await updateModelParams(model, [{ name: 'xDeg', value: 45 }]);
    expect(second.result.warnings).toEqual([]);
    expect(second.result.shape).toBeDefined();
    const afterSecond = (second.result.shape as OcctBackend).boundingBox();

    // Pose actually advanced — bbox.min[1] differs between the three
    // rotations. World y = ly·cosθ − (lz−10)·sinθ; tip's far end (lz=50,
    // ly=0) pulls min y down to ~ −40·sinθ:
    //   θ=10° → ~ −6.94
    //   θ=20° → ~ −13.68
    //   θ=45° → ~ −28.28
    // Identical mins would indicate the recompute silently kept a stale
    // shape rather than re-applying the new worldTransform.
    expect(afterFirst.min[1]).not.toBeCloseTo(initial.min[1], 1);
    expect(afterSecond.min[1]).not.toBeCloseTo(afterFirst.min[1], 1);
    // Sanity: min y trends progressively negative as |θ| grows.
    expect(afterSecond.min[1]).toBeLessThan(afterFirst.min[1]);
    expect(afterFirst.min[1]).toBeLessThan(initial.min[1]);
  });

  it('Scene.toCompound() / Scene.toUnion() throw cleanly when no exportFn was wired', () => {
    // Hand-constructed Scene (e.g. from a unit test) — no exportFn.
    const stub = { id: 'stub' } as unknown as Shape;
    const scene = new Scene(
      'arm',
      [{ name: 'a', shape: stub, worldTransform: Transform.identity() }],
      () => ({ min: [0, 0, 0], max: [0, 0, 0] }),
    );
    let captured: unknown;
    try {
      scene.toCompound();
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(KernelError);
    const err = captured as KernelError;
    expect(err.code).toBe('feature.invalid-args');
    expect(err.hint).toContain('invalid-args.scene.export-callback-missing');
    expect(err.message).toContain('Scene.toCompound');

    captured = undefined;
    try {
      scene.toUnion();
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(KernelError);
    expect((captured as KernelError).code).toBe('feature.invalid-args');
    expect((captured as KernelError).hint).toContain('invalid-args.scene.export-callback-missing');
  });
});
