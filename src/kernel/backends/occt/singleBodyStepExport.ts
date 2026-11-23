// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/singleBodyStepExport.ts
//
// Single-shape STEP export: one named product, with the shape colour when it
// has one. The scene path (sceneStepExport.ts) covers assemblies.

import { resolveColor } from '../../../shared/render/palette';
import { OcctBackend } from './occtBackend';
import { writeStepBody, type StepLengthUnit } from './stepAssemblyExport';

/**
 * STEP product name of a bare shape: the source file name without its
 * directory and script extension (`parts/motor-mount.kcad.ts` gives
 * `motor-mount`), the usual part-file convention. `part` when nothing is left.
 */
export function stepBodyName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const stem = base.replace(/\.kcad\.[cm]?[jt]s$/i, '').replace(/\.[cm]?[jt]s$/i, '').trim();
  return stem === '' ? 'part' : stem;
}

/**
 * Export one shape as a STEP file with a named product. `color` is a role
 * token or a `#rrggbb` literal; a value that is neither, or no value, writes
 * no colour. `unit` is the file's length unit (default `mm`). A backend
 * without an OCCT shape keeps its own millimetre STEP writer.
 */
export async function exportShapeToSTEPAsync(
  shape: OcctBackend,
  name: string,
  color?: string,
  unit: StepLengthUnit = 'mm',
): Promise<Uint8Array> {
  if (!(shape instanceof OcctBackend)) {
    if (unit !== 'mm') throw new Error(`STEP unit '${unit}' needs an OCCT shape; this backend writes millimetres only.`);
    return (shape as OcctBackend).exportSTEPAsync();
  }
  return writeStepBody({ shape: shape.getReplicadShape().wrapped, name, color: resolveColor(color) }, { unit });
}
