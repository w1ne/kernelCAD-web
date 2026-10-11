// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bend and straight rules on one tube path: radius, straights between bends
// and at the ends, bend angle, end leg on the port axis.

import { describe, it, expect } from 'vitest';
import {
  checkTubeRules, effectiveRules, endStraightNeed, resolveTubeSpec, type TubeRuleFinding, type TubeRuleSpec,
} from '../../../src/modeling/runtime/tube/tubeRules';
import { TUBE_SPEC_DEFAULTS, type TubeMetadata } from '../../../src/shared/intent/tubeRecord';
import { buildTubePath, type TubePath, type V3 } from '../../../src/shared/tube/tubePath';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';
import { ParamTable } from '../../../src/shared/runtime/paramTable';

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

  it('a tube with no bends is exempt from the bend-radius rule', () => {
    const straight = path([[0, 0, 0], [200, 0, 0]], 12);
    expect(checkTubeRules({ name: 't', od: 10, spec, meta: meta(), path: straight })).toEqual([]);
    // Collinear via corners are dropped: still no bend.
    const collinear = path([[0, 0, 0], [100, 0, 0], [200, 0, 0]], 12);
    expect(checkTubeRules({ name: 't', od: 10, spec, meta: meta(), path: collinear })).toEqual([]);
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

  it('a corner behind the port is sent in front of it, at the end-straight need', () => {
    const f = checkTubeRules({ name: 't', od: 10, spec, meta: meta({ from: { axis: [0, 0, 1] } }),
      path: path([[0, 0, 0], [0, 0, -80], [100, 0, -80]], 30) });
    const m = f.find((x) => x.code === 'tube.port.misaligned')!.message;
    expect(m).toBe("tube.port.misaligned: tube 't' leaves its from port 180.00 deg off the port axis; put the corner at [0.00, 0.00, 25.00].");
    // A port that asks for a longer straight moves the point out with it.
    const g = checkTubeRules({ name: 't', od: 10, spec, meta: meta({ from: { axis: [0, 0, 1], minStraight: 40 } }),
      path: path([[0, 0, 0], [0, 0, -80], [100, 0, -80]], 30) });
    expect(g.find((x) => x.code === 'tube.port.misaligned')!.message).toContain('put the corner at [0.00, 0.00, 40.00].');
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

describe('per-system rules', () => {
  /** One 1.5 x OD factor for the large hot-gas duct; every other system keeps 3 x OD. */
  const bySystem: TubeRuleSpec = { ...spec, systems: { 'hot-gas': { minBendRadiusFactor: 1.5, minStraightAtEnd: 1 } } };
  const duct: V3[] = [[0, 0, 0], [600, 0, 0], [600, 600, 0]];

  it('effectiveRules overlays the system entry on the top level', () => {
    expect(effectiveRules(bySystem, 'hot-gas')).toEqual({
      minBendRadiusFactor: 1.5, minStraightBetweenBends: 2, minStraightAtEnd: 1, maxBendAngle: 180,
      system: 'hot-gas', overridden: ['minBendRadiusFactor', 'minStraightAtEnd'] });
    const plain = { minBendRadiusFactor: 3, minStraightBetweenBends: 2, minStraightAtEnd: 2.5, maxBendAngle: 180, overridden: [] };
    expect(effectiveRules(bySystem, 'fuel')).toEqual(plain);
    expect(effectiveRules(bySystem, undefined)).toEqual(plain);
    expect(effectiveRules(spec, 'hot-gas')).toEqual(plain);
  });

  it('a system name that is an Object.prototype key is not an override', () => {
    expect(effectiveRules(bySystem, 'constructor').overridden).toEqual([]);
    expect(effectiveRules(bySystem, 'toString').minBendRadiusFactor).toBe(3);
  });

  it('a large duct in the overridden system passes at 1.5 x OD while a small fuel line at 1.5 x OD fails', () => {
    expect(checkTubeRules({ name: 'duct', od: 114.3, spec: bySystem, meta: meta({ system: 'hot-gas' }),
      path: path(duct, 171.45) })).toEqual([]);
    const f = checkTubeRules({ name: 'sense', od: 6.35, spec: bySystem, meta: meta({ system: 'fuel' }),
      path: path(elbow, 9.525) });
    expect(f.map((x) => x.message)).toEqual([
      "tube.bend.radius-too-small: tube 'sense' bends at 9.53 mm; the rule needs 19.05 mm (3 x OD 6.35)."]);
  });

  it('the message names the override value and its system', () => {
    const f = checkTubeRules({ name: 'duct', od: 114.3, spec: bySystem, meta: meta({ system: 'hot-gas' }),
      path: path(duct, 150) });
    expect(f.map((x) => x.message)).toEqual([
      "tube.bend.radius-too-small: tube 'duct' bends at 150.00 mm; the rule needs 171.45 mm " +
      "(1.5 x OD 114.30, system 'hot-gas')."]);
  });

  it('a tube whose system has no override gets the same findings as with no systems at all', () => {
    const cases: Array<{ pts: V3[]; r: number; m: TubeMetadata }> = [
      { pts: elbow, r: 25, m: meta({ system: 'fuel' }) },
      { pts: [[0, 0, 0], [100, 0, 0], [100, 75, 0], [200, 75, 0]], r: 30, m: meta({ system: 'fuel' }) },
      { pts: [[0, 0, 0], [60, 0, 0], [60, 100, 0]], r: 30, m: meta({ system: 'fuel', from: { minStraight: 40 } }) },
      { pts: [[0, 0, 0], [0, 0, -80], [100, 0, -80]], r: 30, m: meta({ from: { axis: [0, 0, 1] } }) },
    ];
    for (const c of cases) {
      const before = checkTubeRules({ name: 't', od: 10, spec, meta: c.m, path: path(c.pts, c.r) });
      expect(before.length).toBeGreaterThan(0);
      expect(checkTubeRules({ name: 't', od: 10, spec: bySystem, meta: c.m, path: path(c.pts, c.r) })).toEqual(before);
    }
  });

  it('the end-straight override applies to the end rule and to the misaligned fix point', () => {
    const p = path([[0, 0, 0], [45, 0, 0], [45, 100, 0]], 30);   // first straight 15 mm; 2.5 x OD is 25, 1 x OD is 10
    expect(codes(checkTubeRules({ name: 't', od: 10, spec: bySystem, meta: meta({ system: 'fuel' }), path: p })))
      .toEqual(['tube.straight.end-too-short']);
    expect(checkTubeRules({ name: 't', od: 10, spec: bySystem, meta: meta({ system: 'hot-gas' }), path: p })).toEqual([]);
    expect(endStraightNeed(10, {}, effectiveRules(bySystem, 'hot-gas'))).toBe(10);
    expect(endStraightNeed(10, { minStraight: 40 }, effectiveRules(bySystem, 'hot-gas'))).toBe(40);
    const f = checkTubeRules({ name: 't', od: 10, spec: bySystem, meta: meta({ system: 'hot-gas', from: { axis: [0, 0, 1] } }),
      path: path([[0, 0, 0], [0, 0, -80], [100, 0, -80]], 30) });
    expect(f.find((x) => x.code === 'tube.port.misaligned')!.message).toContain('put the corner at [0.00, 0.00, 10.00].');
  });

  it('straight and angle messages name the override', () => {
    const strict: TubeRuleSpec = { ...spec,
      systems: { oil: { minStraightBetweenBends: 4, minStraightAtEnd: 5, maxBendAngle: 90 } } };
    const between = checkTubeRules({ name: 't', od: 10, spec: strict, meta: meta({ system: 'oil' }),
      path: path([[0, 0, 0], [100, 0, 0], [100, 90, 0], [200, 90, 0]], 30) });   // middle straight 30 mm, rule 40
    expect(between.map((x) => x.message)).toEqual([
      "tube.straight.between-bends-too-short: tube 't' leg 1 has 30.00 mm straight between bends; " +
      "the rule needs 40.00 mm (4 x OD 10.00, system 'oil')."]);
    const end = checkTubeRules({ name: 't', od: 10, spec: strict, meta: meta({ system: 'oil' }),
      path: path([[0, 0, 0], [70, 0, 0], [70, 200, 0]], 30) });   // first straight 40 mm, rule 50
    expect(end.map((x) => x.message)).toEqual([
      "tube.straight.end-too-short: tube 't' has 40.00 mm straight at its from end; " +
      "the rule needs 50.00 mm (5 x OD 10.00, system 'oil')."]);
    // The port's own minimum is longer than the override: the message is the port's, with no system.
    const port = checkTubeRules({ name: 't', od: 10, spec: strict, meta: meta({ system: 'oil', from: { minStraight: 60 } }),
      path: path([[0, 0, 0], [70, 0, 0], [70, 200, 0]], 30) });
    expect(port.map((x) => x.message)).toEqual([
      "tube.straight.end-too-short: tube 't' has 40.00 mm straight at its from end; the rule needs 60.00 mm."]);
    const angle = checkTubeRules({ name: 't', od: 10, spec: strict, meta: meta({ system: 'oil' }),
      path: path([[0, 0, 0], [200, 0, 0], [80, 160, 0]], 30) });
    expect(angle.map((x) => x.message)).toEqual([
      "tube.bend.angle-exceeded: tube 't' bend 1 is 126.87 deg; the limit is 90.00 deg (system 'oil')."]);
  });
});

describe('resolveTubeSpec', () => {
  const num = (v: number, unit = 'unitless') => ({ expression: String(v), unit, evaluated: v }) as never;

  it('reads override params through the table', () => {
    const table = new ParamTable();
    table.declare('K', 'number', 1.5);
    const r = resolveTubeSpec({ ...spec, virtual: true, clearance: { default: 6, pairs: [] },
      systems: { 'hot-gas': { minBendRadiusFactor: { expression: '{$param:K}', unit: 'unitless', evaluated: 0, paramRef: 'K' } as never } } }, table);
    expect(r.invalid).toEqual([]);
    expect(r.spec.systems).toEqual({ 'hot-gas': { minBendRadiusFactor: 1.5 } });
  });

  it('drops an override that resolves to a number the rule cannot be, and reports it', () => {
    const r = resolveTubeSpec({ ...spec, virtual: true, clearance: { default: 6, pairs: [] },
      systems: {
        'hot-gas': { minBendRadiusFactor: num(0), minStraightAtEnd: num(1) },
        oil: { minStraightBetweenBends: num(Number.NaN), maxBendAngle: num(200, 'deg') },
        fuel: { minStraightAtEnd: num(-2), maxBendAngle: num(180, 'deg') },
      } }, new ParamTable());
    expect(r.invalid).toEqual([
      { system: 'hot-gas', key: 'minBendRadiusFactor', value: 0, applied: 3 },
      { system: 'oil', key: 'minStraightBetweenBends', value: Number.NaN, applied: 2 },
      { system: 'oil', key: 'maxBendAngle', value: 200, applied: 180 },
      { system: 'fuel', key: 'minStraightAtEnd', value: -2, applied: 2.5 },
    ]);
    expect(r.spec.systems).toEqual({ 'hot-gas': { minStraightAtEnd: 1 }, oil: {}, fuel: { maxBendAngle: 180 } });
    expect(effectiveRules(r.spec, 'hot-gas')).toMatchObject({ minBendRadiusFactor: 3, minStraightAtEnd: 1 });
  });
});

