// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/projectCurveRecord.ts
//
// Capture-time metadata for the `Shape.projectCurve({...})` face-authoring
// feature. A projectCurve record wraps a 2D sketch onto a 3D face using
// replicad's `drawing.sketchOnFace(face, scaleMode)`. Closed-curve source
// produces a face-bound `replicad.Sketch` consumed downstream by `.extrude(d)`
// / `.cut(...)` for engraved logos and label inserts.
//
// Open-curve mode (`asEdge: true`) is currently DEFERRED: the bundled
// `replicad-opencascadejs@kcad-v0.23.1` does not expose `BRepProj_Projection`,
// so the lowerer emits `feature.project-curve.no-intersection` with a
// deferred-feature message rather than attempting a synthesis pass.

import type { FaceRef } from './types';
import type { SketchCommand } from '../capture/sketchCommand';

/**
 * Source for the 2D curve to be projected onto a face.
 *
 * - `kind: 'sketchCommands'` — the same wire format produced by
 *    `path()...close()`; the lowerer rebuilds a `replicad.Drawing` and
 *    pipes it through `sketchOnFace`. Closed loops only at this slice.
 * - `kind: 'drawing'` — a serialized `replicad.Drawing` JSON snapshot.
 *    The lowerer currently emits `feature.kernel-failed` for this branch
 *    (round-trip drawing deserialization is a follow-up).
 */
export type ProjectCurveSource =
  | { kind: 'sketchCommands'; commands: readonly SketchCommand[] }
  | { kind: 'drawing'; drawingJson: string };

export type ProjectCurveScaleMode = 'original' | 'native' | 'bounds';

export interface ProjectCurveMetadata {
  /** 2D curve to wrap onto the face. */
  source: ProjectCurveSource;
  /** `Drawing.sketchOnFace` scaling mode. */
  scaleMode: ProjectCurveScaleMode;
  /** When `true`, project as an open wire (TopoDS_Edge) instead of as a
   *  face-bound closed sketch. CURRENTLY DEFERRED — lowerer emits a
   *  deferred-feature diagnostic until OCCT bindings ship
   *  `BRepProj_Projection`. */
  asEdge: boolean;
  /** Target face on the parent shape. */
  faceRef: FaceRef;
}

export function isProjectCurveMetadata(value: unknown): value is ProjectCurveMetadata {
  if (value === null || typeof value !== 'object') return false;
  const m = value as Partial<ProjectCurveMetadata>;
  if (m.source === null || typeof m.source !== 'object') return false;
  const src = m.source as { kind?: unknown };
  if (src.kind === 'sketchCommands') {
    const sc = m.source as { commands?: unknown };
    if (!Array.isArray(sc.commands)) return false;
  } else if (src.kind === 'drawing') {
    const sd = m.source as { drawingJson?: unknown };
    if (typeof sd.drawingJson !== 'string') return false;
  } else {
    return false;
  }
  if (m.scaleMode !== 'original' && m.scaleMode !== 'native' && m.scaleMode !== 'bounds') return false;
  if (typeof m.asEdge !== 'boolean') return false;
  if (m.faceRef === undefined || typeof m.faceRef !== 'object') return false;
  return true;
}
