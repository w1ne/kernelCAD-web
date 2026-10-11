// tests/unit/tube/tubeLowerer.test.ts
//
// The tube solid is a round section swept along the bend-table centreline, so
// its volume must equal section area times the table's cut length. The record
// lowerer turns a centreline that no longer fits into a diagnostic, not a throw.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { tubeSolid } from '../../../src/modeling/backends/occt/tubeLowerer';
import { lowerTube } from '../../../src/modeling/backends/occt/lowerers/tube';
import type { LowerContext } from '../../../src/modeling/backends/occt/lowerers/context';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import { buildTubePath, isTubePathError, type TubePath, type V3 } from '../../../src/shared/tube/tubePath';

const annulus = (od: number, wall: number): number => Math.PI * ((od / 2) ** 2 - (od / 2 - wall) ** 2);

describe('tube lowerer', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it.each([
    ['one bend', [[0, 0, 0], [100, 0, 0], [100, 80, 0]]],
    ['two bends in plane', [[0, 0, 0], [100, 0, 0], [100, 100, 0], [200, 100, 0]]],
    ['three bends out of plane', [[0, 0, 0], [120, 0, 0], [120, 90, 30], [40, 90, 110], [40, 200, 110]]],
  ] as const)('%s: solid volume equals annulus area times table cut length', (_n, pts) => {
    const path = buildTubePath(pts.map((p) => [...p] as V3), 22);
    if (isTubePathError(path)) throw new Error(path.kind);
    const solid = tubeSolid(path, 9.525, 0.89);
    expect(solid.isEmpty()).toBe(false);
    expect(solid.volume()).toBeCloseTo(annulus(9.525, 0.89) * path.cutLength, 1);
  });

  it('wall >= od/2 builds a solid rod', () => {
    const path = buildTubePath([[0, 0, 0], [0, 0, 50]], 20) as TubePath;
    expect(tubeSolid(path, 10, 5).volume()).toBeCloseTo(Math.PI * 25 * 50, 3);
  });

  it('a record whose evaluated radius no longer fits gives a diagnostic and no shape', () => {
    const p = (n: number) => ({ expression: String(n), unit: 'mm', evaluated: n });
    const v = (x: number, y: number, z: number) => ({ x: p(x), y: p(y), z: p(z) });
    const record = {
      id: 'tube_1', kind: 'tube', inputs: {}, transforms: [], suppressed: false,
      params: { od: p(10), wall: p(1), bendRadius: p(60) },        // 60 mm radius, 30 mm middle leg
      metadata: { tube: { name: 't', from: {}, to: {},
        points: [{ offset: v(0, 0, 0) }, { offset: v(100, 0, 0) }, { offset: v(100, 30, 0) }, { offset: v(0, 30, 0) }] } },
    } as unknown as FeatureRecord;
    const diagnostics: CompilerDiagnostic[] = [];
    const out = lowerTube({ diagnostics } as unknown as LowerContext, record);
    expect(out.done).toBe(true);
    expect(diagnostics[0]).toMatchObject({ code: 'feature.invalid-args', featureId: 'tube_1', severity: 'error',
      hint: 'Fix the tube() arguments named in the message, then re-evaluate.' });
    expect(diagnostics[0].message).toBe(
      "tube.corner.unreachable: tube 't' leg 1 — got a leg 90.00 mm too short for the bends at its ends; " +
      'requires the leg at least 90.00 mm longer (move a corner), or a lower bendRadius. ' +
      "Example: tube('t', { from, to, via: [[x, y, z]], wall, bendRadius })");
  });

  it('a record without tube metadata gives a diagnostic naming the record', () => {
    const record = { id: 'tube_9', kind: 'tube', inputs: {}, transforms: [], suppressed: false, params: {}, metadata: {} } as unknown as FeatureRecord;
    const diagnostics: CompilerDiagnostic[] = [];
    lowerTube({ diagnostics } as unknown as LowerContext, record);
    expect(diagnostics[0].featureId).toBe('tube_9');
    expect(diagnostics[0].message).toMatch(
      /^tube\.record\.invalid: record 'tube_9' metadata\.tube — got missing or malformed tube metadata; requires the metadata written by tube\(name, opts\)\./);
  });
});
