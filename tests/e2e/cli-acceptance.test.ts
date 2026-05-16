import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportScript } from '../../src/agent/cli/commands/export';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
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
    const { runScript } = await import('../../src/modeling/runtime/runScript');
    const { RecomputeEngine } = await import('../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/modeling/backends/occt/occtLowerer');
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
    const { runScript } = await import('../../src/modeling/runtime/runScript');
    const { RecomputeEngine } = await import('../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/modeling/backends/occt/occtLowerer');
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

describe('v0.2-alpha hollow-box fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the hollow-box fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'hollow.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/hollow-box.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(1000);
  });


  it('hollow-box has dramatically less volume than the solid equivalent', async () => {
    const { runScript } = await import('../../src/modeling/runtime/runScript');
    const { RecomputeEngine } = await import('../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/modeling/backends/occt/occtLowerer');
    const { readFile } = await import('node:fs/promises');

    const fixturePath = join(__dirname, 'fixtures/hollow-box.kcad.ts');
    const shelledCode = await readFile(fixturePath, 'utf8');
    // Strip the trailing .shell(t, { face: 'top' }) call to get the un-shelled equivalent.
    const solidCode = shelledCode.replace(/\.shell\([^)]+,\s*\{[^}]+\}\);?$/m, ';');

    const engine = new RecomputeEngine(new OcctLowerer());
    const shelled = await runScript({ code: shelledCode, fileName: fixturePath });
    const solid = await runScript({ code: solidCode, fileName: fixturePath });

    const sres = await engine.run(shelled.records);
    const ures = await engine.run(solid.records);

    const slast = shelled.records[shelled.records.length - 1];
    const ulast = solid.records[solid.records.length - 1];

    const sv = sres.shapes.get(slast.id)!.volume();
    const uv = ures.shapes.get(ulast.id)!.volume();
    expect(sv).toBeLessThan(uv * 0.3);
    expect(sv).toBeGreaterThan(0);
  });
});

describe('v0.4-alpha triangle-extrusion fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the triangle extrusion fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'triangle.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/triangle-extrusion.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    // Binary STL: 80-byte header + 4-byte count + 50 bytes per triangle.
    // A triangular prism has 8 triangles → 484 bytes; > 84 confirms non-empty binary output.
    expect(statSync(out).size).toBeGreaterThan(84);
  });
});

describe('v0.4-beta rounded-plate fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the rounded-plate fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'rounded-plate.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/rounded-plate.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc L-bracket sketch fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the L-bracket sketch fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'l-bracket.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/l-bracket.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc3 rounded-L-bracket sketch fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the rounded-L-bracket sketch fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'rounded-l.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/rounded-l-bracket.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc4 washer revolve fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the washer fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'washer.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/washer.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc4 mug-body revolve fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the mug-body fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'mug-body.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/mug-body.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  }, 30000);
});

describe('v0.4-rc5 gear-blank threePointsArc fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the gear-blank fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'gear-blank.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/gear-blank.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc5 cam-profile mixed-arc fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the cam-profile fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'cam-profile.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/cam-profile.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc6 tabbed-plate label+fillet fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the tabbed-plate fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'tabbed-plate.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/tabbed-plate.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc7 preselected-edges round-trip fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('selectEdges → fillet round-trip produces valid STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'preselected-edges.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/preselected-edges.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc8 pipe sweep fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the pipe fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'pipe.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/pipe.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc8 spring sweep fixture (helix + frenet)', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the spring fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'spring.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/spring.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  }, 30000); // larger timeout — helix tessellation is expensive
});

describe('v0.4-rc10 nozzle loft fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the nozzle fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'nozzle.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/nozzle.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc10 airfoil loft fixture (4-rib wing)', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the airfoil fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'airfoil.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/airfoil.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  }, 30000);  // larger timeout — 4-section loft tessellates more than 2-section
});

describe('v0.4-rc11 bracket-blends variable-radius fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the bracket-blends fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'bracket-blends.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/bracket-blends.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc12 bracket-bevels variable-distance chamfer fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the bracket-bevels fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'bracket-bevels.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/bracket-bevels.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });
});

describe('v0.4-rc13 symmetric-bracket mirror fixture', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs end-to-end on the symmetric-bracket fixture and produces STL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-acc-'));
    const out = join(tmp, 'symmetric-bracket.stl');
    const r = await exportScript({
      file: join(__dirname, 'fixtures/symmetric-bracket.kcad.ts'),
      format: 'stl',
      out,
    });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(500);
  });

  it('symmetric-bracket volume matches analytic prediction within tolerance', async () => {
    const { runScript } = await import('../../src/modeling/runtime/runScript');
    const { RecomputeEngine } = await import('../../src/modeling/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../src/modeling/backends/occt/occtLowerer');
    const { readFile } = await import('node:fs/promises');

    const fixturePath = join(__dirname, 'fixtures/symmetric-bracket.kcad.ts');
    const code = await readFile(fixturePath, 'utf8');
    const run = await runScript({ code, fileName: fixturePath });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);
    const last = run.records[run.records.length - 1];
    const shape = result.shapes.get(last.id)!;

    // cylinder(thickness, boltDiameter/2) — height = 5 mm, radius = 2 mm.
    // Analytic: 2 * (halfWidth*depth*thickness - π*r²*h)
    // With defaults (halfWidth=20, depth=30, thickness=5, boltDiameter=4):
    // 2 * (20*30*5 - π*2²*5) ≈ 2 * (3000 - 62.83) ≈ 5874.34 mm³
    const expected = 2 * (20 * 30 * 5 - Math.PI * Math.pow(2, 2) * 5);
    expect(shape.volume()).toBeGreaterThan(expected - 50);
    expect(shape.volume()).toBeLessThan(expected + 50);
  });
});

