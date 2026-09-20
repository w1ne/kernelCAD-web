// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/faceBook.test.ts
//
// Characterisation of buildFaceBook before the complexity split: pins the
// band-body Z/-Z faces, their order, and the axis-aligned extrude side walls.

import { describe, expect, it } from 'vitest';
import { buildFaceBook, type BodyPlan } from '../../../src/agent/reconstruct/planPhases';
import { polygonRegion, type Region } from '../../../src/agent/reconstruct/faces';

const rect = (x0: number, y0: number, x1: number, y1: number): Region =>
  polygonRegion(Float64Array.from([x0, y0, x1, y0, x1, y1, x0, y1]));

const revolve: BodyPlan = { kind: 'revolve', steps: [] };

describe('buildFaceBook', () => {
  it('pins the band-body faces on both sides of every level', () => {
    const book = buildFaceBook(1, [[rect(0, 0, 80, 50)]], [0, 6], 0.01, revolve);
    expect(book.pieces.map((p) => [p.normal, p.level, p.area, p.cx, p.cy])).toEqual([
      ['-Z', 0, 4000, 40, 25],
      ['Z', 6, 4000, 40, 25],
    ]);
  });

  it('skips empty band sides and keeps levels with no face', () => {
    const book = buildFaceBook(2, [[rect(0, 0, 10, 10)], []], [0, 4, 8], 0.01, revolve);
    expect(book.pieces.map((p) => [p.normal, p.level, p.area])).toEqual([
      ['-Z', 0, 100],
      ['Z', 4, 100],
    ]);
  });

  it('adds one side wall per axis-aligned line of an extrude path loop', () => {
    const body: BodyPlan = {
      kind: 'extrude',
      blocks: [
        {
          z0: 0,
          z1: 6,
          hParam: 'height',
          outline: 'rectangle',
          rounds: 'none',
          loops: [
            {
              kind: 'path',
              prims: [
                { kind: 'line', a: [0, 0], b: [80, 0] },
                { kind: 'line', a: [80, 0], b: [80, 50] },
                { kind: 'line', a: [80, 50], b: [0, 50] },
                { kind: 'line', a: [0, 50], b: [0, 0] },
                { kind: 'line', a: [0, 0], b: [10, 10] },
                { kind: 'line', a: [5, 5], b: [5, 5] },
                { kind: 'arc', a: [10, 10], b: [20, 20], c: [15, 15], r: 5, ccw: true },
              ],
            },
            { kind: 'circle', cx: 40, cy: 25, r: 3 },
          ],
        },
      ],
    };
    const book = buildFaceBook(0, [], [0], 0.01, body);
    expect(book.pieces.map((p) => [p.normal, p.level, p.area, p.cx, p.cy])).toEqual([
      ['-Y', 0, 480, 40, 3],
      ['X', 80, 300, 25, 3],
      ['Y', 50, 480, 40, 3],
      ['-X', 0, 300, 25, 3],
    ]);
  });
});
