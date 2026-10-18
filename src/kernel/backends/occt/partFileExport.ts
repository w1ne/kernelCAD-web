// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/partFileExport.ts
//
// Single-part file bytes for the order pack: one body per file (the format
// every instant-quote shop requires). STEP reuses the XCAF writer behind
// exportSceneToSTEPAsync; STL reuses the exact production exportPartTool
// already ships; DXF takes a holes-aware flattened sheet region straight to
// the polyline writer.

import { writeStepAssembly } from './stepAssemblyExport';
import { exportDxf } from './exportDxf';
import type { OcctBackend } from './occtBackend';
import { meshShapeForExport } from './backendMesh';
import { encodeBinaryStl, type MeshData } from './exportStlBinary';
import type { Region } from '../../../shared/intent/region';

/**
 * The captured-Shape surface this module needs — modeling's `Shape` before
 * lowering. Kernel modules may not import `modeling/capture/*` (layering:
 * shared → kernel → modeling → …), so bind structurally: anything whose
 * `lower()` resolves to an OCCT backend, i.e. `Shape.lower()`.
 */
export interface LowerablePartShape {
  lower(): Promise<OcctBackend>;
}

/**
 * Single-body STEP bytes for one part, in its origin frame. `shape` is the
 * captured Shape (pre-assembly-placement), so the file ships the part in
 * local coordinates — what a quote shop quotes. `name` becomes the STEP
 * body name; the neutral gray keeps the body readable without implying a
 * material.
 */
export async function partStepBytes(shape: LowerablePartShape, name: string): Promise<Uint8Array> {
  const lowered = await shape.lower();
  return writeStepAssembly([
    { shape: lowered.getReplicadShape().wrapped, name, color: '#b0b0b0' },
  ]);
}

/**
 * Binary STL bytes for one lowered part. This is the exact byte production
 * the `export_part` path (`runAndExportParts`) ships: export-grade mesh via
 * `meshShapeForExport` + `encodeBinaryStl` with the attribution header.
 * `mesh` lets a caller that already meshed for the watertight report reuse
 * that mesh instead of tessellating twice.
 */
export function partStlBytes(lowered: OcctBackend, mesh?: MeshData): Uint8Array {
  const m = mesh ?? meshShapeForExport(lowered.getReplicadShape());
  return Uint8Array.from(encodeBinaryStl({ vertices: m.vertices, triangles: m.triangles }));
}

/**
 * DXF bytes for an already-flattened sheet region (holes included — the
 * caller builds it with the holes-aware modeling API,
 * `flattenPatternWithHoles`, so cutouts survive; bare kernel
 * `flattenPattern` is outline+bends only).
 */
export function partDxfBytes(region: Region): Uint8Array {
  return exportDxf({ kind: 'region', region }, { format: 'dxf' });
}
