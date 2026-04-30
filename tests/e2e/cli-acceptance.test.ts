import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportScript } from '../../src/cli/commands/export';
import { initOcct } from '../../src/backends/occt/occtBackend';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO = join(__dirname, 'fixtures/demo.kcad.ts');

describe('v0.1 acceptance demo', () => {
  beforeAll(async () => { await initOcct(); });


  it('runs end-to-end and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'plate.stl');
    const r = await exportScript({ file: DEMO, format: 'stl', out });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(1000);
  });

  it('runs end-to-end and produces valid STEP', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'plate.step');
    const r = await exportScript({ file: DEMO, format: 'step', out });
    expect(r.exitCode).toBe(0);
    const text = readFileSync(out, 'utf8');
    expect(text).toContain('ISO-10303');
    expect(text).toContain('FILE_SCHEMA');
    // Replicad/OCC 7.6 emits AP242; the original plan expected AP203 but the
    // actual output uses AP242_MANAGED_MODEL_BASED_3D_ENGINEERING_MIM_LF.
    // Both are valid STEP application protocols; we match what OCC actually writes.
    expect(text).toMatch(/AP203|AP214|AP242/i);
  });

  it('produces correct geometry: volume matches expected (plate w/ hole)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'plate.step');
    const r = await exportScript({ file: DEMO, format: 'step', out });
    expect(r.exitCode).toBe(0);
    const { runScript } = await import('../../src/script-runtime/runScript');
    const { RecomputeEngine } = await import('../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/backends/occt/occtLowerer');
    const { readFile } = await import('node:fs/promises');
    const code = await readFile(DEMO, 'utf8');
    const run = await runScript({ code, fileName: DEMO });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    const last = run.records[run.records.length - 1];
    const shape = result.shapes.get(last.id)!;
    const expected = 100 * 50 * 30 - Math.PI * 100 * 30;
    expect(shape.volume()).toBeCloseTo(expected, -1);
  });
});

describe('v0.2-alpha rounded-bracket fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the rounded-bracket fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'rounded.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/rounded-bracket.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(1000);
  });

  it('rounded-bracket has strictly less volume than the un-filleted equivalent', async () => {
    const { runScript } = await import('../../src/script-runtime/runScript');
    const { RecomputeEngine } = await import('../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/backends/occt/occtLowerer');
    const { readFile } = await import('node:fs/promises');

    const fixturePath = join(__dirname, 'fixtures/rounded-bracket.kcad.ts');
    const filletedCode = await readFile(fixturePath, 'utf8');
    // Strip the trailing .fillet(r) call from the return statement to get the un-filleted equivalent.
    const unfilletedCode = filletedCode.replace(/\.fillet\([^)]+\);?$/m, ';');

    const engine = new RecomputeEngine(new OcctLowerer());
    const filleted = await runScript({ code: filletedCode, fileName: fixturePath });
    const unfilleted = await runScript({ code: unfilletedCode, fileName: fixturePath });

    const fres = await engine.run(filleted.records);
    const ures = await engine.run(unfilleted.records);

    const flast = filleted.records[filleted.records.length - 1];
    const ulast = unfilleted.records[unfilleted.records.length - 1];

    const fv = fres.shapes.get(flast.id)!.volume();
    const uv = ures.shapes.get(ulast.id)!.volume();
    expect(fv).toBeLessThan(uv);
  });
});
