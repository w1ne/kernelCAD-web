// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/partFileExport.ts
//
// Single-part file bytes for the order pack: one body per file (the format
// every instant-quote shop requires). STEP reuses the XCAF writer behind
// exportSceneToSTEPAsync; STL reuses the exact byte production
// `runAndExportParts` (behind the export_part MCP tool) already ships; DXF
// takes a holes-aware flattened sheet region straight to the polyline writer.

import type { Shape3D } from 'replicad';
import { writeStepAssembly } from './stepAssemblyExport';
import { exportDxf } from './exportDxf';
import { meshShapeForExport } from './backendMesh';
import { encodeBinaryStl, type MeshData } from './exportStlBinary';
import { stampStepOriginatingSystem } from '../../export/stepHeader';
import { attributionGenerator } from '../../../shared/links/attribution';
import type { Region } from '../../../shared/intent/region';

/**
 * What this module needs from a lowered part backend: its replicad handle.
 * Kernel modules may not import `modeling/capture/*` (layering: shared →
 * kernel → modeling → …) and this module must not bind back to the concrete
 * `OcctBackend` (it is imported BY occtBackend now), so both surfaces bind
 * structurally — `OcctBackend` / `Shape.lower()`'s result satisfy this.
 */
export interface LoweredPartShape {
  getReplicadShape(): Shape3D;
}

/**
 * The captured-Shape surface this module needs — modeling's `Shape` before
 * lowering, i.e. anything whose `lower()` resolves to a lowered backend.
 */
export interface LowerablePartShape {
  lower(): Promise<LoweredPartShape>;
}

/**
 * Single-body STEP bytes for one part, in its origin frame. `shape` is the
 * captured Shape (pre-assembly-placement), so the file ships the part in
 * local coordinates — what a quote shop quotes. `name` becomes the STEP
 * body name; the neutral gray keeps the body readable without implying a
 * material. The HEADER gets the same kernelCAD originating_system stamp
 * every other STEP export path writes (ATTRIBUTION.md).
 */
export async function partStepBytes(shape: LowerablePartShape, name: string): Promise<Uint8Array> {
  const lowered = await shape.lower();
  const bytes = writeStepAssembly([
    { shape: lowered.getReplicadShape().wrapped, name, color: '#b0b0b0' },
  ]);
  return stampStepOriginatingSystem(bytes, attributionGenerator());
}

/**
 * Binary STL bytes for one lowered part. This is the exact byte production
 * the `export_part` path (`runAndExportParts`) ships: export-grade mesh via
 * `meshShapeForExport` + `encodeBinaryStl` with the attribution header.
 * `mesh` lets a caller that already meshed for the watertight report reuse
 * that mesh instead of tessellating twice.
 */
export function partStlBytes(lowered: LoweredPartShape, mesh?: MeshData): Uint8Array {
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
