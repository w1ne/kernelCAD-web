// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Multi-part STL export fuses the world-frame parts into one solid before
// meshing. A fuse of parts that touch or overlap by a few hundredths of a
// millimetre can give a valid B-rep (STEP is fine) whose tessellation still
// cracks along the union seams. These helpers (1) name the seam each crack
// cluster sits on — the parts whose extents contain it — and (2) build the
// fallback mesh: every part meshed on its own is a closed shell, and an STL
// of closed, overlapping shells is watertight and slices as their union.

import type { CrackCluster, WatertightReport } from '../../kernel/backends/occt/meshHeal';
import type { MeshData } from '../../kernel/backends/occt/exportStlBinary';

export interface SeamPart {
  name: string;
  bbox: { min: readonly number[]; max: readonly number[] };
}

export interface CrackSeam {
  cluster: CrackCluster;
  /** Parts whose bounding box (grown by `marginMm`) contains the cluster. */
  parts: string[];
}

/** Attribute each crack cluster to the parts that meet there. */
export function crackSeams(report: WatertightReport, parts: readonly SeamPart[], marginMm = 0.1): CrackSeam[] {
  return report.clusters.map((cluster) => ({
    cluster,
    parts: parts
      .filter((p) => cluster.center.every((c, k) => c >= p.bbox.min[k] - marginMm && c <= p.bbox.max[k] + marginMm))
      .map((p) => p.name),
  }));
}

/** "between 'a' and 'b' at (x, y, z) ×N; ..." — one entry per cluster. */
export function describeCrackSeams(seams: readonly CrackSeam[]): string {
  return seams
    .map(({ cluster, parts }) => {
      const at = `(${cluster.center.map((n) => n.toFixed(2)).join(', ')})×${cluster.edgeCount}`;
      if (parts.length >= 2) return `seam between ${parts.map((p) => `'${p}'`).join(' and ')} at ${at}`;
      if (parts.length === 1) return `inside part '${parts[0]}' at ${at}`;
      return `at ${at}`;
    })
    .join('; ');
}

/** Concatenate meshes into one vertex/triangle buffer (no welding: each
 *  input stays its own closed shell). */
export function concatMeshes(meshes: readonly MeshData[]): MeshData {
  const vertices: number[] = [];
  const triangles: number[] = [];
  for (const m of meshes) {
    const base = vertices.length / 3;
    for (const v of m.vertices) vertices.push(v);
    for (const t of m.triangles) triangles.push(t + base);
  }
  return { vertices, triangles };
}
