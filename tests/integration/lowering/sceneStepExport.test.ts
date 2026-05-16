// tests/integration/lowering/sceneStepExport.test.ts
//
// Integration coverage for Scene-aware STEP export — Task 16.
//
// `replicad.exportSTEP(ShapeConfig[])` natively writes a STEP file with one
// named body per ShapeConfig (XCAFDoc names + per-shape colors). Our
// `SceneBackend.parts` maps directly to that ShapeConfig array, so a
// 2-part Scene round-trips through STEP with both part names embedded as
// STEP `PRODUCT_DEFINITION` / `NEXT_ASSEMBLY_USAGE_OCCURRENCE` entries.
//
// What's asserted here:
//   - `runAndExport(format='step')` on a script that returns a Scene
//     (i.e. `arm.solvedModel(...)` with no `.toCompound()`/`.toUnion()`)
//     produces a non-empty STEP byte buffer.
//   - The STEP text contains the literal part names declared in
//     `assembly.part(name, ...)`. The flag here is the per-part name; if
//     that survives the STEP round-trip, the XCAFDoc / ShapeConfig path
//     is wired correctly.
//   - The `exportSceneToSTEPAsync` free function is callable directly on
//     a SceneBackend (the lowering result), so non-runAndExport callers
//     (CLI, future MCP export tool) get the same behavior.
//
// This test pins the contract that Scene → STEP preserves names, so the
// agent-built assemblies (Task 14 onwards) ship STEP files where each
// part is independently selectable in downstream CAD viewers.
import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport } from '../../../src/script-runtime/export';
import { initOcct, exportSceneToSTEPAsync } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/kernel/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';

describe('Scene STEP export preserves part names + colors', () => {
  beforeAll(async () => { await initOcct(); });

  it('runAndExport(format=step) on a script returning a Scene embeds part names in STEP', async () => {
    const code = `
      const arm = assembly('test');
      arm.part('alpha_base', box(20, 20, 5).color('plate'), { at: [0, 0, 0] });
      arm.part('beta_arm',   box(5, 5, 30).color('beam'),   { at: [10, 10, 5] });
      return arm.solvedModel({});
    `;
    const result = await runAndExport({
      code,
      fileName: 'scene-step.kcad.ts',
      format: 'step',
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.bytes.length).toBeGreaterThan(0);

    const text = new TextDecoder().decode(result.bytes);
    // STEP file header — replicad's exportSTEP emits ISO-10303-21 STEP.
    expect(text).toContain('ISO-10303');
    // Per-part names from `assembly.part(name, ...)` survive the
    // ShapeConfig → XCAFDoc → STEP write path.
    expect(text).toContain('alpha_base');
    expect(text).toContain('beta_arm');
  });

  it('exportSceneToSTEPAsync free function accepts a lowered SceneBackend directly', async () => {
    // Lower the script manually so we hold the SceneBackend handle —
    // exercises the free function path (used by CLI / future MCP export).
    const { records } = await runScript({
      code: `
        const arm = assembly('test');
        arm.part('rotor', box(10, 10, 10).color('gear'));
        arm.part('stator', box(20, 20, 5).color('frame'));
        return arm.model();
      `,
      fileName: 'scene-step-direct.kcad.ts',
    });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(records);
    // `assemblyModel` is the last feature; its lowered shape is the SceneBackend.
    const last = records[records.length - 1];
    const lowered = r.shapes.get(last.id) as unknown;
    expect(isSceneBackend(lowered)).toBe(true);

    const bytes = await exportSceneToSTEPAsync(lowered as SceneBackend);
    expect(bytes.length).toBeGreaterThan(0);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('ISO-10303');
    expect(text).toContain('rotor');
    expect(text).toContain('stator');
  });

  it('STL export of a Scene return surfaces a structured diagnostic pointing at toUnion/toCompound', async () => {
    // Single-mesh STL of a multi-body Scene needs an explicit fuse — the
    // export path should not silently fall back. Spec: §5 risk #3.
    const code = `
      const arm = assembly('test');
      arm.part('a', box(10, 10, 10));
      arm.part('b', box(10, 10, 10).translate(20, 0, 0));
      return arm.model();
    `;
    const result = await runAndExport({
      code,
      fileName: 'scene-stl-fail.kcad.ts',
      format: 'stl',
    });
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].hint).toContain('toUnion');
    expect(errors[0].hint).toContain('toCompound');
  });
});
