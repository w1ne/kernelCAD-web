// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingPlanGeometry.ts
//
// Pure 2D geometry for the architectural plan sheet (`drawingArchitectural.ts`):
// flattening section loops to polygons, scanline material intervals along the
// exterior walls (wall / opening chain dimensions), room detection from a
// section's loop nesting, label placement, and unit formatting (millimetres or
// feet-inches). No OCCT here, so every rule is unit-testable on plain numbers.

import type { ProjectedSegment } from './sketchFromShape';

export type P2 = readonly [number, number];
export type Polygon = readonly P2[];

// ---------------------------------------------------------------------------
// Loops → polygons
// ---------------------------------------------------------------------------

/** Points along one projected segment, start included, end excluded. Arcs
 *  (DXF bulge) are sampled every ≤ 10°. */
function segmentPoints(s: ProjectedSegment): P2[] {
  const b = s.bulge ?? 0;
  if (Math.abs(b) < 1e-12) return [[s.x0, s.y0]];
  const theta = 4 * Math.atan(b);
  const chord = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
  if (chord < 1e-12) return [[s.x0, s.y0]];
  const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
  // Centre: chord midpoint offset along the left normal by the sagitta distance.
  const mx = (s.x0 + s.x1) / 2;
  const my = (s.y0 + s.y1) / 2;
  const nx = -(s.y1 - s.y0) / chord;
  const ny = (s.x1 - s.x0) / chord;
  const d = r * Math.cos(Math.abs(theta) / 2) * Math.sign(theta);
  const cx = mx + nx * d;
  const cy = my + ny * d;
  const a0 = Math.atan2(s.y0 - cy, s.x0 - cx);
  const n = Math.max(2, Math.ceil(Math.abs(theta) / (Math.PI / 18)));
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (theta * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** Closed chain of segments → polygon (implicitly closed). */
export function loopToPolygon(loop: readonly ProjectedSegment[]): P2[] {
  const out: P2[] = [];
  for (const s of loop) out.push(...segmentPoints(s));
  return out;
}

export function polygonArea(p: Polygon): number {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    a += (p[j][0] * p[i][1]) - (p[i][0] * p[j][1]);
  }
  return a / 2;
}

export function pointInPolygon(pt: P2, p: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonsBBox(polys: readonly Polygon[]): { min: P2; max: P2 } | undefined {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polys) {
    for (const [x, y] of p) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return Number.isFinite(minX) ? { min: [minX, minY], max: [maxX, maxY] } : undefined;
}

// ---------------------------------------------------------------------------
// Scanline material intervals
// ---------------------------------------------------------------------------

/**
 * Material intervals where a scanline crosses the region bounded by `polys`
 * (even-odd over all loops — a fused section's outer boundaries and holes).
 * `axis: 'x'` scans along X at `y = pos`; `'y'` scans along Y at `x = pos`.
 * Returned intervals are sorted and non-overlapping, in scan coordinates.
 */
export function scanIntervals(polys: readonly Polygon[], axis: 'x' | 'y', pos: number): Array<[number, number]> {
  const hits: number[] = [];
  const along = axis === 'x' ? 0 : 1;
  const across = axis === 'x' ? 1 : 0;
  for (const p of polys) {
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[j];
      const b = p[i];
      if ((a[across] > pos) === (b[across] > pos)) continue;
      const t = (pos - a[across]) / (b[across] - a[across]);
      hits.push(a[along] + t * (b[along] - a[along]));
    }
  }
  hits.sort((m, n) => m - n);
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < hits.length; i += 2) {
    if (hits[i + 1] - hits[i] > 1e-6) out.push([hits[i], hits[i + 1]]);
  }
  return out;
}

/**
 * Chain-dimension breakpoints along one exterior side: every material /
 * opening boundary where the scanline crosses the walls, merged when closer
 * than `mergeMm`. Two points (one solid wall) means no openings on that side.
 */
export function chainBreakpoints(intervals: ReadonlyArray<readonly [number, number]>, mergeMm = 1): number[] {
  const pts: number[] = [];
  for (const [a, b] of intervals) {
    for (const v of [a, b]) {
      if (pts.length === 0 || v - pts[pts.length - 1] > mergeMm) pts.push(v);
    }
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface PlanRoom {
  /** Room boundary (inner face of the enclosing walls). */
  polygon: P2[];
  /** Material islands inside the room (columns, chimneys), subtracted from the area. */
  islands: P2[][];
  /** Net floor area, mm². */
  areaMm2: number;
  /** Where the label goes: inside the room, off every island. */
  labelAt: P2;
}

/**
 * Rooms of a fused horizontal section: loops nested at odd depth (inside the
 * exterior outline, bounded by walls) enclose empty floor. Loops at the next
 * depth inside a room are islands. Rooms smaller than `minAreaMm2` (shafts,
 * wall cavities) are dropped.
 */
export function detectRooms(polys: readonly Polygon[], minAreaMm2 = 0.5e6): PlanRoom[] {
  const depth = polys.map((p, i) =>
    polys.reduce((n, q, k) => (k !== i && p.length > 0 && pointInPolygon(p[0], q) ? n + 1 : n), 0),
  );
  const rooms: PlanRoom[] = [];
  polys.forEach((p, i) => {
    if (depth[i] % 2 !== 1) return;
    const islands = polys.filter((q, k) => depth[k] === depth[i] + 1 && q.length > 0 && pointInPolygon(q[0], p));
    const area = Math.abs(polygonArea(p)) - islands.reduce((s, q) => s + Math.abs(polygonArea(q)), 0);
    if (area < minAreaMm2) return;
    rooms.push({ polygon: [...p], islands: islands.map(q => [...q]), areaMm2: area, labelAt: labelPoint(p, islands) });
  });
  return rooms;
}

/** A point inside `p` and outside every island: the centroid when it
 *  qualifies, else the middle of the widest free span through the centroid's
 *  height (an L-shaped room's centroid can sit in the wall). */
export function labelPoint(p: Polygon, islands: readonly Polygon[] = []): P2 {
  const c = centroid(p);
  const free = (pt: P2) => pointInPolygon(pt, p) && !islands.some(q => pointInPolygon(pt, q));
  if (free(c)) return c;
  const bb = polygonsBBox([p])!;
  let best: P2 = c;
  let bestW = -1;
  for (let k = 1; k < 20; k++) {
    const y = bb.min[1] + ((bb.max[1] - bb.min[1]) * k) / 20;
    for (const [a, b] of scanIntervals([p, ...islands], 'x', y)) {
      if (b - a > bestW) {
        bestW = b - a;
        best = [(a + b) / 2, y];
      }
    }
  }
  return best;
}

function centroid(p: Polygon): P2 {
  const a = polygonArea(p);
  if (Math.abs(a) < 1e-9) {
    const n = p.length || 1;
    return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n];
  }
  let cx = 0, cy = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const f = p[j][0] * p[i][1] - p[i][0] * p[j][1];
    cx += (p[j][0] + p[i][0]) * f;
    cy += (p[j][1] + p[i][1]) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export type PlanUnits = 'metric' | 'imperial';

const MM_PER_INCH = 25.4;

/**
 * Guess the unit system a model was authored in from characteristic lengths
 * (mm). A length that is a whole number of inches but not a whole number of
 * 5 mm votes imperial (3657.6 = 12 ft); a whole number of 5 mm that is not a
 * whole inch votes metric (3600). No evidence either way → metric.
 */
export function detectPlanUnits(lengthsMm: readonly number[]): PlanUnits {
  let imperial = 0;
  let metric = 0;
  for (const L of lengthsMm) {
    if (!(L > 1)) continue;
    const inch = Math.abs(L / MM_PER_INCH - Math.round(L / MM_PER_INCH)) * MM_PER_INCH < 0.05;
    const five = Math.abs(L / 5 - Math.round(L / 5)) * 5 < 0.05;
    if (inch && !five) imperial++;
    else if (five && !inch) metric++;
  }
  return imperial > metric ? 'imperial' : 'metric';
}

/** Feet-inches to the nearest 1/4": `12'-6"`, `3'-0 1/2"`, `0'-4 3/4"`. */
export function formatFeetInches(mm: number): string {
  const quarters = Math.round((Math.abs(mm) / MM_PER_INCH) * 4);
  const sign = mm < 0 && quarters > 0 ? '-' : '';
  const feet = Math.floor(quarters / 48);
  const remQ = quarters - feet * 48;
  const inches = Math.floor(remQ / 4);
  const frac = remQ % 4;
  const fracText = frac === 0 ? '' : frac === 2 ? ' 1/2' : ` ${frac}/4`;
  return `${sign}${feet}'-${inches}${fracText}"`;
}

/** A plan length label: whole millimetres (metric) or feet-inches (imperial). */
export function formatPlanLength(mm: number, units: PlanUnits): string {
  return units === 'imperial' ? formatFeetInches(mm) : String(Math.round(mm));
}

/** Net area label: `12.5 m²` or `135 ft²`. */
export function formatPlanArea(mm2: number, units: PlanUnits): string {
  if (units === 'imperial') return `${Math.round(mm2 / (MM_PER_INCH * MM_PER_INCH * 144))} ft²`;
  return `${(mm2 / 1e6).toFixed(1)} m²`;
}

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

export interface PlanScale {
  /** Sheet mm per model mm. */
  factor: number;
  label: string;
}

const METRIC_SCALES: readonly PlanScale[] = [20, 25, 50, 100, 200, 250, 500, 1000, 2000].map(d => ({
  factor: 1 / d,
  label: `1:${d}`,
}));

// Architectural imperial scales: X" on the sheet = 1'-0" of building.
const IMPERIAL_SCALES: readonly PlanScale[] = [
  { factor: 1 / 24, label: '1/2" = 1\'-0"' },
  { factor: 1 / 32, label: '3/8" = 1\'-0"' },
  { factor: 1 / 48, label: '1/4" = 1\'-0"' },
  { factor: 1 / 64, label: '3/16" = 1\'-0"' },
  { factor: 1 / 96, label: '1/8" = 1\'-0"' },
  { factor: 1 / 192, label: '1/16" = 1\'-0"' },
  { factor: 1 / 384, label: '1/32" = 1\'-0"' },
];

/** Largest standard architectural scale whose factor is ≤ `fit`, else the
 *  smallest one on offer. */
export function pickPlanScale(fit: number, units: PlanUnits): PlanScale {
  const table = units === 'imperial' ? IMPERIAL_SCALES : METRIC_SCALES;
  return table.find(s => s.factor <= fit) ?? table[table.length - 1]!;
}

/** Scale-bar length in model mm: a round length that draws 30–80 sheet mm. */
export function scaleBarLengthMm(factor: number, units: PlanUnits): number {
  const steps = units === 'imperial'
    ? [1, 2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 100, 200].map(ft => ft * 12 * MM_PER_INCH)
    : [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  return steps.find(L => L * factor >= 30) ?? steps[steps.length - 1]!;
}
