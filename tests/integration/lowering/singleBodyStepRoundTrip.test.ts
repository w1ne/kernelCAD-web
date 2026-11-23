// tests/integration/lowering/singleBodyStepRoundTrip.test.ts
//
// Issue #1592, second acceptance item: a single-body STEP without an assembly
// tree still round-trips its name and colour. A script that returns a bare
// shape (no `assembly(...)`) must export one named, coloured STEP product.
// Checked by reading the exported bytes back through the XCAF importer.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';
import type { StepAssemblySnapshot } from '../../../src/kernel/import/stepAssemblyTypes';
import { writeStepBundle } from '../../../src/kernel/import/stepBundleWriter';
import { ROLE_PALETTE } from '../../../src/shared/render/palette';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

async function exportStep(code: string, fileName = 'bracket.kcad.ts'): Promise<Uint8Array> {
  const result = await runAndExport({ code, fileName, format: 'step' });
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.bytes;
}

async function roundTrip(code: string, fileName?: string): Promise<StepAssemblySnapshot> {
  return importStepAssembly(await exportStep(code, fileName), 'single-body.step');
}

describe('single-body STEP export keeps the part name and colour', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('writes one product named after the source file, with the shape colour', async () => {
    const snapshot = await roundTrip(`return box(30, 20, 10).color('#3366cc');`);

    expect(snapshot.occurrences).toHaveLength(1);
    expect(snapshot.definitions).toHaveLength(1);
    const [body] = snapshot.occurrences;
    expect(body.name).toBe('bracket');
    expect(body.sourcePath).toEqual(['bracket']);
    expect(body.color?.hex).toBe('#3366cc');
    expect(body.color?.alpha).toBeCloseTo(1, 6);
    // No assembly tree: the body is not moved.
    expect(body.transform.map((v) => Math.round(v * 1e9) / 1e9 + 0)).toEqual(IDENTITY);

    // The geometry is unchanged: one 30 x 20 x 10 mm solid at the origin.
    const [definition] = snapshot.definitions;
    expect(definition.name).toBe('bracket');
    expect(definition.solidCount).toBe(1);
    expect(definition.volumeMm3).toBeCloseTo(30 * 20 * 10, 3);
    definition.boundsMm.min.forEach((v) => expect(v).toBeCloseTo(0, 3));
    definition.boundsMm.max.forEach((v, axis) => expect(v).toBeCloseTo([30, 20, 10][axis], 3));
    expect(snapshot.warnings).toEqual([]);
  }, 120_000);

  it('keeps a colour set before a later feature, and the cut geometry', async () => {
    const snapshot = await roundTrip(
      `return box(30, 20, 10).color('#3366cc').subtract(cylinder(10, 3).translate(15, 10, 0));`,
      '/work/parts/motor-mount.kcad.ts',
    );
    expect(snapshot.occurrences).toHaveLength(1);
    expect(snapshot.occurrences[0].name).toBe('motor-mount');
    expect(snapshot.occurrences[0].color?.hex).toBe('#3366cc');
    expect(snapshot.definitions[0].solidCount).toBe(1);
    expect(snapshot.definitions[0].volumeMm3).toBeCloseTo(30 * 20 * 10 - Math.PI * 3 * 3 * 10, 2);
  }, 120_000);

  it('resolves a role colour token to its palette colour', async () => {
    const snapshot = await roundTrip(`return box(30, 20, 10).color('plate');`);
    expect(snapshot.occurrences[0].color?.hex).toBe(ROLE_PALETTE.plate.toLowerCase());
  }, 120_000);

  it('writes the name and no colour for a shape without a colour', async () => {
    const bytes = await exportStep(`return box(30, 20, 10);`);
    const snapshot = await importStepAssembly(bytes, 'single-body.step');
    expect(snapshot.occurrences).toHaveLength(1);
    expect(snapshot.occurrences[0].name).toBe('bracket');
    expect(snapshot.occurrences[0].color).toBeUndefined();
    expect(new TextDecoder().decode(bytes)).not.toContain('COLOUR_RGB');
    expect(snapshot.definitions[0].volumeMm3).toBeCloseTo(30 * 20 * 10, 3);
  }, 120_000);

  it('writes identical bytes for identical input', async () => {
    const code = `return box(30, 20, 10).color('#3366cc');`;
    const first = await exportStep(code);
    const second = await exportStep(code);
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  }, 120_000);

  describe('import-step bundle', () => {
    let root: string;
    beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'single-body-step-')); });
    afterEach(async () => { await rm(root, { recursive: true, force: true }); });

    it('rebuilds the part with the same name and colour', async () => {
      const bytes = await exportStep(`return box(30, 20, 10).color('#3366cc');`);
      const snapshot = await importStepAssembly(bytes, 'bracket.step');
      const bundle = await writeStepBundle({
        inputName: 'bracket.step', inputBytes: bytes, outDir: join(root, 'bundle'), assemblyName: 'bracket', snapshot,
      });
      const script = await readFile(bundle.script, 'utf8');
      expect(script.match(/imported\.part\("[^"]*"/g)).toEqual(['imported.part("bracket"']);
      expect(script).toContain('.color("#3366cc")');
      expect(bundle.renamedParts).toEqual([]);
    }, 120_000);
  });
});
