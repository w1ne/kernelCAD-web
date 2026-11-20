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
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';
import { writeStepBundle } from '../../../src/kernel/import/stepBundleWriter';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportSceneToSTEPAsync } from '../../../src/kernel/backends/occt/sceneStepExport';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
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

  it('leaves the uncoloured parts of a real assembly without a colour through STEP export and import', async () => {
    // The example sets no colours. Its parts used to be written as red, and
    // import-step then gave every part an explicit `.color('#ff0000')`.
    const source = 'examples/bom/panel-with-fasteners.kcad.ts';
    const result = await runAndExport({ code: await readFile(source, 'utf8'), fileName: source, format: 'step' });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(new TextDecoder().decode(result.bytes)).not.toMatch(/COLOUR_RGB|PRE_DEFINED_COLOUR/);

    const snapshot = await importStepAssembly(result.bytes, 'panel.step');
    expect(snapshot.definitions).toHaveLength(4);
    expect(snapshot.occurrences).toHaveLength(9);
    expect(snapshot.occurrences.filter((o) => o.color !== undefined)).toEqual([]);
    const plate = snapshot.definitions.find((d) => d.name === 'plate');
    expect(plate?.volumeMm3).toBeCloseTo(200 * 120 * 3, 3);

    const workDir = await mkdtemp(join(tmpdir(), 'kcad-step-uncoloured-'));
    try {
      const bundle = await writeStepBundle({
        inputName: 'panel.step',
        inputBytes: result.bytes,
        outDir: join(workDir, 'panel-import'),
        assemblyName: 'panel',
        snapshot,
      });
      const script = await readFile(bundle.script, 'utf8');
      expect(script).toContain('standoff_2');
      expect(script).not.toContain('.color(');
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }, 120_000);

  it('STL export of a Scene auto-fuses world-frame parts into one mesh', async () => {
    // Studio header STL on multi-part assemblies (keycap body + inlays, etc.)
    // must produce bytes without requiring Scene.toUnion() in the script.
    const code = `
      const arm = assembly('test');
      arm.part('a', box(10, 10, 10));
      arm.part('b', box(10, 10, 10).translate(20, 0, 0));
      return arm.model();
    `;
    const result = await runAndExport({
      code,
      fileName: 'scene-stl-auto-union.kcad.ts',
      format: 'stl',
      options: { format: 'stl', verify: false },
    });
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);
    // Binary STL: 80-byte header + 4-byte triangle count + 50 bytes/tri.
    expect(result.bytes.length).toBeGreaterThanOrEqual(84);
    const triCount = new DataView(
      result.bytes.buffer,
      result.bytes.byteOffset,
      result.bytes.byteLength,
    ).getUint32(80, true);
    expect(triCount).toBeGreaterThan(0);
  });
});
