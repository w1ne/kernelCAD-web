// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/sceneStlFuse.ts
//
// Cost gate for the single-mesh STL of a multi-part Scene.
//
// STL has no part structure, so a Scene is fused (world-frame boolean union)
// before meshing. Meshing is cheap — the 24-turn M8 bolt-and-nut cookbook
// meshes both parts in about 3 s — but the fuse is not: every free-form face
// of one part is intersected with every overlapping free-form face of the
// other, and a threaded bolt inside its threaded nut is 144 × 37 helical
// B-spline faces stacked in the same cylinder. That boolean ran for many
// minutes while STEP and 3MF of the same Scene (no fuse) took under one.
//
// When the overlapping free-form face pairs between two parts exceed a budget,
// the STL ships each part as its own closed shell instead — the same bytes a
// fuse gives for parts that only touch or sit with clearance, and a union
// that every slicer computes itself for parts that overlap.

import { meshShapeForExport } from '../../kernel/backends/occt/backendMesh';
import { encodeBinaryStl } from '../../kernel/backends/occt/exportStlBinary';
import { verifyWatertight } from '../../kernel/backends/occt/meshHeal';
import type { WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { stlNotWatertightDiagnostic } from './exportDiagnostics';

/** Overlapping free-form face pairs between two parts above which the fuse is
 *  skipped. A lofted handle on a lofted body is a few pairs; two threaded
 *  parts are hundreds. */
export const FREEFORM_FUSE_PAIR_BUDGET = 64;

const FREEFORM_SURFACES: ReadonlySet<string> = new Set([
  'BSPLINE_SURFACE', 'BEZIER_SURFACE', 'OFFSET_SURFACE', 'OTHER_SURFACE',
]);

type Box = readonly [readonly [number, number, number], readonly [number, number, number]];

export interface FreeformFuseCost {
  readonly partA: string;
  readonly partB: string;
  /** Free-form face pairs (one face from each part) whose boxes overlap. */
  readonly pairs: number;
}

/**
 * The most expensive part pair for a fuse, measured as overlapping free-form
 * face pairs, or `undefined` when no pair exceeds `FREEFORM_FUSE_PAIR_BUDGET`
 * (fuse as before).
 */
export function freeformFuseOverBudget(parts: readonly WorldFramePart[]): FreeformFuseCost | undefined {
  const perPart = parts.map((p) => ({
    name: p.name,
    box: shapeBox(p),
    freeform: freeformFaceBoxes(p),
  }));
  let worst: FreeformFuseCost | undefined;
  for (let i = 0; i < perPart.length; i++) {
    for (let j = i + 1; j < perPart.length; j++) {
      const a = perPart[i];
      const b = perPart[j];
      if (a.freeform.length === 0 || b.freeform.length === 0) continue;
      if (a.box === undefined || b.box === undefined || !boxesOverlap(a.box, b.box)) continue;
      let pairs = 0;
      for (const fa of a.freeform) {
        for (const fb of b.freeform) if (boxesOverlap(fa, fb)) pairs++;
      }
      if (pairs > FREEFORM_FUSE_PAIR_BUDGET && (worst === undefined || pairs > worst.pairs)) {
        worst = { partA: a.name, partB: b.name, pairs };
      }
    }
  }
  return worst;
}

/** Mesh every part on its own and concatenate the meshes (index-offset). */
export function meshPartsAsShells(parts: readonly WorldFramePart[]): { vertices: number[]; triangles: number[] } {
  const vertices: number[] = [];
  const triangles: number[] = [];
  for (const p of parts) {
    const m = meshShapeForExport(p.shape.getReplicadShape());
    const offset = vertices.length / 3;
    for (const v of m.vertices) vertices.push(v);
    for (const t of m.triangles) triangles.push(t + offset);
  }
  return { vertices, triangles };
}

function shapeBox(p: WorldFramePart): Box | undefined {
  try {
    const b = p.shape.boundingBox();
    return [b.min, b.max];
  } catch {
    return undefined;
  }
}

function freeformFaceBoxes(p: WorldFramePart): Box[] {
  const out: Box[] = [];
  for (const face of p.shape.getReplicadShape().faces) {
    let type: string;
    try {
      type = face.geomType;
    } catch {
      continue;
    }
    if (!FREEFORM_SURFACES.has(type)) continue;
    try {
      const [min, max] = face.boundingBox.bounds;
      out.push([min, max]);
    } catch {
      // A face without a box cannot be priced; skip it.
    }
  }
  return out;
}

function boxesOverlap(a: Box, b: Box): boolean {
  for (let k = 0; k < 3; k++) {
    if (a[1][k] < b[0][k] || b[1][k] < a[0][k]) return false;
  }
  return true;
}

/**
 * STL of a multi-part Scene as per-part closed shells, for a Scene whose fuse
 * is over the free-form budget. Carries a warning that names the part pair
 * and why the fuse was skipped; a shell that does not close still fails the
 * export exactly like the fused path.
 */
export function exportSceneStlAsShells(
  worldParts: readonly WorldFramePart[],
  cost: FreeformFuseCost,
  targetId: string,
  diagnostics: readonly CompilerDiagnostic[],
  featureCount: number,
  verify: boolean,
): { bytes: Uint8Array; featureCount: number; diagnostics: CompilerDiagnostic[] } {
  const mesh = meshPartsAsShells(worldParts);
  const report = verifyWatertight(mesh);
  const bytes = Uint8Array.from(encodeBinaryStl(mesh));
  const skipped: CompilerDiagnostic = {
    target: 'export-occt',
    code: 'export.stl.fuse-skipped',
    featureId: targetId,
    severity: 'warn',
    message:
      `STL: parts '${cost.partA}' and '${cost.partB}' share ${cost.pairs} overlapping free-form face pairs ` +
      `(budget ${FREEFORM_FUSE_PAIR_BUDGET}), so fusing them into one solid would take minutes. ` +
      `Wrote each of the ${worldParts.length} parts as its own closed shell instead; slicers union overlapping shells.`,
    hint: HINT_TEMPLATES['export.stl.fuse-skipped'].template,
    nextAction: NEXT_ACTIONS['export.stl.fuse-skipped'],
  };
  const out = [...diagnostics, skipped];
  if (verify && !report.ok) out.push(stlNotWatertightDiagnostic(report, targetId));
  return { bytes, featureCount, diagnostics: out };
}
