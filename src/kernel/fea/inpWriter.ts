// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/inpWriter.ts
//
// Writes the CalculiX input deck (.inp) for a linear static study.
//
// Three things in here decide whether the answer is right at all:
//
// 1. NODE ORDER. gmsh and CalculiX both call it a 10-node tet and disagree
//    about it. gmsh element type 11 orders the midside nodes by the edges
//    (0,1) (1,2) (0,2) (0,3) (2,3) (1,3); CalculiX C3D10 orders them
//    1-2, 2-3, 3-1, 1-4, 2-4, 3-4. Everything lines up except the last two,
//    which swap. Ship that wrong and the deck still solves — it just returns
//    a wrong answer, which is the worst possible failure mode for a gate.
//
// 2. FORCE DISTRIBUTION. A study declares a TOTAL force on a face. CalculiX
//    `*CLOAD` is per node, so the writer turns the total into the CONSISTENT
//    nodal loads of a uniform traction over the loaded skin: each surface
//    triangle takes its area share of the total, and on a 6-node quadratic
//    triangle (the face of a C3D10) that share goes 1/3 to each mid-side
//    node and 0 to the corners (integrate the quadratic shape functions over
//    the triangle). An equal split over every face node, which this used to
//    do, puts a third of the load on corner nodes that should carry none,
//    and the resulting point loads show up as false stress at the loaded
//    face. The resultant is exact either way; the safety factor depends on
//    the local distribution only near the load. Loads without surface
//    triangles (hand-built decks) still get the equal split.
//
// 3. UNITS. mm / N / MPa. `*ELASTIC` gets E in MPa, so stresses come back in
//    MPa and displacements in mm with no conversion anywhere.

import type { FeaJobSpec, FeaNodeSet } from './types';

/**
 * Permutation from gmsh tet10 local order to CalculiX C3D10 local order.
 * Index i holds the GMSH local index that belongs in CalculiX position i.
 */
export const GMSH_TO_CCX_TET10: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 9, 8];

/** CalculiX rejects input lines longer than 132 characters; we stay well
 *  inside that with 8 ids per line. */
const IDS_PER_LINE = 8;

function nsetLines(set: FeaNodeSet): string[] {
  const out: string[] = [`*NSET, NSET=${set.name}`];
  for (let i = 0; i < set.nodes.length; i += IDS_PER_LINE) {
    const chunk = set.nodes.slice(i, i + IDS_PER_LINE);
    const more = i + IDS_PER_LINE < set.nodes.length;
    out.push(chunk.join(', ') + (more ? ',' : ''));
  }
  return out;
}

/** Trim a float to a deck-friendly literal without losing solver precision. */
function num(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(10)));
}

/** Midside node per corner edge (gmsh local order: edges 01 12 02 03 23 13
 *  at positions 4-9). Only the edges in `wanted` are collected. */
const TET10_EDGES: readonly (readonly [number, number, number])[] = [
  [0, 1, 4], [1, 2, 5], [0, 2, 6], [0, 3, 7], [2, 3, 8], [1, 3, 9],
];
const edgeKey = (a: number, b: number): string => (a < b ? `${a}_${b}` : `${b}_${a}`);

function midsideLookup(job: FeaJobSpec, wanted: ReadonlySet<string>): Map<string, number> {
  const out = new Map<string, number>();
  if (wanted.size === 0) return out;
  for (const el of job.mesh.elements) {
    for (const [i, j, m] of TET10_EDGES) {
      const k = edgeKey(el.nodes[i], el.nodes[j]);
      if (wanted.has(k) && !out.has(k)) out.set(k, el.nodes[m]);
    }
  }
  return out;
}

function triArea(job: FeaJobSpec, t: readonly [number, number, number]): number {
  const a = job.mesh.nodes.get(t[0]), b = job.mesh.nodes.get(t[1]), c = job.mesh.nodes.get(t[2]);
  if (a === undefined || b === undefined || c === undefined) return 0;
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}

/**
 * Per-node weights (summing to 1) for a uniform traction over `tris`: a
 * triangle carries its area share, split 1/3 per mid-side node. A triangle
 * whose mid-side nodes cannot be found (not a face of any tet) falls back to
 * the linear-triangle rule, 1/3 per corner, so no area is ever dropped.
 * Returns undefined when the triangles have no area to weight by.
 */
export function consistentLoadWeights(
  job: FeaJobSpec,
  tris: readonly (readonly [number, number, number])[],
): Map<number, number> | undefined {
  const areas = tris.map(t => triArea(job, t));
  const total = areas.reduce((acc, a) => acc + a, 0);
  if (!(total > 0)) return undefined;
  const wanted = new Set<string>();
  for (const [a, b, c] of tris) {
    wanted.add(edgeKey(a, b)); wanted.add(edgeKey(b, c)); wanted.add(edgeKey(a, c));
  }
  const mid = midsideLookup(job, wanted);
  const w = new Map<number, number>();
  const add = (n: number, v: number) => w.set(n, (w.get(n) ?? 0) + v);
  tris.forEach(([a, b, c], i) => {
    const share = areas[i] / total / 3;
    if (share === 0) return;
    const m = [mid.get(edgeKey(a, b)), mid.get(edgeKey(b, c)), mid.get(edgeKey(a, c))];
    const targets = m.every(x => x !== undefined) ? (m as number[]) : [a, b, c];
    for (const n of targets) add(n, share);
  });
  return w;
}

/** `*CLOAD` lines for one load: per node when the surface triangles are
 *  known, else the equal split over the node set. */
function cloadLines(job: FeaJobSpec, load: FeaJobSpec['loads'][number]): string[] {
  const out: string[] = [];
  const weights = load.tris !== undefined && load.tris.length > 0
    ? consistentLoadWeights(job, load.tris)
    : undefined;
  if (weights === undefined) {
    const n = load.set.nodes.length;
    for (let dof = 0; dof < 3; dof++) {
      const total = load.force[dof];
      if (total === 0) continue;
      out.push(`${load.set.name}, ${dof + 1}, ${num(total / n)}`);
    }
    return out;
  }
  const ids = [...weights.keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const wi = weights.get(id)!;
    if (wi === 0) continue;
    for (let dof = 0; dof < 3; dof++) {
      const total = load.force[dof];
      if (total === 0) continue;
      out.push(`${id}, ${dof + 1}, ${num(total * wi)}`);
    }
  }
  return out;
}

/**
 * Render a complete CalculiX deck for `job`.
 *
 * Throws when a load resolves to an empty node set: a deck that solves an
 * unloaded part returns zero stress and an infinite safety factor, which
 * would read as a pass. Refusing is the only honest option.
 */
export function writeInp(job: FeaJobSpec): string {
  const lines: string[] = [];
  lines.push('** kernelCAD linear static study — units: mm / N / MPa');

  lines.push('*NODE, NSET=NALL');
  const ids = [...job.mesh.nodes.keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const [x, y, z] = job.mesh.nodes.get(id)!;
    lines.push(`${id}, ${x.toFixed(6)}, ${y.toFixed(6)}, ${z.toFixed(6)}`);
  }

  lines.push('*ELEMENT, TYPE=C3D10, ELSET=EALL');
  for (const el of job.mesh.elements) {
    if (el.nodes.length !== 10) {
      throw new Error(
        `writeInp: element ${el.id} has ${el.nodes.length} nodes; C3D10 needs exactly 10.`,
      );
    }
    const ordered = GMSH_TO_CCX_TET10.map(i => el.nodes[i]);
    lines.push(`${el.id}, ${ordered.join(', ')}`);
  }

  if (job.fixed.nodes.length === 0) {
    throw new Error('writeInp: the fixed face resolved to no nodes — the part is unconstrained.');
  }
  lines.push(...nsetLines(job.fixed));
  for (const load of job.loads) {
    if (load.set.nodes.length === 0) {
      throw new Error(
        `writeInp: load '${load.name}' resolved to no nodes — an unloaded deck would report a pass.`,
      );
    }
    lines.push(...nsetLines(load.set));
  }

  lines.push('*MATERIAL, NAME=KCMAT');
  lines.push('*ELASTIC');
  lines.push(`${num(job.material.E)}, ${num(job.material.nu)}`);
  lines.push('*SOLID SECTION, ELSET=EALL, MATERIAL=KCMAT');

  lines.push('*STEP');
  lines.push('*STATIC');
  lines.push('*BOUNDARY');
  lines.push(`${job.fixed.name}, 1, 3, 0.0`);
  lines.push('*CLOAD');
  for (const load of job.loads) lines.push(...cloadLines(job, load));
  lines.push('*NODE FILE');
  lines.push('U');
  lines.push('*EL FILE');
  lines.push('S, ERR');
  lines.push(`*NODE PRINT, NSET=${job.fixed.name}, TOTALS=ONLY`);
  lines.push('RF');
  lines.push('*END STEP');
  return lines.join('\n') + '\n';
}
