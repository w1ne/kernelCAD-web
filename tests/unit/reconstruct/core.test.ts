// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/core.test.ts
//
// OCCT-free pieces of mesh → feature reconstruction, each against an answer
// known in closed form.

import { describe, expect, it } from 'vitest';
import { fitCircle2D, rotationToAxisAngle, symmetricEigen3 } from '../../../src/agent/reconstruct/geom';
import { cleanMesh } from '../../../src/agent/reconstruct/meshClean';
import { segmentMesh } from '../../../src/agent/reconstruct/segment';
import { chooseFrame } from '../../../src/agent/reconstruct/frame';
import { sliceAtZ } from '../../../src/agent/reconstruct/section';
import {
  fitLoop,
  loopPrimitives,
  primitivesMoments,
  snapLoop,
  snapValue,
} from '../../../src/agent/reconstruct/profileFit';
import { classifyFidelity, pointInsideMesh, volumeIoU } from '../../../src/agent/reconstruct/fidelity';
import { FaceBook } from '../../../src/agent/reconstruct/faces';
import { _internal } from '../../../src/agent/reconstruct/plan';
import { circleToPolygon } from '../../../src/agent/reconstruct/profileFit';
import { boxSoup, blobSoup } from './testMeshes';

function circlePoints(cx: number, cy: number, r: number, n: number, noise = 0): Float64Array {
  const out = new Float64Array(n * 2);
  let s = 11;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    const rr = r + noise * rand();
    out[2 * i] = cx + rr * Math.cos(t);
    out[2 * i + 1] = cy + rr * Math.sin(t);
  }
  return out;
}

/** CCW loop: rectangle w×h with every corner rounded by r, sampled densely on the arcs. */
function roundedRectLoop(w: number, h: number, r: number, perArc = 24): Float64Array {
  const pts: number[] = [];
  const corners: Array<[number, number, number]> = [
    [w - r, r, -Math.PI / 2],
    [w - r, h - r, 0],
    [r, h - r, Math.PI / 2],
    [r, r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= perArc; k++) {
      const t = a0 + ((Math.PI / 2) * k) / perArc;
      pts.push(cx + r * Math.cos(t), cy + r * Math.sin(t));
    }
  }
  return Float64Array.from(pts);
}

describe('geometry fits', () => {
  it('recovers a circle from noisy samples within the noise amplitude', () => {
    const fit = fitCircle2D(circlePoints(12.5, -3, 2.75, 200, 0.01))!;
    expect(fit.cx).toBeCloseTo(12.5, 2);
    expect(fit.cy).toBeCloseTo(-3, 2);
    expect(Math.abs(fit.r - 2.75)).toBeLessThan(0.003);
    expect(fit.maxResidual).toBeLessThanOrEqual(0.011);
  });

  it('diagonalises a symmetric matrix (smallest eigenvector of Σ nnᵀ = cylinder axis)', () => {
    // Normals of a Z cylinder span XY: Σ nnᵀ = diag(0.5, 0.5, 0).
    const e = symmetricEigen3([0.5, 0, 0, 0, 0.5, 0, 0, 0, 0]);
    expect(e.values[0]).toBeCloseTo(0, 12);
    expect(Math.abs(e.vectors[0][2])).toBeCloseTo(1, 12);
  });

  it('converts a frame to the axis-angle rotation the emitter appends', () => {
    // Columns e1 = Y, e2 = Z, axis = X — a 120° turn about (1,1,1)/√3.
    const r = rotationToAxisAngle([[0, 1, 0], [0, 0, 1], [1, 0, 0]]);
    expect(r.degrees).toBeCloseTo(120, 9);
    for (const c of r.axis) expect(c).toBeCloseTo(1 / Math.sqrt(3), 9);
  });
});

describe('meshClean', () => {
  it('welds a triangle soup box into a watertight 8-vertex shell with the right volume', () => {
    const { report, mesh } = cleanMesh(boxSoup(80, 50, 6));
    expect(report.vertices).toBe(8);
    expect(report.triangles).toBe(12);
    expect(report.watertight).toBe(true);
    expect(report.volumeMm3).toBeCloseTo(24000, 6);
    expect(report.orientationFlipped).toBe(false);
    expect(Array.from(mesh.neighbors).every((n) => n >= 0)).toBe(true);
  });

  it('flips an inside-out shell and reports a hole in an open one', () => {
    const inverted = boxSoup(10, 10, 10);
    for (let t = 0; t < inverted.positions.length / 9; t++) {
      for (let k = 0; k < 3; k++) {
        const a = inverted.positions[t * 9 + 3 + k];
        inverted.positions[t * 9 + 3 + k] = inverted.positions[t * 9 + 6 + k];
        inverted.positions[t * 9 + 6 + k] = a;
      }
    }
    const flipped = cleanMesh(inverted).report;
    expect(flipped.orientationFlipped).toBe(true);
    expect(flipped.volumeMm3).toBeCloseTo(1000, 6);

    const open = boxSoup(10, 10, 10);
    const openReport = cleanMesh({ ...open, positions: open.positions.slice(18) }).report;
    expect(openReport.watertight).toBe(false);
    expect(openReport.openEdges).toBeGreaterThan(0);
    expect(openReport.crackClusters.length).toBeGreaterThan(0);
  });

  it('drops degenerate and duplicate triangles and keeps the largest shell', () => {
    const big = boxSoup(20, 20, 20).positions;
    const small = boxSoup(1, 1, 1, [100, 0, 0]).positions;
    const extra = [0, 0, 0, 0, 0, 0, 1, 1, 1, ...Array.from(big.slice(0, 9))];
    const { report } = cleanMesh({ positions: Float64Array.from([...big, ...small, ...extra]), format: 'stl', unitDeclared: false });
    expect(report.droppedDegenerate).toBe(1);
    expect(report.droppedDuplicate).toBe(1);
    expect(report.shells).toBe(2);
    expect(report.volumeMm3).toBeCloseTo(8000, 6);
  });
});

describe('segmentation and frame', () => {
  it('segments a box into six planes and extrudes it through its thinnest side', () => {
    const { mesh } = cleanMesh(boxSoup(80, 50, 6));
    const seg = segmentMesh(mesh);
    expect(seg.planes).toHaveLength(6);
    expect(seg.cylinders).toHaveLength(0);
    expect(seg.freeform).toHaveLength(0);
    const frame = chooseFrame(seg, 0.05, mesh);
    expect(frame.axis).toEqual([0, 0, 1]);
  });

  it('matches no plane or cylinder on an organic blob', () => {
    const { mesh } = cleanMesh(blobSoup());
    const seg = segmentMesh(mesh);
    expect(seg.planes).toHaveLength(0);
    expect(seg.freeform.reduce((s, f) => s + f.area, 0)).toBeGreaterThan(0.9 * seg.totalArea);
  });
});

describe('sections and profile fitting', () => {
  it('slices a box into one CCW material loop of the right area', () => {
    const { mesh } = cleanMesh(boxSoup(80, 50, 6));
    const s = sliceAtZ(mesh.positions, mesh.triangles, 3);
    expect(s.loops).toHaveLength(1);
    expect(s.openChains).toBe(0);
    expect(s.materialArea).toBeCloseTo(4000, 6);
  });

  it('fits a dense circle as a circle, flagged as a hole when clockwise', () => {
    const cw = circlePoints(10, 8, 2.75, 120);
    for (let i = 0; i < cw.length / 2; i++) cw[2 * i + 1] = 16 - cw[2 * i + 1]; // mirror → CW
    const loop = fitLoop(cw, 0.02);
    expect(loop.kind).toBe('circle');
    if (loop.kind !== 'circle') return;
    expect(loop.hole).toBe(true);
    expect(2 * loop.r).toBeCloseTo(5.5, 6);
  });

  it('fits a rounded rectangle as four lines and four tangent arcs with exact area', () => {
    const loop = fitLoop(roundedRectLoop(80, 50, 5), 0.02);
    expect(loop.kind).toBe('path');
    if (loop.kind !== 'path') return;
    const raw = loopPrimitives(loop);
    expect(raw.filter((p) => p.kind === 'line')).toHaveLength(4);
    const rawArcs = raw.filter((p) => p.kind === 'arc');
    expect(rawArcs).toHaveLength(4);
    for (const a of rawArcs) if (a.kind === 'arc') expect(a.r).toBeCloseTo(5, 2);
    // After snapping, the fillet centres are rebuilt from the snapped lines,
    // so the exact moments match 80×50 minus four (r² − πr²/4) remnants.
    snapLoop(loop, { tol: 0.01, angleTolDeg: 2, label: 'rr' });
    const m = primitivesMoments(loopPrimitives(loop));
    expect(m.area).toBeCloseTo(80 * 50 - 4 * (25 - (Math.PI * 25) / 4), 6);
    expect(m.cx).toBeCloseTo(40, 9);
    expect(m.cy).toBeCloseTo(25, 9);
  });

  it('snaps near-orthogonal lines and near-round values, recording every snap', () => {
    const pts = Float64Array.from([0.004, -0.003, 80.006, 0.002, 79.997, 50.004, -0.002, 49.996]);
    const loop = fitLoop(pts, 0.02);
    const snaps = snapLoop(loop, { tol: 0.01, angleTolDeg: 2, label: 'plate' });
    const prims = loop.kind === 'path' ? loopPrimitives(loop) : [];
    const corners = prims.map((p) => p.a.map((v) => Math.round(v * 1e9) / 1e9).join(',')).sort();
    expect(corners).toEqual(['0,0', '0,50', '80,0', '80,50']);
    // Three offsets moved; the top edge already averaged to exactly 50.
    expect(snaps).toHaveLength(3);
    expect(snaps.every((x) => /^plate\.line\d\.[xy]$/.test(x.what))).toBe(true);
    expect(snaps.every((s) => Math.abs(s.value - s.measured) <= 0.01)).toBe(true);
    expect(snapValue(5.537, 0.01)).toEqual({ value: 5.537, grid: 0.001, snapped: false });
    expect(snapValue(5.504, 0.01)).toMatchObject({ value: 5.5, grid: 0.5, snapped: true });
  });
});

describe('fidelity', () => {
  const tri = (soup: ReturnType<typeof boxSoup>) => {
    const { mesh } = cleanMesh(soup);
    return { positions: mesh.positions, indices: mesh.triangles };
  };

  it('computes exact IoU for axis-aligned boxes', () => {
    const a = tri(boxSoup(10, 10, 10));
    expect(volumeIoU(a, a).iou).toBeCloseTo(1, 12);
    // Shift by half a side: ∩ = 500, ∪ = 1500.
    const b = tri(boxSoup(10, 10, 10, [5, 0, 0]));
    const r = volumeIoU(a, b);
    expect(r.iou).toBeCloseTo(1 / 3, 2);
    expect(r.volumeA).toBeCloseTo(1000, 0);
  });

  it('classifies inside/outside points by winding number', () => {
    const a = tri(boxSoup(10, 10, 10));
    expect(pointInsideMesh(a, 5.1, 4.9, 5)).toBe(true);
    expect(pointInsideMesh(a, 15, 5, 5)).toBe(false);
    expect(pointInsideMesh(a, 5, 5, -1)).toBe(false);
  });

  it('only calls a reconstruction faithful when every gate passes', () => {
    const t = { minIoU: 0.98, maxDeviationMm: 0.25, approximateIoU: 0.85 };
    expect(classifyFidelity({ volumeIoU: 0.999, maxDeviationMm: 0.1 }, t, true, 0)).toBe('faithful');
    expect(classifyFidelity({ volumeIoU: 0.999, maxDeviationMm: 0.3 }, t, true, 0)).toBe('approximate');
    expect(classifyFidelity({ volumeIoU: 0.999, maxDeviationMm: 0.1 }, t, false, 0)).toBe('approximate');
    expect(classifyFidelity({ volumeIoU: 0.999, maxDeviationMm: 0.1 }, t, true, 1)).toBe('approximate');
    expect(classifyFidelity({ volumeIoU: 0.6, maxDeviationMm: 0.1 }, t, true, 0)).toBe('failed');
  });
});

describe('face book', () => {
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    const poly = Float64Array.from([x0, y0, x1, y0, x1, y1, x0, y1]);
    return { poly, area: (x1 - x0) * (y1 - y0), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  it('tracks the entry-face centroid as holes remove material', () => {
    const book = new FaceBook(0.01);
    book.addDifference('Z', 6, [rect(0, 0, 80, 50)], []);
    const face = book.find('Z', 6, [10, 8], 0.05)!;
    expect([face.cx, face.cy]).toEqual([40, 25]);
    const r = 5;
    book.removeMoments(face, Math.PI * r * r, 10, 8, circleToPolygon(10, 8, r, true));
    const a0 = 4000;
    const ad = Math.PI * 25;
    expect(face.cx).toBeCloseTo((a0 * 40 - ad * 10) / (a0 - ad), 9);
    expect(face.cy).toBeCloseTo((a0 * 25 - ad * 8) / (a0 - ad), 9);
    // A point inside the removed disk no longer belongs to the face.
    expect(book.find('Z', 6, [10, 8], 0.05)).toBeUndefined();
  });

  it('subtracts a nested upper band exactly and samples an overlapping one', () => {
    const book = new FaceBook(0.01);
    book.addDifference('Z', 8, [rect(0, 0, 60, 40)], [rect(20, 10, 40, 30)]);
    const annulus = book.pieces[0];
    expect(annulus.approximate).toBe(false);
    expect(annulus.area).toBeCloseTo(2400 - 400, 9);
    book.addDifference('Z', 8, [rect(0, 0, 60, 40)], [rect(30, 0, 60, 40)]);
    const half = book.pieces[1];
    expect(half.approximate).toBe(true);
    expect(half.cx).toBeCloseTo(15, 1);
  });

  it("emulates the lowerer's through-depth back-face rule", () => {
    const book = new FaceBook(0.01);
    book.addDifference('Z', 6, [rect(0, 0, 80, 50)], []);
    book.addDifference('-Z', 0, [rect(0, 0, 80, 50)], []);
    const top = book.pieces[0];
    expect(book.throughDepth(top, 5)).toBe(6);
    // A back face whose centroid is far off the bore line does not qualify.
    const off = new FaceBook(0.01);
    off.addDifference('Z', 6, [rect(0, 0, 10, 10)], []);
    off.addDifference('-Z', 0, [rect(40, 0, 50, 10)], []);
    expect(off.throughDepth(off.pieces[0], 5)).toBeUndefined();
  });
});

describe('bore run decomposition', () => {
  const seg = (r: number, t0: number, t1: number) => ({ r, rawR: r, t0, t1, rawT0: t0, rawT1: t1 });
  const run = (segs: ReturnType<typeof seg>[], openLow: boolean, openHigh: boolean) => {
    const drills: any[] = [];
    const remainder: any[] = [];
    const assumptions: any[] = [];
    _internal.decomposeRun(segs, openLow, openHigh, 'Z', [15, 15], 'bore', drills, remainder, assumptions);
    return { drills, remainder, assumptions };
  };

  it('turns a wide top step over a narrow bore into one counterbored through hole', () => {
    const { drills, remainder, assumptions } = run([seg(3.25, 0, 7), seg(5.5, 7, 12)], true, true);
    expect(remainder).toHaveLength(0);
    expect(assumptions).toHaveLength(0);
    expect(drills).toHaveLength(1);
    expect(drills[0]).toMatchObject({ fromHigh: true, diameter: 6.5, through: true, length: 12, entryLevel: 12, exitLevel: 0 });
    expect(drills[0].counterbore).toMatchObject({ r: 5.5, depth: 5 });
  });

  it('drills a run closed at the bottom as a blind hole from the open end', () => {
    const { drills } = run([seg(2, 3, 10)], false, true);
    expect(drills).toHaveLength(1);
    expect(drills[0]).toMatchObject({ fromHigh: true, through: false, length: 7, entryLevel: 10 });
  });

  it('records the drilling side as an assumption when both ends are open and equal', () => {
    const { drills, assumptions } = run([seg(3, 0, 6)], true, true);
    expect(drills[0].fromHigh).toBe(true);
    expect(assumptions).toHaveLength(1);
  });

  it('leaves an undercut and a fully enclosed void to boolean remainders', () => {
    const undercut = run([seg(2, 0, 4), seg(4, 4, 6), seg(2, 6, 10)], true, true);
    expect(undercut.drills).toHaveLength(1);
    expect(undercut.remainder).toEqual([expect.objectContaining({ radius: 4, length: 2 })]);
    const enclosed = run([seg(2, 2, 5)], false, false);
    expect(enclosed.drills).toHaveLength(0);
    expect(enclosed.remainder).toHaveLength(1);
  });
});
