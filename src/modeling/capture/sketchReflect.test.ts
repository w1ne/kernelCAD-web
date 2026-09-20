// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketchReflect.test.ts
//
// Characterisation tests for `reflectSketchCommands` ahead of its complexity
// split. One command per discriminant kind pins the reflected coordinate /
// derivative / arc-sign fields for plain-number Params, the mirror-offset
// arithmetic, and the from/to swap on mirrored line entities.
import { describe, it, expect } from 'vitest';
import { reflectSketchCommands } from './sketchReflect';
import type { AxisSpec, Param } from '../../shared/intent/types';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

function p(value: number, unit: Param['unit'] = 'mm'): Param {
  return { expression: String(value), unit, evaluated: value };
}

const COMMANDS: SketchCommand[] = [
  { kind: 'moveTo', x: p(1), y: p(2) },
  { kind: 'threePointsArc', x: p(7), y: p(8), midX: p(9), midY: p(10) },
  { kind: 'sagittaArc', x: p(11), y: p(12), sagitta: p(13) },
  { kind: 'bulgeArc', x: p(14), y: p(15), bulge: p(16) },
  { kind: 'radiusArc', x: p(17), y: p(18), radius: p(19) },
  { kind: 'smoothSpline', x: p(20), y: p(21) },
  { kind: 'spline', points: [{ x: p(22), y: p(23) }, { x: p(24), y: p(25) }], tension: p(2, 'unitless') },
  { kind: 'nurbsSegment', controlPoints: [{ x: p(26), y: p(27) }, { x: p(28), y: p(29) }], degree: p(3, 'unitless') },
  {
    kind: 'hermiteG2_2d',
    ax: p(30), ay: p(31), atx: p(32), aty: p(33), acx: p(34), acy: p(35),
    bx: p(36), by: p(37), btx: p(38), bty: p(39), bcx: p(40), bcy: p(41),
  },
  { kind: 'hermiteG2_2d', ax: p(42), ay: p(43), atx: p(44), aty: p(45), bx: p(46), by: p(47), btx: p(48), bty: p(49) },
  { kind: 'tangentCircle', entities: [{ kind: 'line', x1: p(1), y1: p(2), x2: p(3), y2: p(4) }], near: { x: p(5), y: p(6) } },
  { kind: 'tangentLine', a: { kind: 'circle', cx: p(7), cy: p(8), r: p(9) }, b: { kind: 'circle', cx: p(10), cy: p(11), r: p(12) } },
  { kind: 'close' },
];

function reflect(axis: AxisSpec): SketchCommand[] {
  return reflectSketchCommands(COMMANDS, axis);
}

describe('reflectSketchCommands — axis x (mirror y only)', () => {
  const out = reflect('x');

  it('keeps x and negates y on point commands', () => {
    expect(out[0]).toMatchObject({ kind: 'moveTo', x: { expression: '1' }, y: { expression: '-2', evaluated: -2 } });
    expect(out[5]).toMatchObject({ kind: 'smoothSpline', x: { expression: '20' }, y: { expression: '-21' } });
  });

  it('reflects every arc kind, negating the sign-encoded direction', () => {
    expect(out[1]).toMatchObject({
      kind: 'threePointsArc',
      x: { expression: '7' },
      y: { expression: '-8' },
      midX: { expression: '9' },
      midY: { expression: '-10' },
    });
    expect(out[2]).toMatchObject({ kind: 'sagittaArc', x: { expression: '11' }, y: { expression: '-12' }, sagitta: { expression: '-13' } });
    expect(out[3]).toMatchObject({ kind: 'bulgeArc', x: { expression: '14' }, y: { expression: '-15' }, bulge: { expression: '-16' } });
    expect(out[4]).toMatchObject({ kind: 'radiusArc', x: { expression: '17' }, y: { expression: '-18' }, radius: { expression: '-19' } });
  });

  it('reflects spline waypoints and nurbs control points', () => {
    expect(out[6]).toMatchObject({
      kind: 'spline',
      points: [{ x: { expression: '22' }, y: { expression: '-23' } }, { x: { expression: '24' }, y: { expression: '-25' } }],
      tension: { expression: '2' },
    });
    expect(out[7]).toMatchObject({
      kind: 'nurbsSegment',
      controlPoints: [{ x: { expression: '26' }, y: { expression: '-27' } }, { x: { expression: '28' }, y: { expression: '-29' } }],
      degree: { expression: '3' },
    });
  });

  it('reflects hermite endpoints with the offset and derivatives as pure vectors', () => {
    expect(out[8]).toMatchObject({
      kind: 'hermiteG2_2d',
      ax: { expression: '30' },
      ay: { expression: '-31' },
      atx: { expression: '32' },
      aty: { expression: '-33' },
      acx: { expression: '34' },
      acy: { expression: '-35' },
      bx: { expression: '36' },
      by: { expression: '-37' },
      btx: { expression: '38' },
      bty: { expression: '-39' },
      bcx: { expression: '40' },
      bcy: { expression: '-41' },
    });
    const noCurvature = out[9] as Extract<SketchCommand, { kind: 'hermiteG2_2d' }>;
    expect(noCurvature.ax.expression).toBe('42');
    expect(noCurvature.ay.expression).toBe('-43');
    expect(noCurvature.acx).toBeUndefined();
    expect(noCurvature.acy).toBeUndefined();
    expect(noCurvature.bcx).toBeUndefined();
    expect(noCurvature.bcy).toBeUndefined();
  });

  it('reflects tangency entities including the mirrored-line from/to swap', () => {
    expect(out[10]).toMatchObject({
      kind: 'tangentCircle',
      entities: [{ kind: 'line', x1: { expression: '3' }, y1: { expression: '-4' }, x2: { expression: '1' }, y2: { expression: '-2' } }],
      near: { x: { expression: '5' }, y: { expression: '-6' } },
    });
    expect(out[11]).toMatchObject({
      kind: 'tangentLine',
      a: { kind: 'circle', cx: { expression: '7' }, cy: { expression: '-8' }, r: { expression: '9' } },
      b: { kind: 'circle', cx: { expression: '10' }, cy: { expression: '-11' }, r: { expression: '12' } },
    });
  });

  it('passes close through unchanged', () => {
    expect(out[12]).toEqual({ kind: 'close' });
  });
});

describe('reflectSketchCommands — axis y (mirror x only)', () => {
  const out = reflect('y');

  it('negates x and keeps y on point commands', () => {
    expect(out[0]).toMatchObject({ kind: 'moveTo', x: { expression: '-1' }, y: { expression: '2' } });
  });

  it('negates derivative vectors and keeps the arc-sign flip', () => {
    expect(out[8]).toMatchObject({ kind: 'hermiteG2_2d', atx: { expression: '-32' }, aty: { expression: '33' } });
    expect(out[2]).toMatchObject({ kind: 'sagittaArc', sagitta: { expression: '-13' } });
  });

  it('reflects tangency entities across y', () => {
    expect(out[10]).toMatchObject({
      kind: 'tangentCircle',
      entities: [{ kind: 'line', x1: { expression: '-3' }, y1: { expression: '4' }, x2: { expression: '-1' }, y2: { expression: '2' } }],
    });
  });
});

describe('reflectSketchCommands — y axis with offset', () => {
  const out = reflect({ axis: 'y', offset: 5 });

  it("mirrors x around the offset (x' = 2*offset - x)", () => {
    expect(out[0]).toMatchObject({ kind: 'moveTo', x: { expression: '9' }, y: { expression: '2' } });
    expect(out[1]).toMatchObject({ kind: 'threePointsArc', x: { expression: '3' }, midX: { expression: '1' } });
    expect(out[4]).toMatchObject({ kind: 'radiusArc', x: { expression: '-7' }, radius: { expression: '-19' } });
  });

  it('applies the offset to hermite endpoints but not to derivative vectors', () => {
    expect(out[8]).toMatchObject({
      kind: 'hermiteG2_2d',
      ax: { expression: '-20' },
      atx: { expression: '-32' },
      bx: { expression: '-26' },
    });
  });

  it('applies the offset to tangency circle entity coordinates', () => {
    expect(out[11]).toMatchObject({
      kind: 'tangentLine',
      a: { kind: 'circle', cx: { expression: '3' } },
      b: { kind: 'circle', cx: { expression: '0' } },
    });
  });
});
