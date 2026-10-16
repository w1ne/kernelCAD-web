// tests/integration/mcp/runFea.llmCalls.test.ts
//
// LLM-style calls to `run_fea`, made through the public registry exactly as a
// ChatGPT / Claude client sends them after reading the tool description: the
// description's own inline example, a declared feaStudy, face labels and a
// scalar force + direction, and the genuinely-invalid calls, which must come
// back as coded diagnostics naming the argument.
//
// Hosted servers have no CalculiX / gmsh. These calls must still SOLVE there
// (in-process voxel solver) rather than fail with fea.solver.unavailable; the
// numbers are pinned against beam theory with `solver: 'in-process'` so the
// test means the same on a machine that does have the toolchain.
import { describe, it, expect, beforeAll } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { detectFeaToolchain } from '../../../src/kernel/fea/toolchain';
import type { RunFeaOutput } from '../../../src/agent/mcp/tools/runFea';

async function fea(args: Record<string, unknown>): Promise<RunFeaOutput> {
  return (await callMcpTool('run_fea', { heatmaps: false, ...args })) as RunFeaOutput;
}

// 100 x 10 x 10 mm cantilever, 100 N down at the free end. Beam theory:
// tip deflection F L^3 / (3 E I) = 0.2 mm in steel, bending stress at the
// root M c / I = 60 MPa (the governing value is read one brick layer away
// from the clamp, so a few percent lower).
const BEAM = 'return box(100, 10, 10);';
const STEEL_STUDY = { material: 'mild-steel', fixed: { atX: 0 }, loads: [{ faces: { atX: 100 }, force: [0, 0, -100] }] };

let toolchainOk = false;

describe('run_fea — LLM-style calls', () => {
  beforeAll(async () => {
    await initOcct();
    toolchainOk = (await detectFeaToolchain()).ok;
  }, 60_000);

  it('the description example (inline study on the returned shape) solves with no toolchain installed', async () => {
    const r = await fea({
      code: 'return box(100, 20, 10);',
      material: 'aluminum-6061',
      fixed: { atX: 0 },
      loads: [{ faces: { atX: 100 }, force: [0, 0, -200] }],
      mesh_size: 2.5,
    });
    expect(r.ok, r.error).toBe(true);
    expect(r.summary!.maxDisplacementMm).toBeGreaterThan(0);
    if (!toolchainOk) {
      expect(r.summary!.solver).toBe('in-process-voxel');
      expect(r.summary!.trust.meshTrusted).toBe(false);
    }
  }, 120_000);

  it('in-process numbers match beam theory and close equilibrium', async () => {
    const r = await fea({ code: BEAM, ...STEEL_STUDY, solver: 'in-process', mesh_size: 2.5 });
    expect(r.ok, r.error).toBe(true);
    const s = r.summary!;
    expect(s.solver).toBe('in-process-voxel');
    expect(s.maxDisplacementMm).toBeGreaterThan(0.195);
    expect(s.maxDisplacementMm).toBeLessThan(0.206);
    expect(s.maxVonMisesMPa).toBeGreaterThan(50);
    expect(s.maxVonMisesMPa).toBeLessThan(62);
    expect(s.equilibriumResidual!).toBeLessThan(1e-4);
    expect(s.minSafetyFactor).toBeCloseTo(s.material.yield / s.maxVonMisesMPa, 6);
    // Said out loud: an estimate, not a verified pass.
    expect(r.diagnostics!.map(d => d.code)).toContain('fea.mesh.quality-low');
  }, 120_000);

  it('a study declared in the script runs the same as the inline one', async () => {
    const code = `const b = box(100, 10, 10);\nb.feaStudy(${JSON.stringify(STEEL_STUDY)});\nreturn b;`;
    const r = await fea({ code, solver: 'in-process', mesh_size: 2.5 });
    expect(r.ok, r.error).toBe(true);
    expect(r.summary!.maxDisplacementMm).toBeGreaterThan(0.195);
  }, 120_000);

  it('face labels and a scalar force + direction are accepted', async () => {
    const r = await fea({
      code: BEAM,
      material: 'steel',
      fixed: 'left',
      loads: [{ face: 'right', force: 100, direction: [0, 0, -1] }],
      solver: 'in-process',
      mesh_size: 2.5,
    });
    expect(r.ok, r.error).toBe(true);
    expect(r.summary!.appliedForceN).toEqual([0, 0, -100]);
    expect(r.summary!.maxDisplacementMm).toBeGreaterThan(0.195);
  }, 120_000);

  it('a violated min_safety_factor fails with fea.safety-factor.below-min', async () => {
    const r = await fea({ code: BEAM, ...STEEL_STUDY, loads: [{ faces: { atX: 100 }, force: [0, 0, -2000] }], min_safety_factor: 2, solver: 'in-process', mesh_size: 2.5 });
    expect(r.ok).toBe(false);
    expect(r.diagnostics!.map(d => d.code)).toContain('fea.safety-factor.below-min');
  }, 120_000);

  it('no study anywhere: names both ways to give one, with an example', async () => {
    const r = await fea({ code: BEAM });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toContain('or pass the study on the call: run_fea({');
  });

  it('an unknown material names the value and the valid grades', async () => {
    const r = await fea({ code: BEAM, ...STEEL_STUDY, material: 'unobtanium' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toContain("'unobtanium' is not a known FEA material grade");
    expect(r.error).toContain('mild-steel');
  });

  it('a malformed load force names the field and the bad value', async () => {
    const r = await fea({ code: BEAM, ...STEEL_STUDY, loads: [{ faces: { atX: 100 }, force: 'down' }] });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('loads[0].force must be three finite numbers [Fx, Fy, Fz] in newtons; got "down"');
  });

  it('an unknown solver value is rejected before any work', async () => {
    const r = await fea({ code: BEAM, ...STEEL_STUDY, solver: 'ansys' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toContain('"ansys"');
  });

  it("solver: 'calculix' without the toolchain fails up front with the install command", async () => {
    if (toolchainOk) return; // the external-tools CI job has it: nothing to assert here
    const r = await fea({ code: BEAM, ...STEEL_STUDY, solver: 'calculix' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('fea.solver.unavailable');
    expect(r.error).toContain('apt-get install -y calculix-ccx');
    expect(r.toolchain!.missing.length).toBeGreaterThan(0);
  });
});
