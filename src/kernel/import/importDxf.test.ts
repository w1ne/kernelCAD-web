// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importDxf.test.ts
//
// Parser-level tests for `importDxfText`. Fixtures are built inline from
// group-code pairs — a DXF is two lines per pair, so a helper is enough and
// no binary fixture files are needed.

import { describe, it, expect } from 'vitest';
import { importDxfText, DxfParseError } from './importDxf';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

/** Build DXF text from (group code, value) pairs. */
function dxf(...pairs: Array<[number, string | number]>): string {
  return pairs.map(([c, v]) => `${c}\n${v}`).join('\n') + '\n';
}

function entities(...pairs: Array<[number, string | number]>): string {
  return dxf([0, 'SECTION'], [2, 'ENTITIES'], ...pairs, [0, 'ENDSEC'], [0, 'EOF']);
}

function header(...pairs: Array<[number, string | number]>): Array<[number, string | number]> {
  return [[0, 'SECTION'], [2, 'HEADER'], ...pairs, [0, 'ENDSEC']];
}

/** `[x, y]` of every positional command, for coordinate assertions. */
function points(commands: readonly SketchCommand[]): Array<[number, number]> {
  return commands
    .filter((c): c is Extract<SketchCommand, { x: unknown; y: unknown }> => 'x' in c && 'y' in c)
    .map(c => [c.x.evaluated, c.y.evaluated]);
}

const SQUARE_10x5: Array<[number, string | number]> = [
  [0, 'LWPOLYLINE'], [90, 4], [70, 1],
  [10, 0], [20, 0],
  [10, 10], [20, 0],
  [10, 10], [20, 5],
  [10, 0], [20, 5],
];

describe('importDxfText — entities', () => {
  it('reads a closed LWPOLYLINE as one region with exact area', () => {
    const r = importDxfText(entities(...SQUARE_10x5));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(50, 9);
    expect(r.regions[0].segmentCount).toBe(4);
    expect(r.regions[0].commands.map(c => c.kind)).toEqual([
      'moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'close',
    ]);
  });

  it('reads a CIRCLE as two exact semicircular bulge arcs', () => {
    const r = importDxfText(entities([0, 'CIRCLE'], [10, 0], [20, 0], [40, 10]));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].commands.map(c => c.kind)).toEqual([
      'moveTo', 'bulgeArc', 'bulgeArc', 'close',
    ]);
    // tan(180° / 4) = 1 is the exact semicircle; anything else is not a circle.
    for (const c of r.regions[0].commands) {
      if (c.kind === 'bulgeArc') expect(c.bulge.evaluated).toBeCloseTo(1, 12);
    }
    expect(r.regions[0].areaMm2).toBeCloseTo(Math.PI * 100, 9);
  });

  it('maps the LWPOLYLINE BULGE field straight through, sign included', () => {
    // Bulge 0.5 on the bottom edge of a CCW unit-ish square. A DXF bulge is
    // tan(includedAngle / 4) and positive means counter-clockwise, i.e. the
    // arc bows AWAY from the interior here and ADDS area. A sign error would
    // subtract the same 17.47 mm² instead.
    const r = importDxfText(entities(
      [0, 'LWPOLYLINE'], [90, 4], [70, 1],
      [10, 0], [20, 0], [42, 0.5],
      [10, 10], [20, 0],
      [10, 10], [20, 10],
      [10, 0], [20, 10],
    ));
    const theta = 4 * Math.atan(0.5);
    const radius = 5 / Math.sin(theta / 2);
    const segmentArea = (radius * radius / 2) * (theta - Math.sin(theta));
    expect(segmentArea).toBeCloseTo(17.472, 3);
    expect(r.regions[0].areaMm2).toBeCloseTo(100 + segmentArea, 9);

    const arcs = r.regions[0].commands.filter(c => c.kind === 'bulgeArc');
    expect(arcs).toHaveLength(1);
  });

  it('reads an ARC and keeps its sweep exact', () => {
    // Quarter arc from (10,0) to (0,10) plus two lines back through origin.
    const r = importDxfText(entities(
      [0, 'ARC'], [10, 0], [20, 0], [40, 10], [50, 0], [51, 90],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 4, 9);
  });

  it('reads the pre-R13 POLYLINE/VERTEX/SEQEND form', () => {
    const r = importDxfText(entities(
      [0, 'POLYLINE'], [70, 1],
      [0, 'VERTEX'], [10, 0], [20, 0],
      [0, 'VERTEX'], [10, 4], [20, 0],
      [0, 'VERTEX'], [10, 4], [20, 3],
      [0, 'VERTEX'], [10, 0], [20, 3],
      [0, 'SEQEND'],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(12, 9);
  });
});

describe('importDxfText — messy real-world input', () => {
  it('chains loose LINE entities in arbitrary order and direction', () => {
    // Deliberately shuffled, and two of the four are written backwards.
    const r = importDxfText(entities(
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(100, 9);
  });

  it('drops a duplicated segment and its reversed twin, and reports the count', () => {
    const r = importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],   // exact duplicate
      [0, 'LINE'], [10, 10], [20, 0], [11, 0], [21, 0],   // reversed duplicate
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
    ));
    expect(r.duplicatesDropped).toBe(2);
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(100, 9);
  });

  it('closes a sub-tolerance gap and reports it rather than pretending it was closed', () => {
    // The last line stops 0.0002 mm short of the start.
    const r = importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0.0002], [21, 0],
    ));
    expect(r.gapsClosed).toBe(1);
    const pts = points(r.regions[0].commands);
    // The snapped endpoint lands exactly on the first point, not 0.0002 away.
    expect(pts[pts.length - 1]).toEqual(pts[0]);
  });

  it('returns disjoint regions ordered largest-area first', () => {
    const r = importDxfText(entities(
      [0, 'CIRCLE'], [10, 0], [20, 0], [40, 2],
      ...SQUARE_10x5,
      [0, 'CIRCLE'], [10, 40], [20, 40], [40, 6],
    ));
    expect(r.regions.map(x => Math.round(x.areaMm2))).toEqual([113, 50, 13]);
  });

  it('reports annotation entities as ignored instead of dropping them silently', () => {
    const r = importDxfText(entities(
      [0, 'TEXT'], [1, 'PART A'], [10, 0], [20, 0],
      [0, 'DIMENSION'], [10, 0], [20, 0],
      ...SQUARE_10x5,
    ));
    expect(r.ignoredEntities).toHaveLength(2);
    expect(r.ignoredEntities[0]).toMatch(/^TEXT \(line \d+\)$/);
    expect(r.regions).toHaveLength(1);
  });
});

describe('importDxfText — units', () => {
  it('scales by $INSUNITS and says so', () => {
    const text = dxf(...header([9, '$INSUNITS'], [70, 1])) +
      entities(...SQUARE_10x5);
    const r = importDxfText(text);
    expect(r.unitScale).toBeCloseTo(25.4, 12);
    expect(r.unitSource).toBe('$INSUNITS=1 (in)');
    expect(r.regions[0].areaMm2).toBeCloseTo(50 * 25.4 * 25.4, 6);
  });

  it('assumes mm when $INSUNITS is absent, and reports the assumption', () => {
    const r = importDxfText(entities(...SQUARE_10x5));
    expect(r.unitScale).toBe(1);
    expect(r.unitSource).toBe('assumed mm ($INSUNITS absent or 0/Unitless)');
  });

  it('assumes mm when $INSUNITS is 0 (Unitless)', () => {
    const r = importDxfText(dxf(...header([9, '$INSUNITS'], [70, 0])) + entities(...SQUARE_10x5));
    expect(r.unitSource).toMatch(/assumed mm/);
  });

  it('lets opts.units override a header that lies', () => {
    const text = dxf(...header([9, '$INSUNITS'], [70, 4])) + entities(...SQUARE_10x5);
    const r = importDxfText(text, { units: 'in' });
    expect(r.unitSource).toBe('opts.units=in');
    expect(r.regions[0].areaMm2).toBeCloseTo(50 * 25.4 * 25.4, 6);
  });

  it('refuses a $INSUNITS code it does not map, naming the line', () => {
    const text = dxf(...header([9, '$INSUNITS'], [70, 19])) + entities(...SQUARE_10x5);
    expect(() => importDxfText(text)).toThrowError(
      /\$INSUNITS=19 is not a length unit kernelCAD maps/,
    );
    expect(() => importDxfText(text)).toThrowError(/opts\.units/);
  });
});

describe('importDxfText — failure paths name what went wrong', () => {
  function failure(fn: () => unknown): DxfParseError {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(DxfParseError);
      return e as DxfParseError;
    }
    throw new Error('expected importDxfText to throw');
  }

  it('empty file', () => {
    const e = failure(() => importDxfText('   \n  '));
    expect(e.reason).toBe('empty');
    expect(e.message).toBe('DXF payload is empty.');
  });

  it('not a DXF at all', () => {
    const e = failure(() => importDxfText('hello\nworld\n'));
    expect(e.reason).toBe('not-dxf');
    expect(e.message).toMatch(/line 1: expected a DXF group code \(an integer\) but found 'hello'/);
  });

  it('no ENTITIES section', () => {
    const e = failure(() => importDxfText(dxf(...header([9, '$INSUNITS'], [70, 4]), [0, 'EOF'])));
    expect(e.reason).toBe('no-entities');
    expect(e.message).toMatch(/no ENTITIES section/);
  });

  it('SPLINE — refused, with the reason it cannot be represented', () => {
    const e = failure(() => importDxfText(entities([0, 'SPLINE'], [71, 3], [10, 0], [20, 0])));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^SPLINE at line \d+:/);
    expect(e.message).toMatch(/no 2D NURBS segment/);
    expect(e.message).toMatch(/will not be silently approximated/);
  });

  it('ELLIPSE and INSERT — refused rather than dropped', () => {
    expect(failure(() => importDxfText(entities([0, 'ELLIPSE'], [10, 0], [20, 0]))).message)
      .toMatch(/^ELLIPSE at line \d+: an elliptical arc has no exact form/);
    expect(failure(() => importDxfText(entities([0, 'INSERT'], [2, 'BLK']))).message)
      .toMatch(/INSERT \(block reference\) at line \d+:.*Explode blocks/s);
  });

  it('an unknown entity is refused, not skipped', () => {
    const e = failure(() => importDxfText(entities([0, 'HELIX'], [10, 0], [20, 0])));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^HELIX at line \d+: unsupported DXF entity/);
    expect(e.message).toMatch(/leaves a hole in the profile/);
  });

  it('malformed entity — missing required group code, named with its line', () => {
    const e = failure(() => importDxfText(entities([0, 'LINE'], [10, 0], [20, 0], [11, 10])));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/^LINE at line \d+: required group code 21 is missing\.$/);
  });

  it('malformed entity — non-numeric coordinate, named with its line', () => {
    const e = failure(() =>
      importDxfText(entities([0, 'CIRCLE'], [10, 0], [20, 0], [40, 'ten'])));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/CIRCLE at line \d+: group code 40 must be a finite number, got 'ten'/);
  });

  it('an open contour is reported with both dangling ends, never auto-closed', () => {
    // Three sides of a square: the chain dead-ends 10 mm from its own start.
    const e = failure(() => importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
    )));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/open contour/);
    expect(e.message).toMatch(/dead-ends at \(0\.0000, 10\.0000\) mm/);
    expect(e.message).toMatch(/10\.0 mm from its own start/);
    expect(e.message).toMatch(/past the 0\.00100 mm tolerance/);
  });

  it('a loose tolerance closes the gap the strict default rejects', () => {
    const gappy = entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0.05], [21, 0],
    );
    expect(() => importDxfText(gappy)).toThrowError(/open contour/);
    const r = importDxfText(gappy, { tolerance: 0.1 });
    expect(r.gapsClosed).toBe(1);
    expect(r.regions).toHaveLength(1);
  });

  it('an ambiguous junction is reported instead of guessed', () => {
    // A closed square plus a stray spur leaving one of its corners.
    const e = failure(() => importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 20], [21, -5],
    )));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/ambiguous junction at \(10\.0000, 0\.0000\) mm/);
    expect(e.message).toMatch(/3 segments meet there/);
  });

  it('a file with only annotation entities fails rather than returning nothing', () => {
    const e = failure(() => importDxfText(entities([0, 'TEXT'], [1, 'hi'], [10, 0], [20, 0])));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/no usable 2D geometry/);
  });
});
