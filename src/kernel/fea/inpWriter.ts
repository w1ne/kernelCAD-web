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
//    `*CLOAD` is per node, so the total is divided by the node count. This is
//    a uniform nodal split, not a consistent-pressure traction: the resultant
//    is exact (which is what the safety factor depends on) while the local
//    distribution right at the loaded face is approximate, which is why the
//    summary reports hot spots by region rather than trusting one loaded-face
//    node.
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
  for (const load of job.loads) {
    const n = load.set.nodes.length;
    for (let dof = 0; dof < 3; dof++) {
      const total = load.force[dof];
      if (total === 0) continue;
      lines.push(`${load.set.name}, ${dof + 1}, ${num(total / n)}`);
    }
  }
  lines.push('*NODE FILE');
  lines.push('U');
  lines.push('*EL FILE');
  lines.push('S, ERR');
  lines.push(`*NODE PRINT, NSET=${job.fixed.name}, TOTALS=ONLY`);
  lines.push('RF');
  lines.push('*END STEP');
  return lines.join('\n') + '\n';
}
