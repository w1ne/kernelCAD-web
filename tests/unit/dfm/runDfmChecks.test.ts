// tests/unit/dfm/runDfmChecks.test.ts
//
// W3 Task 7 — DFM gate orchestrator: `runDfmChecksOnModel(model)` resolves
// the last dfmSpec record, binds the declared gates to the model's parts
// (assembly scene OR single-shape pseudo-part 'shape'), shares one mesh +
// BVH per printed part across min-wall and void checks, and emits the four
// dfm.* gate diagnostics with registry-sourced hints. Exercises:
//   - no dfmSpec record → undefined (the gates are opt-in),
//   - findDfmSpec last-record-wins,
//   - clean assembly clearance: pairs listed, no error diagnostics,
//   - violated clearance pair → dfm.clearance.violated with the distance,
//   - mated pair derived via __mates() → status 'mated', no violation,
//   - exclude glob: excluded part skips min-wall + void but STILL
//     participates in clearance,
//   - unknown part names in channels/ignore/exclude → feature.invalid-args
//     listing the valid names (the W2 unknown-part convention),
//   - single-shape script → min-wall + void against pseudo-part 'shape',
//     clearance skipped,
//   - thin wall → dfm.wall.too-thin with part, thickness, location,
//   - undeclared sealed cavity → dfm.void.undeclared with volume + location,
//   - over-declared sealed channel (no matching cavity) → mismatch surfaced
//     via detectedSealedVoidCount,
//   - through-hole declared openings: 3 (found 2) →
//     dfm.channel.openings-mismatch with mouth locations,
//   - two non-sealed channels on one part → feature.invalid-args
//     (one-channel rule),
//   - kernel-failure pair (injected BRepExtrema throw) → clearance status
//     'unknown' survives into the report WITH its warn diagnostic,
//   - every emitted diagnostic carries a non-empty hint (local pre-check
//     for the Task 8 integration gate).

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { buildModel, type BuiltModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { pairKey } from '../../../src/modeling/runtime/detectInterferences';
import {
  findDfmSpec,
  runDfmChecksOnModel,
  type DfmCheckReport,
} from '../../../src/modeling/runtime/dfm/runDfmChecks';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { DfmSpecMetadata } from '../../../src/shared/intent/dfmSpecRecord';

// Fault-injection switch for the BREP distance kernel (same idiom as
// clearance.test.ts): when set, the mocked `brepExtremaDistance` throws,
// exercising the kernel-failure path through the orchestrator.
const kernel = vi.hoisted(() => ({ failDistance: false }));
vi.mock('../../../src/modeling/runtime/brepDistance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/runtime/brepDistance')>();
  return {
    ...actual,
    brepExtremaDistance: (...args: Parameters<typeof actual.brepExtremaDistance>) => {
      if (kernel.failDistance) throw new Error('injected BRepExtrema failure');
      return actual.brepExtremaDistance(...args);
    },
  };
});

async function run(code: string): Promise<{ model: BuiltModel; report: DfmCheckReport }> {
  const model = await buildModel({ fileName: 'dfm-orchestrator.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const report = await runDfmChecksOnModel(model);
  expect(report).toBeDefined();
  assertAllHints(report!);
  return { model, report: report! };
}

/** Task 8 integration-gate pre-check: every diagnostic the orchestrator
 *  emits must carry a non-empty hint. */
function assertAllHints(report: DfmCheckReport): void {
  for (const d of report.diagnostics) {
    expect(typeof d.hint, `diagnostic ${d.code} has no hint`).toBe('string');
    expect(d.hint.trim().length, `diagnostic ${d.code} has an empty hint`).toBeGreaterThan(0);
  }
}

/** Two corner-origin 10 mm cubes with an X gap of `gapMm`, plus a dfmSpec. */
function twoBoxes(gapMm: number, dfmSpecArgs: string): string {
  return `
    dfmSpec(${dfmSpecArgs});
    const asm = assembly('dfm-orchestrator');
    asm.part('left', box(10, 10, 10), { at: [0, 0, 0] });
    asm.part('right', box(10, 10, 10), { at: [${10 + gapMm}, 0, 0] });
    return asm.solvedModel({}, { validate: 'off' });
  `;
}

describe('findDfmSpec', () => {
  const rec = (kind: string, minWall: number): FeatureRecord => ({
    id: `${kind}_${minWall}`,
    kind: kind as FeatureRecord['kind'],
    inputs: {},
    params: {},
    transforms: [],
    suppressed: false,
    metadata: {
      minWall, ignore: [], exclude: [], channels: [], virtual: true,
    } as unknown as FeatureRecord['metadata'],
  });

  it('returns undefined when no dfmSpec record exists', () => {
    expect(findDfmSpec([rec('box', 0)])).toBeUndefined();
    expect(findDfmSpec([])).toBeUndefined();
  });

  it('returns the LAST dfmSpec record (last wins)', () => {
    const spec = findDfmSpec([rec('dfmSpec', 1), rec('box', 0), rec('dfmSpec', 2)]);
    expect(spec).toBeDefined();
    expect((spec as DfmSpecMetadata).minWall).toBe(2);
  });
});

describe('runDfmChecksOnModel', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  afterEach(() => { kernel.failDistance = false; });

  it('returns undefined when the model declares no dfmSpec', async () => {
    const model = await buildModel({
      fileName: 'dfm-orchestrator.kcad.ts',
      code: 'return box(10, 10, 10);',
    });
    expect(await runDfmChecksOnModel(model)).toBeUndefined();
  });

  it('reports a clean two-part assembly with the pair listed and no error diagnostics', async () => {
    const { report } = await run(twoBoxes(0.50, '{ minClearance: 0.45 }'));
    expect(report.clearance).toHaveLength(1);
    expect(report.clearance[0].status).toBe('ok');
    expect(report.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    // No minWall declared → no wall results; voids still swept (undeclared
    // sealed cavities are caught unconditionally) and clean.
    expect(report.walls).toEqual([]);
    expect(report.voids.map(v => v.part).sort()).toEqual(['left', 'right']);
    for (const v of report.voids) expect(v.result.sealedVoids).toEqual([]);
    expect(report.timings.clearance).toBeGreaterThanOrEqual(0);
    expect(report.timings.total).toBeGreaterThan(0);
  }, 60000);

  it('emits dfm.clearance.violated with the measured distance for a 0.30 mm gap', async () => {
    const { report } = await run(twoBoxes(0.30, '{ minClearance: 0.45 }'));
    expect(report.clearance[0].status).toBe('violated');
    const d = report.diagnostics.filter(x => x.code === 'dfm.clearance.violated');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].message).toMatch(/'left'/);
    expect(d[0].message).toMatch(/'right'/);
    expect(d[0].message).toMatch(/0\.30\d* mm/);
    expect(d[0].message).toMatch(/0\.45/);
  }, 60000);

  it("derives mated pairs from __mates(): a fastened pair 0.30 mm apart is 'mated', not violated", async () => {
    const { report } = await run(`
      dfmSpec({ minClearance: 0.45 });
      const asm = assembly('dfm-mated');
      const parent = asm.part('parent', box(10, 10, 10));
      parent.connector('out', { type: 'frame', origin: { kind: 'vec3', value: [10.3, 0, 0] } });
      const child = asm.part('child', box(10, 10, 10));
      child.connector('in', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      asm.mate('attach', 'parent.out', 'child.in', 'fastened');
      return asm.solvedModel({}, { validate: 'off' });
    `);
    expect(report.clearance).toHaveLength(1);
    expect(pairKey(report.clearance[0].a, report.clearance[0].b)).toBe(pairKey('parent', 'child'));
    expect(report.clearance[0].status).toBe('mated');
    expect(report.diagnostics.filter(d => d.code === 'dfm.clearance.violated')).toEqual([]);
  }, 60000);

  it('exclude glob skips min-wall + void for the part but keeps it in clearance', async () => {
    const { report } = await run(`
      dfmSpec({ minWall: 1.5, minClearance: 0.45, exclude: ['vendor-*'] });
      const asm = assembly('dfm-exclude');
      asm.part('printed', box(20, 20, 20), { at: [0, 0, 0] });
      asm.part('vendor-bracket', box(20, 20, 0.5), { at: [20.2, 0, 0] });
      return asm.solvedModel({}, { validate: 'off' });
    `);
    // The 0.5 mm vendor walls never reach the min-wall gate...
    expect(report.diagnostics.filter(d => d.code === 'dfm.wall.too-thin')).toEqual([]);
    expect(report.walls.map(w => w.part)).toEqual(['printed']);
    expect(report.voids.map(v => v.part)).toEqual(['printed']);
    // ...but the SAME part still violates clearance at a 0.20 mm gap.
    const violated = report.diagnostics.filter(d => d.code === 'dfm.clearance.violated');
    expect(violated).toHaveLength(1);
    expect(violated[0].message).toMatch(/'vendor-bracket'/);
  }, 60000);

  it('flags unknown part names in channels / ignore / exclude with the valid names listed', async () => {
    const { report } = await run(twoBoxes(
      0.50,
      `{
        minClearance: 0.45,
        ignore: [['left', 'wrong-name']],
        exclude: ['phantom'],
        channels: [{ part: 'ghost', name: 'bore', openings: 2 }],
      }`,
    ));
    const d = report.diagnostics.filter(x => x.code === 'feature.invalid-args');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    for (const unknown of ['ghost', 'wrong-name', 'phantom']) {
      expect(d[0].message).toContain(unknown);
    }
    expect(d[0].message).toMatch(/Valid names: left, right/);
  }, 60000);

  it("runs min-wall + void against a single-shape script as pseudo-part 'shape'; clearance skipped", async () => {
    const { report } = await run(`
      dfmSpec({ minWall: 1.5 });
      return box(20, 20, 1);
    `);
    expect(report.clearance).toEqual([]);
    expect(report.timings.clearance).toBeUndefined();
    expect(report.walls).toHaveLength(1);
    expect(report.walls[0].part).toBe('shape');
    expect(report.walls[0].result.violations.length).toBeGreaterThan(0);
    expect(report.voids).toHaveLength(1);
    expect(report.voids[0].part).toBe('shape');
    const d = report.diagnostics.filter(x => x.code === 'dfm.wall.too-thin');
    expect(d.length).toBeGreaterThan(0);
    expect(d[0].severity).toBe('error');
    expect(d[0].message).toMatch(/'shape'/);
    expect(d[0].message).toMatch(/1\.000 mm/); // the 1 mm slab thickness
    expect(d[0].message).toMatch(/1\.5/);
    expect(report.timings.walls).toBeGreaterThanOrEqual(0);
    expect(report.timings.voids).toBeGreaterThanOrEqual(0);
    expect(report.timings.mesh).toBeGreaterThanOrEqual(0);
  }, 60000);

  it('emits dfm.void.undeclared with volume + location for a sealed internal cavity', async () => {
    const { report } = await run(`
      dfmSpec({ minWall: 1.5 });
      return box(20, 20, 20).subtract(box(6, 6, 6).translate(7, 7, 7));
    `);
    expect(report.voids[0].result.sealedVoids).toHaveLength(1);
    const d = report.diagnostics.filter(x => x.code === 'dfm.void.undeclared');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].message).toMatch(/'shape'/);
    expect(d[0].message).toMatch(/2\d\d(\.\d+)? mm/); // ~216 mm³ cavity
    expect(d[0].message).toMatch(/\(\d+(\.\d+)?, \d+(\.\d+)?, \d+(\.\d+)?\)/);
  }, 60000);

  it('surfaces an over-declared sealed channel (no matching cavity) via detectedSealedVoidCount', async () => {
    const { report } = await run(`
      dfmSpec({ channels: [{ part: 'shape', name: 'phantom-pocket', openings: 0, sealed: true }] });
      return box(20, 20, 20);
    `);
    expect(report.voids[0].result.detectedSealedVoidCount).toBe(0);
    expect(report.voids[0].result.sealedVoids).toEqual([]);
    const d = report.diagnostics.filter(x => x.code === 'dfm.channel.openings-mismatch');
    expect(d).toHaveLength(1);
    expect(d[0].message).toMatch(/'phantom-pocket'/);
    expect(d[0].message).toMatch(/sealed/);
  }, 60000);

  it('emits dfm.channel.openings-mismatch with mouth locations for found 2 vs declared 3', async () => {
    const { report } = await run(`
      dfmSpec({ channels: [{ part: 'shape', name: 'bore', openings: 3 }] });
      return box(20, 20, 20).subtract(cylinder(22, 2).translate(10, 10, -1));
    `);
    expect(report.voids[0].result.channelOpenings!.found).toBe(2);
    const d = report.diagnostics.filter(x => x.code === 'dfm.channel.openings-mismatch');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].message).toMatch(/'bore'/);
    expect(d[0].message).toMatch(/2 mouth/);
    expect(d[0].message).toMatch(/declared.*3/i);
    // Mouth locations from the carry-over surface in the message.
    expect(d[0].message).toMatch(/\(\d+(\.\d+)?, \d+(\.\d+)?, -?\d+(\.\d+)?\)/);
  }, 60000);

  it('rejects two non-sealed channels on one part (one-channel rule) with feature.invalid-args', async () => {
    const { report } = await run(`
      dfmSpec({ channels: [
        { part: 'shape', name: 'a', openings: 1 },
        { part: 'shape', name: 'b', openings: 1 },
      ] });
      return box(20, 20, 20);
    `);
    const d = report.diagnostics.filter(x => x.code === 'feature.invalid-args');
    expect(d).toHaveLength(1);
    expect(d[0].message).toMatch(/non-sealed/);
    expect(d[0].message).toMatch(/'shape'/);
  }, 60000);

  it("keeps kernel-failed pairs visible: status 'unknown' in clearance[] WITH its warn diagnostic", async () => {
    kernel.failDistance = true;
    const { report } = await run(twoBoxes(0.30, '{ minClearance: 0.45 }'));
    expect(report.clearance).toHaveLength(1);
    expect(report.clearance[0].status).toBe('unknown');
    const warns = report.diagnostics.filter(d => d.code === 'feature.kernel-failed');
    expect(warns).toHaveLength(1);
    expect(warns[0].severity).toBe('warn');
    // No clearance violation fabricated for the unmeasured pair.
    expect(report.diagnostics.filter(d => d.code === 'dfm.clearance.violated')).toEqual([]);
  }, 60000);
});
