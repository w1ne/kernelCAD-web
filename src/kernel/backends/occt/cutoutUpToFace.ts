// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `cutout(profile, { face, upToFace })` and `hole(s, { upToFace })`: the tool
// runs from its entry face until it reaches a planar target face of the body.
// The target plane may be inclined to the cut direction; the tool end follows
// that plane.
//
// The tool is a prism long enough to cross the body, trimmed by a half-space
// box on the far side of the target plane. When the target is an exit face
// (its outward normal points along the cut) the trim plane moves OVERSHOOT
// past it, as 'through' does, so the cut opens cleanly.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { pickFaceFromInput } from './edgeSelection';
import { surfaceTypeOf } from './createdRefs';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';

const OVERSHOOT = 0.01;
const PARALLEL_TOL = 1e-6;
const AHEAD_TOL = 1e-6;

export interface UpToFaceEntry {
  centroid: Vec3;
  axisIntoBody: Vec3;
}

export interface UpToFaceTool {
  tool: replicad.Shape3D;
  /** Entry → target plane distance on the axis through the entry origin. */
  effectiveDepth: number;
  /** True when the target is an exit face, so the cut opens through it. */
  through: boolean;
}

function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function addScaled(a: Vec3, b: Vec3, s: number): Vec3 { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }
function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len < 1e-12 ? [0, 0, 1] : [v[0] / len, v[1] / len, v[2] / len];
}
function perpendicular(n: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  return normalize([ref[1] * n[2] - ref[2] * n[1], ref[2] * n[0] - ref[0] * n[2], ref[0] * n[1] - ref[1] * n[0]]);
}

function upToFaceApi(feature: FeatureRecord): { api: string; example: string; operation: string } {
  if (feature.kind === 'hole') {
    return {
      api: 'hole(face, { upToFace })',
      example: "plate.hole('top', { u: 0, v: 0, diameter: 4, upToFace: 'bottom' })",
      operation: 'hole',
    };
  }
  if (feature.kind === 'holes') {
    return {
      api: 'holes(face, { upToFace })',
      example: "plate.holes('top', { positions: [{ u: 0, v: 0 }], diameter: 4, upToFace: 'bottom' })",
      operation: 'holes',
    };
  }
  if (feature.kind === 'pad') {
    return {
      api: 'pad(profile, { face, upToFace })',
      example: "plate.pad(profile, { face: 'top', upToFace: { kind: 'canonical', face: 'top' } })",
      operation: 'pad',
    };
  }
  return {
    api: 'cutout(profile, { face, upToFace })',
    example: "plate.cutout(profile, { face: 'top', upToFace: { kind: 'canonical', face: 'bottom' } })",
    operation: 'cutout',
  };
}

function invalid(
  feature: FeatureRecord,
  gotText: string,
  requires: string,
  hint: string,
): { error: CompilerDiagnostic } {
  const context = upToFaceApi(feature);
  return {
    error: {
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      ...invalidArgsText({
        api: context.api,
        path: 'opts.upToFace',
        gotText,
        requires,
        example: context.example,
        hint,
      }),
    },
  };
}

function bboxSpan(target: OcctBackend, origin: Vec3, axis: Vec3): { maxAlong: number; diagonal: number } {
  const bb = target.boundingBox();
  let maxAlong = 0;
  for (const x of [bb.min[0], bb.max[0]]) {
    for (const y of [bb.min[1], bb.max[1]]) {
      for (const z of [bb.min[2], bb.max[2]]) {
        maxAlong = Math.max(maxAlong, dot(sub([x, y, z], origin), axis));
      }
    }
  }
  const diagonal = Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]);
  return { maxAlong, diagonal };
}

function targetPlane(face: Face): { origin: Vec3; normal: Vec3 } {
  const c = face.center;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = (face as any).normalAt() as { x: number; y: number; z: number };
  return { origin: [c.x, c.y, c.z], normal: normalize([n.x, n.y, n.z]) };
}

/** Half-space solid: everything at or beyond `origin` along `away`, sized to
 *  contain the body and the tool. */
function halfSpaceBox(origin: Vec3, away: Vec3, size: number): replicad.Shape3D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plane = new (replicad as any).Plane(origin, perpendicular(away), away) as replicad.Plane;
  return replicad.drawRectangle(2 * size, 2 * size).sketchOnPlane(plane).extrude(size) as replicad.Shape3D;
}

/** Build a through-body tool and trim it at the `upToFace` target plane.
 *  `toolThroughBody(depth)` extends the tool from its entry face inward. */
export function buildUpToFaceTool(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  entry: UpToFaceEntry,
  toolThroughBody: (depth: number) => replicad.Shape3D,
  onToolBuildError?: (error: unknown) => CompilerDiagnostic,
): UpToFaceTool | { error: CompilerDiagnostic } {
  const context = upToFaceApi(feature);
  const face = pickFaceFromInput(feature, 'upToFace', target, records);
  if ('error' in face) return face;
  const surface = surfaceTypeOf(face);
  if (surface !== 'PLANE') {
    return invalid(
      feature,
      `${surface} face`,
      'only a planar target face of the body',
      "Pick a planar face of the body, or use depth (a number or 'through').",
    );
  }
  const axis = normalize(entry.axisIntoBody);
  const directionLabel = feature.kind === 'pad' ? 'pad direction' : 'cut direction';
  const { origin, normal } = targetPlane(face);
  const cos = dot(axis, normal);
  if (Math.abs(cos) < PARALLEL_TOL) {
    return invalid(
      feature,
      `a target plane parallel to the ${directionLabel}`,
      `a target plane that is not parallel to the ${directionLabel}, so the ${feature.kind === 'pad' ? 'pad reaches' : 'cut reaches'} it`,
      'Pick a face that crosses the feature axis, or use depth.',
    );
  }
  const away: Vec3 = cos > 0 ? normal : [-normal[0], -normal[1], -normal[2]];
  const effectiveDepth = dot(sub(origin, entry.centroid), away) / Math.abs(cos);
  if (!(effectiveDepth > AHEAD_TOL)) {
    return invalid(
      feature,
      `${effectiveDepth.toFixed(4)} mm along the ${directionLabel}`,
      'a target plane strictly ahead of the entry face; behind or on the entry face is invalid',
      `Pick a face ahead of the entry face along the ${directionLabel}.`,
    );
  }
  const through = cos > 0;
  const { maxAlong, diagonal } = bboxSpan(target, entry.centroid, axis);
  const toolDepth = Math.max(maxAlong, effectiveDepth) + OVERSHOOT;
  const size = 4 * (diagonal + toolDepth);
  let longTool: replicad.Shape3D;
  try {
    longTool = toolThroughBody(toolDepth);
  } catch (e) {
    if (onToolBuildError) return { error: onToolBuildError(e) };
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: {
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: feature.id,
        severity: 'error',
        message: `${context.operation}: could not build the tool before trimming at the upToFace plane: ${msg}`,
        hint: 'Check the feature dimensions and that its profile or bore intersects the entry face.',
      },
    };
  }
  try {
    // A cut opens cleanly when it overshoots an exit face. A pad must end
    // exactly on the target plane: overshoot would leave a 0.01 mm cap beyond
    // the face the author selected.
    const overshoot = feature.kind === 'pad' ? 0 : OVERSHOOT;
    const trimOrigin = addScaled(origin, away, through ? overshoot : 0);
    const tool = longTool.cut(halfSpaceBox(trimOrigin, away, size)) as replicad.Shape3D;
    return { tool, effectiveDepth, through };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: {
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: feature.id,
        severity: 'error',
        message: `${context.operation}: trimming the tool at the upToFace plane failed: ${msg}`,
        hint: 'Check that the feature lies on the entry face and the target face crosses the cut.',
      },
    };
  }
}
