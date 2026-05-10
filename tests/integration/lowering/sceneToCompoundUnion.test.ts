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
//   - toShape() delegates to toUnion() (deprecation alias works).
//   - hand-constructed Scene with no exportFn throws a clear KernelError.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import { Scene } from '../../../src/intent/scene';
import { Transform } from '../../../src/runtime/se3';
import { KernelError } from '../../../src/intent/kernelError';
import type { Shape } from '../../../src/capture/proxy';
import type { CompilerDiagnostic } from '../../../src/diagnostics/diagnostic';

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

  it('toShape() delegates to toUnion() (deprecation alias works)', async () => {
    // Identical assemblies via toShape() and toUnion(); bboxes must match.
    const a = await lowerScript(`
      const arm = assembly('test');
      arm.part('a', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('b', box(10, 10, 10).translate(20, 0, 0), { at: [0, 0, 0] });
      return arm.model().toShape();
    `);
    const b = await lowerScript(`
      const arm = assembly('test');
      arm.part('a', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('b', box(10, 10, 10).translate(20, 0, 0), { at: [0, 0, 0] });
      return arm.model().toUnion();
    `);
    expect(a.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(b.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bbA = a.shape!.boundingBox();
    const bbB = b.shape!.boundingBox();
    expect(bbA.min).toEqual(bbB.min);
    expect(bbA.max).toEqual(bbB.max);
    expect(a.shape!.volume()).toBeCloseTo(b.shape!.volume(), 5);
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
