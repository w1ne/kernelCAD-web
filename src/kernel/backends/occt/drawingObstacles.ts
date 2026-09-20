// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingObstacles.ts
//
// Label/geometry occupancy grid for the automatic-drawing placer: leader
// candidates are scored against drawn geometry, already-placed labels, view
// captions and the sheet frame. Extracted verbatim from drawingAuto.ts.

export interface Box { x0: number; y0: number; x1: number; y1: number }
export type Seg = readonly [number, number, number, number];

const CELL = 4;

export class Obstacles {
  private readonly grid = new Map<string, Array<{ seg: Seg; owner: number }>>();
  private readonly boxes: Array<{ box: Box; owner: number }> = [];
  private readonly allowed: Box;

  constructor(allowed: Box) {
    this.allowed = allowed;
  }

  addSegment(seg: Seg, owner: number): void {
    const [x0, y0, x1, y1] = seg;
    const cx0 = Math.floor(Math.min(x0, x1) / CELL);
    const cx1 = Math.floor(Math.max(x0, x1) / CELL);
    const cy0 = Math.floor(Math.min(y0, y1) / CELL);
    const cy1 = Math.floor(Math.max(y0, y1) / CELL);
    for (let i = cx0; i <= cx1; i++) {
      for (let j = cy0; j <= cy1; j++) {
        const key = `${i},${j}`;
        const list = this.grid.get(key);
        if (list) list.push({ seg, owner });
        else this.grid.set(key, [{ seg, owner }]);
      }
    }
  }

  addBox(box: Box, owner: number): void {
    this.boxes.push({ box, owner });
  }

  /** Geometry lines a leader segment crosses (ignoring its first 1.5 mm,
   *  where it touches the feature it points at). */
  crossings(seg: Seg): number {
    const [x0, y0, x1, y1] = seg;
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (l < 1.6) return 0;
    const k = 1.5 / l;
    const s: Seg = [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, x1, y1];
    const seen = new Set<Seg>();
    let n = 0;
    for (let i = Math.floor(Math.min(s[0], s[2]) / CELL); i <= Math.floor(Math.max(s[0], s[2]) / CELL); i++) {
      for (let j = Math.floor(Math.min(s[1], s[3]) / CELL); j <= Math.floor(Math.max(s[1], s[3]) / CELL); j++) {
        for (const o of this.grid.get(`${i},${j}`) ?? []) {
          if (o.owner !== GEOMETRY_OWNER || seen.has(o.seg)) continue;
          seen.add(o.seg);
          if (segmentsCross(s, o.seg)) n++;
        }
      }
    }
    return n;
  }

  /** Labels (not geometry) a leader segment runs through, other than its own. */
  labelHits(seg: Seg, owner: number): number {
    let n = 0;
    for (const o of this.boxes) {
      if (o.owner === owner || o.owner === GEOMETRY_OWNER) continue;
      if (segmentHitsBox(seg, o.box)) n++;
    }
    return n;
  }

  /** Collision cost of `boxes` owned by `owner` (its own items are ignored).
   *  Boxes are padded so a label never sits flush against a line. */
  cost(raw: readonly Box[], owner: number): number {
    let total = 0;
    const boxes = raw.map(b => ({ x0: b.x0 - PAD, y0: b.y0 - PAD, x1: b.x1 + PAD, y1: b.y1 + PAD }));
    for (const b of boxes) {
      const area = (b.x1 - b.x0) * (b.y1 - b.y0);
      const ix = Math.max(0, Math.min(b.x1, this.allowed.x1) - Math.max(b.x0, this.allowed.x0));
      const iy = Math.max(0, Math.min(b.y1, this.allowed.y1) - Math.max(b.y0, this.allowed.y0));
      total += area - ix * iy;
      for (const o of this.boxes) {
        if (o.owner === owner) continue;
        const ox = Math.min(b.x1, o.box.x1) - Math.max(b.x0, o.box.x0);
        const oy = Math.min(b.y1, o.box.y1) - Math.max(b.y0, o.box.y0);
        if (ox > 0 && oy > 0) total += ox * oy + 1;
      }
      const seen = new Set<Seg>();
      for (let i = Math.floor(b.x0 / CELL); i <= Math.floor(b.x1 / CELL); i++) {
        for (let j = Math.floor(b.y0 / CELL); j <= Math.floor(b.y1 / CELL); j++) {
          for (const s of this.grid.get(`${i},${j}`) ?? []) {
            if (s.owner === owner || seen.has(s.seg)) continue;
            seen.add(s.seg);
            if (segmentHitsBox(s.seg, b)) total += 2;
          }
        }
      }
    }
    return total;
  }
}

const PAD = 0.6;
export const GEOMETRY_OWNER = -1;

function segmentsCross(a: Seg, b: Seg): boolean {
  const d = (p: readonly number[], q: readonly number[], r: readonly number[]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const p1 = [a[0], a[1]], p2 = [a[2], a[3]], q1 = [b[0], b[1]], q2 = [b[2], b[3]];
  const d1 = d(q1, q2, p1), d2 = d(q1, q2, p2), d3 = d(p1, p2, q1), d4 = d(p1, p2, q2);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

function segmentHitsBox(seg: Seg, b: Box): boolean {
  const [x0, y0, x1, y1] = seg;
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, x0 - b.x0) && clip(dx, b.x1 - x0) && clip(-dy, y0 - b.y0) && clip(dy, b.y1 - y0) && t0 <= t1;
}
