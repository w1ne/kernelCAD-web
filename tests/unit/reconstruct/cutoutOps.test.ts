// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/cutoutOps.test.ts
//
// Characterisation of emitCutoutOps before the complexity split: pins the
// emitted cutout op, the boolean-subtraction fallbacks (with their exact
// messages) and the face-book updates for a square inner-loop run.

import { describe, expect, it } from 'vitest';
import { emitCutoutOps } from '../../../src/agent/reconstruct/planPhases/ops';
import { FaceBook, polygonRegion } from '../../../src/agent/reconstruct/faces';
import type { FittedLoop, LineGeom } from '../../../src/agent/reconstruct/profileFit';
import type { V2 } from '../../../src/agent/reconstruct/geom';
import type { InnerRef } from '../../../src/agent/reconstruct/planPhases/runs';
import type { Op } from '../../../src/agent/reconstruct/planPhases/shared';

const SIZE = 10;
const POLY = Float64Array.from([0, 0, SIZE, 0, SIZE, SIZE, 0, SIZE]);

function squareLoop(): Extract<FittedLoop, { kind: 'path' }> {
  const line = (px: number, py: number, dx: number, dy: number): LineGeom => ({ kind: 'line', px, py, dx, dy });
  return {
    kind: 'path',
    hole: true,
    points: POLY,
    segments: [
      { geom: line(0, 0, SIZE, 0), first: 0, last: 1 },
      { geom: line(SIZE, 0, 0, SIZE), first: 1, last: 2 },
      { geom: line(SIZE, SIZE, -SIZE, 0), first: 2, last: 3 },
      { geom: line(0, SIZE, 0, -SIZE), first: 3, last: 0 },
    ],
  };
}

function innerRef(band: number): InnerRef {
  return { band, loop: squareLoop(), poly: POLY, area: SIZE * SIZE, cx: SIZE / 2, cy: SIZE / 2, samples: [[SIZE / 2, SIZE / 2]] };
}

function runCutouts(
  runs: InnerRef[][],
  nb: number,
  levels: number[],
  allAir: (bi: number, pts: V2[]) => boolean,
  book: FaceBook,
): { ops: Op[]; remainder: Op[]; notRepresented: string[] } {
  const ops: Op[] = [];
  const notRepresented: string[] = [];
  const remainder = emitCutoutOps(
    runs,
    nb,
    levels,
    [0, 9.9, 19.9, 29.8],
    allAir,
    book,
    0.05,
    (name) => name,
    () => ({ grid: 0.5 }),
    notRepresented,
    ops,
  );
  return { ops, remainder, notRepresented };
}

const squareRegion = polygonRegion(POLY);

describe('emitCutoutOps characterisation', () => {
  it('emits a through cutout and removes the entry and exit moments', () => {
    const book = new FaceBook(0.05);
    book.addDifference('Z', 10, [squareRegion], []);
    book.addDifference('-Z', 0, [squareRegion], []);

    const { ops, remainder, notRepresented } = runCutouts([[innerRef(0)]], 1, [0, 10], () => true, book);

    expect(ops).toEqual([
      {
        kind: 'cutout',
        name: 'pocket1',
        face: { byNormal: 'Z', level: 10 },
        prims: [
          { kind: 'line', a: [-5, -5], b: [5, -5] },
          { kind: 'line', a: [5, -5], b: [5, 5] },
          { kind: 'line', a: [5, 5], b: [-5, 5] },
          { kind: 'line', a: [-5, 5], b: [-5, -5] },
        ],
        depth: 10,
        depthParam: 'pocket1Depth',
        at: [5, 5, 10],
      },
    ]);
    expect(remainder).toEqual([]);
    expect(notRepresented).toEqual([]);
    expect(book.pieces.map((p) => [p.normal, p.level, p.area])).toEqual([
      ['Z', 10, 0],
      ['-Z', 0, 0],
    ]);
  });

  it('falls back to a void prism when the opening is covered by material', () => {
    const book = new FaceBook(0.05);
    const { ops, remainder, notRepresented } = runCutouts([[innerRef(1)]], 3, [0, 10, 20, 30], () => false, book);

    expect(ops).toEqual([]);
    expect(notRepresented).toEqual([
      'inner loop at (5, 5): its opening is covered by material, so no face-based cutout reaches it; subtracted as a boolean.',
    ]);
    expect(remainder).toHaveLength(1);
    expect(remainder[0]).toMatchObject({ kind: 'subtractPrism', name: 'void1', z0: 10, length: 10 });
  });

  it('falls back to a void prism when no planar entry face is found', () => {
    const { ops, remainder, notRepresented } = runCutouts([[innerRef(0)]], 1, [0, 10], () => true, new FaceBook(0.05));

    expect(ops).toEqual([]);
    expect(notRepresented).toEqual([
      'pocket at (5, 5): no planar entry face found; subtracted as a boolean.',
    ]);
    expect(remainder).toHaveLength(1);
    expect(remainder[0]).toMatchObject({ kind: 'subtractPrism', name: 'void1', z0: 0, length: 10 });
  });

  it('emits a one-sided cutout and books the created floor when the exit is not open', () => {
    const book = new FaceBook(0.05);
    book.addDifference('-Z', 10, [squareRegion], []);

    const { ops, remainder, notRepresented } = runCutouts([[innerRef(1)]], 3, [0, 10, 20, 30], (bi) => bi === 0, book);

    expect(remainder).toEqual([]);
    expect(notRepresented).toEqual([]);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      kind: 'cutout',
      name: 'pocket1',
      face: { byNormal: '-Z', level: 10 },
      depth: 10,
      depthParam: 'pocket1Depth',
      at: [5, 5, 10],
    });
    expect(book.pieces.map((p) => [p.normal, p.level, p.area])).toEqual([
      ['-Z', 10, 0],
      ['-Z', 20, 100],
    ]);
  });
});
