// tests/integration/lowering/sceneAssemblyModel.test.ts
//
// Integration coverage for the SceneBackend emission path of the
// `assemblyModel` lowerer case (the kinematic-zero `arm.model()` view).
//
// Mirrors `sceneBackendEmission.test.ts` (the solvedAssembly counterpart)
// but for the no-FK path: every part's worldTransform is identity because
// model() is the unposed view of the assembly. This test asserts:
//   - The lowered output is a SceneBackend (per `isSceneBackend`).
//   - It has one entry per assembly part, with `name` matching
//     `assembly.part(name, ...)`.
//   - Each part carries `worldTransform = Transform.identity()` — no FK
//     runs in the model() path.
//   - The assembly's `assemblyName` propagates onto the SceneBackend.
//   - Per-part color is resolved via `lookupSourceColor`.
//   - No boolean union is performed — each part stays in its local
//     authoring frame (verified via per-part bbox).
//
// Existing assemblyLowerer tests that asserted unioned-Shape semantics
// (single fused OcctBackend, summed volume, exportSTLAsync on the model)
// will fail under this change; their migration is Task 14.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { Transform } from '../../../src/runtime/se3';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

interface LowerResult {
  shape: unknown;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id),
    diagnostics: r.diagnostics,
  };
}

function expectIdentity(t: Transform): void {
  const m = t.toMat4();
  // Column-major identity.
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const expected = col === row ? 1 : 0;
      expect(m[col * 4 + row]).toBeCloseTo(expected, 9);
    }
  }
}

describe('assemblyModel lowerer — SceneBackend emission', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits SceneBackend with worldTransform=identity per part', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('base', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('link', box(10, 10, 30), { at: [30, 0, 0] });
      return arm.model();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    expect(scene.assemblyName).toBe('test');
    expect(scene.parts.length).toBe(2);

    expect(scene.parts[0].name).toBe('base');
    expect(scene.parts[1].name).toBe('link');

    expect(scene.parts[0].worldTransform).toBeInstanceOf(Transform);
    expect(scene.parts[1].worldTransform).toBeInstanceOf(Transform);

    // model() is the unposed view: every worldTransform is the identity.
    // (No FK runs — `at:` placements are baked into each part's local
    // shape upstream, so the assembly-frame transform per part is I.)
    expectIdentity(scene.parts[0].worldTransform);
    expectIdentity(scene.parts[1].worldTransform);
  });

  it('preserves per-part colors via lookupSourceColor', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('base', box(10, 10, 10).color('plate'),  { at: [0, 0, 0] });
      arm.part('link', box(10, 10, 30).color('beam'),   { at: [30, 0, 0] });
      return arm.model();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    const byName = new Map(scene.parts.map(p => [p.name, p]));
    expect(byName.get('base')?.color).toBe('plate');
    expect(byName.get('link')?.color).toBe('beam');
  });

  it('does NOT boolean-union the parts (each part stays a local-frame shape)', async () => {
    // Each part shape is its own OcctBackend in its local authoring frame —
    // not a fused TopoDS_Compound. We verify by checking each part's bbox
    // matches its primitive box dimensions (a unioned shape would have a
    // single bbox spanning both boxes' extents).
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('base', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('link', box(60, 10, 10).translate(30, 0, 0), { at: [0, 0, 0] });
      return arm.model();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;

    const baseShape = scene.parts[0].shape as OcctBackend;
    const baseBb = baseShape.boundingBox();
    expect(baseBb.max[0] - baseBb.min[0]).toBeCloseTo(10, 5);
    expect(baseBb.max[1] - baseBb.min[1]).toBeCloseTo(10, 5);
    expect(baseBb.max[2] - baseBb.min[2]).toBeCloseTo(10, 5);

    const linkShape = scene.parts[1].shape as OcctBackend;
    const linkBb = linkShape.boundingBox();
    // The link is its own primitive box (60x10x10) translated by [30,0,0]
    // in its local authoring frame — independent OcctBackend, not fused.
    expect(linkBb.max[0] - linkBb.min[0]).toBeCloseTo(60, 5);
    expect(linkBb.max[1] - linkBb.min[1]).toBeCloseTo(10, 5);
  });
});
