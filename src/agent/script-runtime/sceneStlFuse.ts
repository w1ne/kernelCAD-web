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

import { exportMeshDeflection, meshShapeForExport, type ExportMeshDeflection, type ExportMeshToleranceOptions, type MeshDeviationReport } from '../../kernel/backends/occt/backendMesh';
import { encodeBinaryStlShellsBytes, stampStlMeshTolerance } from '../../kernel/backends/occt/exportStlBinary';
import { verifyWatertight, type WatertightReport } from '../../kernel/backends/occt/meshHeal';
import type { WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { meshToleranceNotMetDiagnostic, stlNotWatertightDiagnostic } from './exportDiagnostics';
import { measureBrepSurfaceDeviationFromBinaryStl } from './meshDeviation';
import type { ExportResult } from './export';
import { crackSeams, describeCrackSeams } from './sceneStlSeams';

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

/** One closed mesh per part, in part order. */
export type PartShells = readonly { vertices: Float64Array; triangles: Uint32Array }[];

/**
 * Mesh every part on its own. The shells stay separate typed arrays: a part
 * shares no vertex with another part, so the STL and the watertight report of
 * the list equal those of the index-offset concatenation, which a dense
 * assembly cannot afford to hold next to the STL bytes.
 */
export function meshPartsAsShells(
  parts: readonly WorldFramePart[],
  deflection?: ExportMeshDeflection,
): PartShells {
  return parts.map((p) => {
    const m = meshShapeForExport(p.shape.getReplicadShape(), deflection);
    return { vertices: Float64Array.from(m.vertices), triangles: Uint32Array.from(m.triangles) };
  });
}

/** `verifyWatertight` over all shells: counts summed, the 5 largest clusters kept. */
export function verifyShellsWatertight(shells: PartShells): WatertightReport {
  const reports = shells.map(shell => verifyWatertight(shell));
  if (reports.every(report => report.ok)) return { ok: true, openEdgeCount: 0, nonManifoldEdgeCount: 0, clusters: [] };
  return {
    ok: false,
    openEdgeCount: reports.reduce((n, report) => n + report.openEdgeCount, 0),
    nonManifoldEdgeCount: reports.reduce((n, report) => n + report.nonManifoldEdgeCount, 0),
    clusters: reports.flatMap(report => report.clusters).sort((x, y) => y.edgeCount - x.edgeCount).slice(0, 5),
  };
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
  options?: ExportMeshToleranceOptions,
): { bytes: Uint8Array; featureCount: number; diagnostics: CompilerDiagnostic[]; mesh_deviation?: MeshDeviationReport } {
  const requested = options?.tolerance;
  const initialDeflection = requested === undefined
    ? exportMeshDeflection(options)
    : exportMeshDeflection({ angularToleranceDeg: options?.angularToleranceDeg });
  let mesh = meshPartsAsShells(worldParts, initialDeflection);
  let report = verifyShellsWatertight(mesh);
  let bytes: Uint8Array<ArrayBufferLike> = encodeBinaryStlShellsBytes(mesh);
  let mesh_deviation: MeshDeviationReport | undefined;
  if (requested !== undefined) {
    mesh_deviation = measureBrepSurfaceDeviationFromBinaryStl(
      worldParts.map(part => part.shape.getReplicadShape()),
      bytes,
      requested,
    );
    if (mesh_deviation.measured_max_mm > requested * 1.05) {
      mesh = meshPartsAsShells(worldParts, exportMeshDeflection(options));
      report = verifyShellsWatertight(mesh);
      bytes = encodeBinaryStlShellsBytes(mesh);
      mesh_deviation = measureBrepSurfaceDeviationFromBinaryStl(
        worldParts.map(part => part.shape.getReplicadShape()),
        bytes,
        requested,
      );
    }
    bytes = stampStlMeshTolerance(bytes, requested);
  }
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
  if (mesh_deviation !== undefined && mesh_deviation.measured_max_mm > requested! * 1.05) {
    out.push(meshToleranceNotMetDiagnostic(mesh_deviation, targetId));
  }
  if (verify && !report.ok) out.push(stlNotWatertightDiagnostic(report, targetId));
  return { bytes, featureCount, diagnostics: out, ...(mesh_deviation === undefined ? {} : { mesh_deviation }) };
}

/** `exportFused` writes the torn fused STL again. It runs only when the
 *  per-part shells do not close, so the fused bytes are not held while the
 *  shells are meshed. */
export async function exportFusedSeamFallback(
  worldParts: readonly WorldFramePart[],
  exportFused: () => Promise<{ bytes: Uint8Array; mesh_deviation?: MeshDeviationReport }>,
  fusedReport: ReturnType<typeof verifyWatertight>,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  options?: ExportMeshToleranceOptions,
): Promise<ExportResult> {
  const seams = describeCrackSeams(crackSeams(
    fusedReport,
    worldParts.map(part => ({ name: part.name, bbox: part.shape.boundingBox() })),
  ));
  const fallback = watertightSeamShells(worldParts, options);
  if (fallback !== undefined) {
    const toleranceFailure = meshToleranceFailure(fallback.mesh_deviation, targetId);
    return {
      bytes: fallback.bytes,
      featureCount,
      diagnostics: [
        ...diagnostics,
        seamFallbackDiagnostic(worldParts.length, fusedReport, seams, targetId),
        ...(toleranceFailure === undefined ? [] : [toleranceFailure]),
      ],
      ...(fallback.mesh_deviation === undefined ? {} : { mesh_deviation: fallback.mesh_deviation }),
    };
  }
  const base = stlNotWatertightDiagnostic(fusedReport, targetId);
  const { bytes: fusedBytes, mesh_deviation: fusedDeviation } = await exportFused();
  const toleranceFailure = meshToleranceFailure(fusedDeviation, targetId);
  return {
    bytes: fusedBytes,
    featureCount,
    diagnostics: [
      ...diagnostics,
      { ...base, message: `${base.message} Seams: ${seams}.` },
      ...(toleranceFailure === undefined ? [] : [toleranceFailure]),
    ],
    ...(fusedDeviation === undefined ? {} : { mesh_deviation: fusedDeviation }),
  };
}

function watertightSeamShells(
  worldParts: readonly WorldFramePart[],
  options?: ExportMeshToleranceOptions,
): { bytes: Uint8Array; mesh_deviation?: MeshDeviationReport } | undefined {
  if (worldParts.length <= 1) return undefined;
  const tolerance = options?.tolerance;
  const initialDeflection = tolerance === undefined
    ? exportMeshDeflection(options)
    : exportMeshDeflection({ angularToleranceDeg: options?.angularToleranceDeg });
  let shells = meshPartsAsShells(worldParts, initialDeflection);
  if (!verifyShellsWatertight(shells).ok) return undefined;
  let bytes: Uint8Array = encodeBinaryStlShellsBytes(shells);
  let mesh_deviation = measureShellDeviation(worldParts, bytes, tolerance);
  if (deviationExceedsTolerance(mesh_deviation)) {
    shells = meshPartsAsShells(worldParts, exportMeshDeflection(options));
    if (!verifyShellsWatertight(shells).ok) return undefined;
    bytes = encodeBinaryStlShellsBytes(shells);
    mesh_deviation = measureShellDeviation(worldParts, bytes, tolerance);
  }
  if (tolerance !== undefined) bytes = stampStlMeshTolerance(bytes, tolerance);
  return { bytes, ...(mesh_deviation === undefined ? {} : { mesh_deviation }) };
}

function measureShellDeviation(
  worldParts: readonly WorldFramePart[],
  bytes: Uint8Array,
  tolerance: number | undefined,
): MeshDeviationReport | undefined {
  return tolerance === undefined
    ? undefined
    : measureBrepSurfaceDeviationFromBinaryStl(
        worldParts.map(part => part.shape.getReplicadShape()),
        bytes,
        tolerance,
      );
}

function deviationExceedsTolerance(report: MeshDeviationReport | undefined): boolean {
  return report !== undefined && report.measured_max_mm > report.requested_mm * 1.05;
}

function seamFallbackDiagnostic(
  partCount: number,
  fusedReport: ReturnType<typeof verifyWatertight>,
  seams: string,
  targetId: string,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.mesh.fused-seam-fallback',
    featureId: targetId,
    severity: 'warn',
    message: `The fused union of the ${partCount} parts meshed with ${fusedReport.openEdgeCount} open edge(s) (${seams}). Shipped each part as its own closed shell instead: the STL is watertight and slices as the union.`,
    hint: HINT_TEMPLATES['export.mesh.fused-seam-fallback'].template,
    nextAction: NEXT_ACTIONS['export.mesh.fused-seam-fallback'],
  };
}

function meshToleranceFailure(
  report: MeshDeviationReport | undefined,
  targetId: string,
): CompilerDiagnostic | undefined {
  if (report === undefined || report.measured_max_mm <= report.requested_mm * 1.05) return undefined;
  return meshToleranceNotMetDiagnostic(report, targetId);
}
