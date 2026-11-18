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
// Open-curve mode (`asEdge: true`) uses an explicit source-plane frame and
// projection direction. It returns Curve3D values, one for every resulting
// edge, rather than representing open edges as a closed Sketch.

import type { FaceRef, Vec3 } from './types';
import type { SketchCommand } from '../capture/sketchCommand';

/**
 * Source for the 2D curve to be projected onto a face.
 *
 * - `kind: 'sketchCommands'` — the path command wire format. Closed mode
 *    rebuilds a Drawing and wraps it with `sketchOnFace`; open mode accepts
 *    one unclosed path and projects it from an explicit world-space plane.
 * - `kind: 'drawing'` — a serialized `replicad.Drawing` JSON snapshot.
 *    The lowerer currently emits `feature.kernel-failed` for this branch
 *    (round-trip drawing deserialization is a follow-up).
 */
export type ProjectCurveSource =
  | { kind: 'sketchCommands'; commands: readonly SketchCommand[] }
  | { kind: 'drawing'; drawingJson: string };

export type ProjectCurveScaleMode = 'original' | 'native' | 'bounds';

/** Placement of an open 2D source path in world space. Coordinates and origin
 * are millimetres; xAxis and normal define the source frame. */
export interface ProjectCurveSourcePlane {
  origin: Vec3;
  normal: Vec3;
  xAxis: Vec3;
}

export interface ProjectCurveMetadata {
  /** 2D curve to wrap onto the face. */
  source: ProjectCurveSource;
  /** `Drawing.sketchOnFace` scaling mode. */
  scaleMode: ProjectCurveScaleMode;
  /** When `true`, project as an open wire and return Curve3D values. */
  asEdge: boolean;
  /** Required for open projection: placement of the 2D source path. */
  sourcePlane?: ProjectCurveSourcePlane;
  /** Required for open projection: world-space projection direction. */
  direction?: Vec3;
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
  if (m.asEdge) {
    const plane = m.sourcePlane as ProjectCurveSourcePlane | null | undefined;
    if (
      src.kind !== 'sketchCommands' ||
      plane === null || plane === undefined || typeof plane !== 'object' || Array.isArray(plane) ||
      !isVec3Array(plane.origin) ||
      !isVec3Array(plane.normal) || !isVec3Array(plane.xAxis) ||
      !isVec3Array(m.direction)
    ) return false;
    const commands = (m.source as { commands?: unknown }).commands;
    if (
      !Array.isArray(commands) || commands.length < 2 || commands[0]?.kind !== 'moveTo' ||
      commands.slice(1).some((command) => command?.kind === 'moveTo' || command?.kind === 'close')
    ) return false;
  }
  if (m.faceRef === null || m.faceRef === undefined || typeof m.faceRef !== 'object' || Array.isArray(m.faceRef)) return false;
  return true;
}

function isVec3Array(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 &&
    value.every((component) => typeof component === 'number' && Number.isFinite(component));
}
