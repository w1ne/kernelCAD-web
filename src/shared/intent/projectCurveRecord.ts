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
  if (!isRecord(value)) return false;
  const m = value as Partial<ProjectCurveMetadata>;
  if (!isProjectCurveSource(m.source)) return false;
  if (!isProjectCurveScaleMode(m.scaleMode)) return false;
  if (typeof m.asEdge !== 'boolean') return false;
  if (m.asEdge && !hasValidOpenProjectionMetadata(m)) return false;
  return isRecord(m.faceRef);
}

function isProjectCurveSource(value: unknown): value is ProjectCurveSource {
  if (!isRecord(value)) return false;
  if (value.kind === 'sketchCommands') return Array.isArray(value.commands);
  if (value.kind === 'drawing') return typeof value.drawingJson === 'string';
  return false;
}

function isProjectCurveScaleMode(value: unknown): value is ProjectCurveScaleMode {
  return value === 'original' || value === 'native' || value === 'bounds';
}

function hasValidOpenProjectionMetadata(value: Partial<ProjectCurveMetadata>): boolean {
  if (!isRecord(value.source) || value.source.kind !== 'sketchCommands') return false;
  if (!isSourcePlane(value.sourcePlane) || !isVec3Array(value.direction)) return false;
  return isOpenCommandSequence(value.source.commands);
}

function isOpenCommandSequence(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 2) return false;
  if (value[0]?.kind !== 'moveTo') return false;
  return !value.slice(1).some((command) => command?.kind === 'moveTo' || command?.kind === 'close');
}

function isSourcePlane(value: unknown): value is ProjectCurveSourcePlane {
  if (!isRecord(value)) return false;
  return isVec3Array(value.origin) && isVec3Array(value.normal) && isVec3Array(value.xAxis);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isVec3Array(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 &&
    value.every((component) => typeof component === 'number' && Number.isFinite(component));
}
