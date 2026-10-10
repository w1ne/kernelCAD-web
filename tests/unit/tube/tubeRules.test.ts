// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bend and straight rules on one tube path: radius, straights between bends
// and at the ends, bend angle, end leg on the port axis.

import { describe, it, expect } from 'vitest';
import { checkTubeRules, type TubeRuleFinding } from '../../../src/modeling/runtime/tube/tubeRules';
import { TUBE_SPEC_DEFAULTS, type TubeMetadata } from '../../../src/shared/intent/tubeRecord';
import { buildTubePath, type TubePath, type V3 } from '../../../src/shared/tube/tubePath';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

const spec = TUBE_SPEC_DEFAULTS;
const meta = (over: Partial<TubeMetadata> = {}): TubeMetadata =>
  ({ name: 't', points: [], from: {}, to: {}, ...over });
const path = (pts: V3[], r: number): TubePath => buildTubePath(pts, r) as TubePath;
const codes = (f: TubeRuleFinding[]): string[] => f.map((x) => x.code);
const elbow: V3[] = [[0, 0, 0], [100, 0, 0], [100, 100, 0]];

describe('checkTubeRules', () => {
  it('passes a legal tube', () => {
    expect(checkTubeRules({ name: 't', od: 10, spec, meta: meta(), path: path(elbow, 30) })).toEqual([]);
  });

  it('bend radius below factor x od', () => {
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta(), path: path(elbow, 25) });
    expect(codes(f)).toEqual(['tube.bend.radius-too-small']);
    expect(f[0].message).toBe(
      "tube.bend.radius-too-small: tube 't' bends at 25.00 mm; the rule needs 30.00 mm (3 x OD 10.00).");
    expect(f[0].hint).toBe(DIAGNOSTIC_REGISTRY['tube.bend.radius-too-small'].hintTemplate);
  });

  it('a lower factor in the spec allows the tighter bend', () => {
    expect(checkTubeRules({ name: 't', od: 10, spec: { ...spec, minBendRadiusFactor: 2.5 }, meta: meta(),
      path: path(elbow, 25) })).toEqual([]);
  });

  it('straight between bends below rule', () => {
    // middle leg 75 - 30 - 30 = 15 mm, rule 2 x 10 = 20 mm
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta(),
      path: path([[0, 0, 0], [100, 0, 0], [100, 75, 0], [200, 75, 0]], 30) });
    expect(codes(f)).toEqual(['tube.straight.between-bends-too-short']);
    expect(f[0].message).toMatch(/leg 1 .* 15\.00 mm .* 20\.00 mm/);
  });

  it('end straight uses the larger of the rule and the port value', () => {
    const p = path([[0, 0, 0], [60, 0, 0], [60, 100, 0]], 30);   // first straight 30 mm
    expect(codes(checkTubeRules({ name: 't', od: 10, spec, meta: meta(), path: p }))).toEqual([]);
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta({ from: { minStraight: 40 } }), path: p });
    expect(codes(f)).toEqual(['tube.straight.end-too-short']);
    expect(f[0].message).toBe(
      "tube.straight.end-too-short: tube 't' has 30.00 mm straight at its from end; the rule needs 40.00 mm.");
  });

  it('the to end is checked against its own port value', () => {
    const p = path([[0, 0, 0], [100, 0, 0], [100, 60, 0]], 30);   // last straight 30 mm
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta({ to: { minStraight: 31 } }), path: p });
    expect(f.map((x) => x.message)).toEqual([
      "tube.straight.end-too-short: tube 't' has 30.00 mm straight at its to end; the rule needs 31.00 mm."]);
  });

  it('a tube with no bends is exempt from the end-straight rule', () => {
    const p = path([[0, 0, 0], [10, 0, 0]], 30);
    expect(checkTubeRules({ name: 't', od: 10, spec, meta: meta({ from: { minStraight: 40 } }), path: p })).toEqual([]);
  });

  it('bend angle above the limit', () => {
    const f = checkTubeRules({ name: 't', od: 10, spec: { ...spec, maxBendAngle: 90 }, meta: meta(),
      path: path([[0, 0, 0], [100, 0, 0], [40, 80, 0]], 30) });
    expect(codes(f)).toEqual(['tube.bend.angle-exceeded']);
    expect(f[0].message).toBe("tube.bend.angle-exceeded: tube 't' bend 1 is 126.87 deg; the limit is 90.00 deg.");
  });

  it('a 90 degree bend passes a 90 degree limit', () => {
    expect(checkTubeRules({ name: 't', od: 10, spec: { ...spec, maxBendAngle: 90 }, meta: meta(),
      path: path(elbow, 30) })).toEqual([]);
  });

  it('end leg off the port axis names the nearest on-axis point', () => {
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta({ from: { axis: [0, 0, 1] } }),
      path: path([[0, 0, 0], [10, 0, 80], [100, 0, 80]], 30) });
    expect(codes(f)).toContain('tube.port.misaligned');
    const m = f.find((x) => x.code === 'tube.port.misaligned')!.message;
    expect(m).toContain("tube 't' leaves its from port 7.13 deg off the port axis");
    expect(m).toContain('[0.00, 0.00, 80.00]');
  });

  it('the to end compares the reversed end leg with the port axis', () => {
    const pts: V3[] = [[0, 0, 0], [100, 0, 0], [100, 100, 0]];
    expect(checkTubeRules({ name: 't', od: 10, spec, meta: meta({ to: { axis: [0, -1, 0] } }), path: path(pts, 30) }))
      .toEqual([]);
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta({ to: { axis: [0.6, -0.8, 0] } }), path: path(pts, 30) });
    expect(f.map((x) => x.message)).toEqual([
      "tube.port.misaligned: tube 't' leaves its to port 36.87 deg off the port axis; put the corner at [148.00, 36.00, 0.00]."]);
  });
});
