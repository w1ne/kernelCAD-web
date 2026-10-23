// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/recordAnnotation.ts
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';
/**
 * Merge capture-time metadata onto the feature record behind `shape`.
 * Internal: joint helpers use it to declare intent that validators read
 * (a clearance cut that may legitimately remove nothing, fused joint
 * hardware). Not part of the script runtime surface.
 */
export function annotateShapeRecord(shape: Shape, meta: Record<string, unknown>): void {
  const session = (shape as unknown as { session: CaptureSession }).session;
  const record = session.getRecords().find(r => r.id === shape.id);
  if (record === undefined) {
    throw new Error(`annotateShapeRecord: feature record '${shape.id}' not found in session.`);
  }
  if (record.metadata === undefined) {
    (record as { metadata: Record<string, unknown> }).metadata = {};
  }
  Object.assign(record.metadata as Record<string, unknown>, meta);
}
