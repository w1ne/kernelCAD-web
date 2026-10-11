// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Branch ends: the station on the trunk path, the joint it gives, the record
// tube() captures for a branch and the bend-table rows.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { TubeOptions } from '../../../src/modeling/capture/tubeRecords';
import { computeConstructionClosure } from '../../../src/modeling/capture/featureMeshingPhases';
import { lowerTube } from '../../../src/modeling/backends/occt/lowerers/tube';
import type { LowerContext } from '../../../src/modeling/backends/occt/lowerers/context';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { TubeMetadata } from '../../../src/shared/intent/tubeRecord';
import { resolveParams } from '../../../src/shared/runtime/resolveParams';
import { bendTableFromPath, formatBendTableCsv } from '../../../src/shared/tube/bendTable';
import {
  isTubeGeometryError, stationOnPath, straightRanges, tubeGeometry, type TubeGeometry,
} from '../../../src/shared/tube/tubeBranch';
import { buildTubePath, type TubePath } from '../../../src/shared/tube/tubePath';

// Up 150, one 90 degree bend of radius 40, then 250 along +X.
const PATH = buildTubePath([[0, 0, 0], [0, 0, 150], [250, 0, 150]], 40) as TubePath;
const BEND_END = 110 + 20 * Math.PI;

describe('stationOnPath', () => {
  it('lists the straights of the path', () => {
    const r = straightRanges(PATH);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual([0, 110]);
    expect(r[1][0]).toBeCloseTo(BEND_END, 9);
    expect(r[1][1]).toBeCloseTo(PATH.cutLength, 9);
  });

  it('a station on the first straight', () => {
    expect(stationOnPath(PATH, 30)).toEqual({ on: 'straight', point: [0, 0, 30], dir: [0, 0, 1], before: 30, after: 80,
      startsAtEnd: true, endsAtEnd: false, bendsBefore: 0 });
  });

  it('a station on the last straight', () => {
    const hit = stationOnPath(PATH, BEND_END + 60);
    if (hit.on !== 'straight') throw new Error(hit.on);
    expect(hit.point[0]).toBeCloseTo(100, 9);
    expect(hit.dir).toEqual([1, 0, 0]);
    expect(hit.before).toBeCloseTo(60, 9);
    expect(hit.after).toBeCloseTo(150, 9);
    expect(hit).toMatchObject({ startsAtEnd: false, endsAtEnd: true, bendsBefore: 1 });
  });

  it('a station on the bend, and stations off the path', () => {
    expect(stationOnPath(PATH, 140)).toMatchObject({ on: 'bend', bend: 1, start: 110 });
    expect(stationOnPath(PATH, -1)).toEqual({ on: 'outside', length: PATH.cutLength });
    expect(stationOnPath(PATH, PATH.cutLength + 1)).toEqual({ on: 'outside', length: PATH.cutLength });
    expect(stationOnPath(PATH, Number.NaN)).toEqual({ on: 'outside', length: PATH.cutLength });
  });
});

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createModelingApi({ session }) };
}

const tubes = (session: CaptureSession): FeatureRecord[] => session.getRecords().filter((r) => r.kind === 'tube');
const metaOf = (r: FeatureRecord): TubeMetadata => (r.metadata as unknown as { tube: TubeMetadata }).tube;
const prefixRe = (p: string) => new RegExp(`^${p.replace(/\./g, '\\.')}:`);

/** A straight 400 mm trunk along +X of system 'act', and the api to branch off it. */
function trunkRig() {
  const { session, api } = makeApi();
  api.tube('trunk', { from: { point: [0, 0, 0] }, to: { point: [400, 0, 0] }, od: 12.7, wall: 0.9, bendRadius: 40, system: 'act' });
  return { session, api };
}

const BRANCH = { to: { point: [100, 0, 150] as [number, number, number] }, od: 12.7, wall: 0.9, bendRadius: 40 };

function geometryOf(session: CaptureSession, n: number): TubeGeometry {
  const table = session.paramTable;
  const g = tubeGeometry(resolveParams(tubes(session)[n], table), (id) => {
    const r = session.getRecords().find((x) => x.id === id);
    return r === undefined ? undefined : resolveParams(r, table);
  });
  if (isTubeGeometryError(g)) throw new Error(JSON.stringify(g));
  return g;
}

describe('tube() with a branch end', () => {
  it('captures the trunk as a record input, the station as a param and the trunk system', () => {
    const { session, api } = trunkRig();
    api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 2] }, ...BRANCH });
    const [trunk, branch] = tubes(session);
    expect(branch.inputs).toEqual({ fromTrunk: { kind: 'feature', id: trunk.id } });
    expect(trunk.inputs).toEqual({});
    expect(metaOf(branch).from).toEqual({ axis: [0, 0, 1], system: 'act',
      branch: { tube: 'trunk', at: expect.objectContaining({ evaluated: 100, unit: 'mm' }) } });
    expect(metaOf(branch).system).toBe('act');
  });

  it('the to end names its trunk under its own input key', () => {
    const { session, api } = trunkRig();
    api.tube('b', { from: { point: [100, 0, 150] }, to: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, od: 12.7, wall: 0.9, bendRadius: 40 });
    expect(tubes(session)[1].inputs).toEqual({ toTrunk: { kind: 'feature', id: tubes(session)[0].id } });
  });

  it('a param station reaches paramRefs and is read through the param table', () => {
    const { session, api } = trunkRig();
    const a = api.param('A', 120);
    api.tube('b', { from: { tube: 'trunk', at: a, axis: [0, 0, 1] }, to: { point: [a, 0, 150] }, od: 12.7, wall: 0.9, bendRadius: 40 });
    expect((tubes(session)[1].metadata as { paramRefs?: string[] }).paramRefs).toContain('A');
    const g = geometryOf(session, 1);
    expect(g.joints[0]).toMatchObject({ which: 'from', trunk: 'trunk', at: 120, center: [120, 0, 0], wall: [120, 0, 6.35],
      axis: [0, 0, 1], legDir: [1, 0, 0], trunkOd: 12.7, before: 120, after: 280, startsAtEnd: true, endsAtEnd: true });
    expect(g.path.points[0]).toEqual([120, 0, 6.35]);
    session.paramTable.set('A', 200);
    expect(geometryOf(session, 1).joints[0].wall).toEqual([200, 0, 6.35]);
  });

  it('the joint follows a param that moves the trunk', () => {
    const { session, api } = makeApi();
    const s = api.param('S', 0);
    api.tube('trunk', { from: { point: [s, 0, 0] }, to: { point: [s.add(400), 0, 0] }, od: 12.7, wall: 0.9, bendRadius: 40 });
    api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [s.add(100), 0, 150] }, od: 12.7, wall: 0.9, bendRadius: 40 });
    expect(geometryOf(session, 1).joints[0].center).toEqual([100, 0, 0]);
    session.paramTable.set('S', 25);
    expect(geometryOf(session, 1).joints[0].center).toEqual([125, 0, 0]);
  });

  it('an axis off square is squared for the joint and its angle kept', () => {
    const { session, api } = trunkRig();
    api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0.2, 0, 1] }, ...BRANCH });
    const j = geometryOf(session, 1).joints[0];
    expect(j.axis).toEqual([0, 0, 1]);
    expect(j.offSquareDeg).toBeCloseTo(11.3099, 3);
  });

  it.each([
    ['an unknown trunk', { tube: 'nope', at: 100, axis: [0, 0, 1] }, 'tube.branch.trunk-not-found'],
    ['an empty trunk name', { tube: '', at: 100, axis: [0, 0, 1] }, 'tube.end.invalid'],
    ['a station that is not a number', { tube: 'trunk', at: '100', axis: [0, 0, 1] }, 'tube.end.invalid'],
    ['a non-finite station', { tube: 'trunk', at: Number.NaN, axis: [0, 0, 1] }, 'tube.end.invalid'],
    ['no axis', { tube: 'trunk', at: 100 }, 'tube.end.invalid'],
    ['a zero axis', { tube: 'trunk', at: 100, axis: [0, 0, 0] }, 'tube.end.invalid'],
  ])('%s is an argument error', (_n, from, prefix) => {
    const { api } = trunkRig();
    expect(() => api.tube('b', { from: from as unknown as TubeOptions['from'], ...BRANCH })).toThrow(prefixRe(prefix));
  });

  it('the unknown-trunk error lists the tubes declared so far', () => {
    const { api } = trunkRig();
    expect(() => api.tube('b', { from: { tube: 'nope', at: 100, axis: [0, 0, 1] }, ...BRANCH }))
      .toThrow(/one of the tubes declared so far: 'trunk'/);
  });

  it('a tube cannot branch off itself', () => {
    const { api } = makeApi();
    expect(() => api.tube('b', { from: { tube: 'b', at: 100, axis: [0, 0, 1] }, ...BRANCH }))
      .toThrow(prefixRe('tube.branch.trunk-not-found'));
  });

  it('a system option that differs from the trunk is refused; the same one is fine', () => {
    const { session, api } = trunkRig();
    expect(() => api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, ...BRANCH, system: 'fuel' }))
      .toThrow(prefixRe('tube.branch.system-mismatch'));
    api.tube('c', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, ...BRANCH, system: 'act' });
    expect(metaOf(tubes(session)[1]).system).toBe('act');
  });

  it('a trunk with no system leaves the branch its own', () => {
    const { session, api } = makeApi();
    api.tube('trunk', { from: { point: [0, 0, 0] }, to: { point: [400, 0, 0] }, od: 12.7, wall: 0.9, bendRadius: 40 });
    api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, ...BRANCH, system: 'fuel' });
    expect(metaOf(tubes(session)[1]).system).toBe('fuel');
  });

  it('a branch still needs an od when its other end is not a port', () => {
    const { api } = trunkRig();
    expect(() => api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 150] }, wall: 0.9, bendRadius: 40 }))
      .toThrow(prefixRe('tube.od.required'));
  });

  it('a branch path too short for its bend fails at the call, measured from the trunk wall', () => {
    const { api } = trunkRig();
    expect(() => api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [200, 0, 30] }, via: [[100, 0, 30]],
      od: 12.7, wall: 0.9, bendRadius: 40 })).toThrow(prefixRe('tube.corner.unreachable'));
  });

  it('a station on no straight is left to the build: capture does not throw', () => {
    const { session, api } = trunkRig();
    api.tube('b', { from: { tube: 'trunk', at: 900, axis: [0, 0, 1] }, ...BRANCH });
    expect(tubes(session)).toHaveLength(2);
  });
});

describe('a branch record without a usable trunk', () => {
  it('lowers to a diagnostic and no shape, without throwing', () => {
    const { session, api } = trunkRig();
    api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, ...BRANCH });
    const diagnostics: CompilerDiagnostic[] = [];
    // No record table: the trunk cannot be found.
    const out = lowerTube({ diagnostics } as unknown as LowerContext, tubes(session)[1]);
    expect(out.done).toBe(true);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: 'feature.invalid-args', severity: 'error' });
    expect(diagnostics[0].message).toMatch(/^tube\.branch\.trunk-not-found: /);
    expect(diagnostics[0].hint.length).toBeGreaterThan(0);
  });

  it('a hand-made record that names itself as its trunk ends, it does not recurse for ever', () => {
    const { session, api } = trunkRig();
    api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, ...BRANCH });
    const b = tubes(session)[1];
    const loop = { ...b, inputs: { fromTrunk: { kind: 'feature', id: b.id } } } as FeatureRecord;
    expect(tubeGeometry(loop, () => loop)).toMatchObject({ kind: 'branch', reason: 'trunk-unavailable' });
  });
});

describe('a branch in the mesh construction closure', () => {
  it('a tube carried by an assembly does not hide the trunk it names', () => {
    const { session, api } = trunkRig();
    const b = api.tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, ...BRANCH });
    api.assembly('rig').part('b', b);
    const [trunk, branch] = tubes(session);
    const closure = computeConstructionClosure(session.getRecords());
    expect(closure.has(branch.id)).toBe(true);
    expect(closure.has(trunk.id)).toBe(false);
  });
});

describe('bend-table CSV joints', () => {
  const table = bendTableFromPath(PATH);

  it('a tube without joints gives the table it always gave', () => {
    expect(formatBendTableCsv('t', 10, 1, table, {})).toBe(formatBendTableCsv('t', 10, 1, table));
    expect(formatBendTableCsv('t', 10, 1, table)).not.toMatch(/branch|from_tube|to_tube/);
  });

  it('a trunk lists its branches after the bend rows', () => {
    const csv = formatBendTableCsv('t', 10, 1, table, { branches: [{ tube: 'b1', at: 30 }, { tube: 'b2', at: 200.5 }] });
    expect(csv.endsWith(`last_straight_mm,${table.lastStraight.toFixed(3)}\n\nbranch,at_mm\nb1,30.000\nb2,200.500\n`)).toBe(true);
  });

  it('a branch names its trunk and station in the header', () => {
    const lines = formatBendTableCsv('t', 10, 1, table, { from: { tube: 'trunk', at: 180 }, to: { tube: 'other', at: 12.5 } }).split('\n');
    expect(lines.slice(4, 9)).toEqual([
      `cut_length_mm,${table.cutLength.toFixed(3)}`, 'from_tube,trunk', 'from_at_mm,180.000', 'to_tube,other', 'to_at_mm,12.500']);
  });
});
