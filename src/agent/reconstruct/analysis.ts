// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/analysis.ts
//
// The pass-invariant half of reconstruction: clean → segment → choose the
// extrusion frame → find cap levels → slice each band at its representative
// height → collect cross-axis bores and the regions no emitted feature will
// represent. Refinement passes re-fit and re-emit from this; they never
// re-measure the mesh.

import { cleanMesh, type IndexedMesh, type MeshReport } from './meshClean';
import { segmentMesh, type CylinderRegion, type PlaneRegion, type Segmentation } from './segment';
import { chooseFrame, toCanonical, type CanonicalFrame } from './frame';
import { sliceAtZ, type Section } from './section';
import { dot3, type V3 } from './geom';
import type { TriangleSoup } from './meshIO';

export interface BandAnalysis {
  z0: number;
  z1: number;
  /** Representative (max material area) section. */
  section: Section;
  /** Material area of every sampled height, for the prismatic check. */
  sampledAreas: number[];
}

export interface CrossBore {
  /** Bore axis in the canonical frame. */
  axis: 'X' | 'Y';
  /** In-plane coordinate across the axis (y for X bores, x for Y bores), canonical, unshifted. */
  s: number;
  /** Height (canonical z, unshifted). */
  z: number;
  radius: number;
  tMin: number;
  tMax: number;
  region: CylinderRegion;
}

export type UnmatchedKind = 'freeform' | 'tilted-plane' | 'cylinder';

export interface UnmatchedRegion {
  kind: UnmatchedKind;
  reason: string;
  areaMm2: number;
  triangleCount: number;
  /** Input-frame centroid. */
  centroid: V3;
  bbox: { min: V3; max: V3 };
  /** How far (max over sampled vertices) the region lies from the reconstructed surface, mm. */
  distanceToReconstructionMm?: number;
}

/** A candidate region with its triangles, before it is checked against a reconstruction. */
export interface UnmatchedCandidate extends UnmatchedRegion {
  tris: number[];
}

export interface MeshAnalysis {
  mesh: IndexedMesh;
  report: MeshReport;
  seg: Segmentation;
  frame: CanonicalFrame;
  /** Mesh positions in the canonical (rotated, unshifted) frame. */
  canonical: Float64Array;
  zMin: number;
  zMax: number;
  /** Cap levels (canonical z, unshifted), ascending, including zMin/zMax. */
  levels: number[];
  bands: BandAnalysis[];
  crossBores: CrossBore[];
  /** Regions no feature type covers; each pass keeps those its script misses. */
  unmatched: UnmatchedCandidate[];
  unmatchedAreaThresholdMm2: number;
  diagonal: number;
}

const CAP_COS = Math.cos((2 * Math.PI) / 180);
const WALL_SIN = Math.sin((2 * Math.PI) / 180);
const SAMPLE_FRACTIONS = [0.21, 0.37, 0.5, 0.63, 0.79];

export function analyseMesh(soup: TriangleSoup, weldToleranceMm?: number): MeshAnalysis {
  const { mesh, report } = cleanMesh(soup, { weldToleranceMm });
  const diagonal = Math.hypot(
    mesh.bbox.max[0] - mesh.bbox.min[0],
    mesh.bbox.max[1] - mesh.bbox.min[1],
    mesh.bbox.max[2] - mesh.bbox.min[2],
  );
  const seg = segmentMesh(mesh);
  const levelTol = Math.max(3 * seg.toleranceMm, 1e-3 * diagonal, 0.05);
  const frame = chooseFrame(seg, levelTol, mesh);
  const canonical = toCanonical(mesh.positions, frame);

  const { zMin, zMax } = canonicalZRange(canonical);
  const levels = capLevels(seg, frame, zMin, zMax, levelTol);
  const bands = buildBands(canonical, mesh.triangles, levels, levelTol);

  // Cross-axis bores and regions no feature represents.
  const threshold = Math.max(0.5, 0.002 * seg.totalArea);
  const { crossBores, unmatched } = classifyRegions(mesh, seg, frame, threshold);

  return {
    mesh,
    report,
    seg,
    frame,
    canonical,
    zMin,
    zMax,
    levels,
    bands,
    crossBores,
    unmatched,
    unmatchedAreaThresholdMm2: threshold,
    diagonal,
  };
}

function canonicalZRange(canonical: Float64Array): { zMin: number; zMax: number } {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 2; i < canonical.length; i += 3) {
    zMin = Math.min(zMin, canonical[i]);
    zMax = Math.max(zMax, canonical[i]);
  }
  return { zMin, zMax };
}

function capLevels(seg: Segmentation, frame: CanonicalFrame, zMin: number, zMax: number, levelTol: number): number[] {
  // Cap levels: area-weighted cluster of cap-plane offsets.
  const caps = seg.planes
    .filter((p) => Math.abs(dot3(p.normal, frame.axis)) >= CAP_COS && p.area >= 1e-3 * seg.totalArea)
    .map((p) => ({ z: dot3(p.centroid, frame.axis), area: p.area }))
    .concat([
      { z: zMin, area: 0 },
      { z: zMax, area: 0 },
    ])
    .sort((a, b) => a.z - b.z);
  const levels: number[] = [];
  let group: { z: number; area: number }[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const w = group.reduce((s, g) => s + g.area, 0);
    const hasExtreme = group.find((g) => g.area === 0);
    levels.push(w > 0 ? group.reduce((s, g) => s + g.z * g.area, 0) / w : hasExtreme!.z);
    group = [];
  };
  for (const c of caps) {
    if (group.length > 0 && c.z - group[group.length - 1].z > levelTol) flush();
    group.push(c);
  }
  flush();
  if (levels.length < 2) levels.push(zMax);
  return levels;
}

function buildBands(
  canonical: Float64Array,
  triangles: Uint32Array,
  levels: number[],
  levelTol: number,
): BandAnalysis[] {
  const bands: BandAnalysis[] = [];
  for (let i = 0; i + 1 < levels.length; i++) {
    const z0 = levels[i];
    const z1 = levels[i + 1];
    if (z1 - z0 <= levelTol * 0.5) continue;
    let best: Section | null = null;
    const sampledAreas: number[] = [];
    for (const f of SAMPLE_FRACTIONS) {
      const s = sliceAtZ(canonical, triangles, z0 + f * (z1 - z0));
      sampledAreas.push(s.materialArea);
      if (!best || s.materialArea > best.materialArea) best = s;
    }
    bands.push({ z0, z1, section: best!, sampledAreas });
  }
  return bands;
}

function classifyCylinderRegion(
  mesh: IndexedMesh,
  c: CylinderRegion,
  frame: CanonicalFrame,
  threshold: number,
  crossBores: CrossBore[],
  unmatched: UnmatchedCandidate[],
): void {
  const e1 = frame.e1, e2 = frame.e2, axis = frame.axis;
  const along = Math.abs(dot3(c.axis, axis));
  if (along >= CAP_COS) return; // part of the extruded profile
  const cx = Math.abs(dot3(c.axis, e1));
  const cy = Math.abs(dot3(c.axis, e2));
  const isCross = along <= WALL_SIN && c.concave && c.coverageRad >= (300 * Math.PI) / 180 && Math.max(cx, cy) >= CAP_COS;
  if (isCross) {
    const bore = crossBoreOf(mesh, c, frame, cx >= cy ? 'X' : 'Y');
    crossBores.push(bore);
    return;
  }
  if (c.area >= threshold) {
    unmatched.push(regionSummary(mesh, c.tris, 'cylinder',
      c.concave
        ? 'Concave cylinder that is neither along the extrusion axis nor a full cardinal cross bore.'
        : 'Convex cylinder across the extrusion axis (a side boss or edge round) — not representable as a profile or hole.'));
  }
}

function classifyPlaneRegion(
  mesh: IndexedMesh,
  p: PlaneRegion,
  axis: V3,
  threshold: number,
  unmatched: UnmatchedCandidate[],
): void {
  const d = Math.abs(dot3(p.normal, axis));
  if (d >= CAP_COS || d <= WALL_SIN) return;
  if (p.area >= threshold) {
    unmatched.push(regionSummary(mesh, p.tris, 'tilted-plane', 'Plane tilted relative to the extrusion axis (a draft or cap-edge chamfer) — the prismatic profile cannot represent it.'));
  }
}

function classifyRegions(
  mesh: IndexedMesh,
  seg: Segmentation,
  frame: CanonicalFrame,
  threshold: number,
): { crossBores: CrossBore[]; unmatched: UnmatchedCandidate[] } {
  const crossBores: CrossBore[] = [];
  const unmatched: UnmatchedCandidate[] = [];
  const axis = frame.axis;
  for (const c of seg.cylinders) {
    classifyCylinderRegion(mesh, c, frame, threshold, crossBores, unmatched);
  }
  for (const p of seg.planes) {
    classifyPlaneRegion(mesh, p, axis, threshold, unmatched);
  }
  for (const f of seg.freeform) {
    if (f.area >= threshold) {
      unmatched.push(regionSummary(mesh, f.tris, 'freeform', 'Surface matched neither a plane nor a cylinder within tolerance.'));
    }
  }
  return { crossBores, unmatched };
}

function crossBoreOf(mesh: IndexedMesh, c: CylinderRegion, frame: CanonicalFrame, label: 'X' | 'Y'): CrossBore {
  // Re-measure in the canonical frame from the region's own vertices.
  const dir = label === 'X' ? frame.e1 : frame.e2;
  const across = label === 'X' ? frame.e2 : frame.e1;
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const t of c.tris) {
    for (let k = 0; k < 3; k++) {
      const v = mesh.triangles[t * 3 + k] * 3;
      const p: V3 = [mesh.positions[v], mesh.positions[v + 1], mesh.positions[v + 2]];
      const along = dot3(p, dir);
      tMin = Math.min(tMin, along);
      tMax = Math.max(tMax, along);
    }
  }
  return {
    axis: label,
    s: dot3(c.origin, across),
    z: dot3(c.origin, frame.axis),
    radius: c.radius,
    tMin,
    tMax,
    region: c,
  };
}

function regionSummary(mesh: IndexedMesh, tris: number[], kind: UnmatchedKind, reason: string): UnmatchedCandidate {
  let area = 0;
  const c: V3 = [0, 0, 0];
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) {
    const a = mesh.areas[t];
    area += a;
    for (let j = 0; j < 3; j++) {
      const v = mesh.triangles[t * 3 + j] * 3;
      for (let k = 0; k < 3; k++) {
        const x = mesh.positions[v + k];
        c[k] += (x * a) / 3;
        min[k] = Math.min(min[k], x);
        max[k] = Math.max(max[k], x);
      }
    }
  }
  return {
    kind,
    reason,
    tris,
    areaMm2: area,
    triangleCount: tris.length,
    centroid: area > 0 ? [c[0] / area, c[1] / area, c[2] / area] : [0, 0, 0],
    bbox: { min, max },
  };
}
