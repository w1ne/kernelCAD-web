// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/projectCurveLowerer.ts
//
// Lower a W3 `projectCurve` FeatureRecord.
//
// Closed-curve mode (default):
//   1. Resolve target face on the parent body.
//   2. Build a `replicad.Drawing` from the source (SketchCommand[] today;
//      serialized-drawing JSON is a follow-up).
//   3. `drawing.sketchOnFace(face, scaleMode)` to wrap onto the face.
//   4. Return a sketch-tagged OcctBackend via `OcctBackend.fromFaceBoundSketch`.
//      Downstream `.extrude(d)` / `.cut(...)` consume it via the existing
//      sketch pipeline.
//
// Open-wire mode is lowered by `lowerProjectCurveEdges`, which projects onto
// exactly one selected face and returns every resulting edge. `Shape.projectCurve`
// exposes those edges as Curve3D[]; this feature lowerer remains the closed
// Sketch-to-Shape path used by recompute.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { Drawing, Face } from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic, DiagnosticCode } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../kernel/backends/occt/edgeSelection';
import {
  isProjectCurveMetadata,
  type ProjectCurveMetadata,
  type ProjectCurveSourcePlane,
} from '../../../shared/intent/projectCurveRecord';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { drawingFromCommands, drawingFromOpenCommands } from '../../../kernel/backends/occt/sketchToDrawing';
import { edgeToCurve3DMetadata } from './surfaceIntersection';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

export interface LowerProjectCurveOk { ok: true; backend: OcctBackend; }
export interface LowerProjectCurveErr { ok: false; diagnostics: CompilerDiagnostic[]; }

export async function lowerProjectCurve(
  r: FeatureRecord,
  parent: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): Promise<LowerProjectCurveOk | LowerProjectCurveErr> {
  const diagnostics: CompilerDiagnostic[] = [];

  // Surface any capture-time diagnostics. Refuse to lower on any error.
  if (stampStashedProjectCurveDiagnostics(r, diagnostics)) {
    return { ok: false, diagnostics };
  }

  const meta = validateProjectCurveMetadata(r, diagnostics);
  if (meta === undefined) {
    return { ok: false, diagnostics };
  }

  // Open projection returns Curve3D[] from the asynchronous Shape API and is
  // not a ShapeBackend feature. Refuse malformed records that bypassed it.
  if (meta.asEdge) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: 'projectCurve: open projection returns Curve3D[] and must be awaited at capture time; it cannot be lowered as a Shape feature.',
      hint: "Write `const curves = await shape.projectCurve({ ..., asEdge: true, sourcePlane, direction })`; use a returned Curve3D as a sweep spine.",
    });
    return { ok: false, diagnostics };
  }

  // 1. Resolve target face.
  const face = resolveProjectCurveFace(r, parent, records, diagnostics);
  if (face === undefined) {
    return { ok: false, diagnostics };
  }

  // 2. Build a Drawing from the source.
  const drawing = buildProjectCurveDrawing(r, meta, diagnostics);
  if (drawing === undefined) {
    return { ok: false, diagnostics };
  }

  // 3-4. sketchOnFace and wrap as a sketch-tagged OcctBackend.
  const backend = applyProjectCurveSketchOnFace(r, meta, drawing, face, diagnostics);
  if (backend === undefined) {
    return { ok: false, diagnostics };
  }
  return { ok: true, backend };
}

export interface LowerProjectCurveEdgesOk {
  ok: true;
  /** One Curve3D per face-intersection edge, including every fragment. */
  curves: Curve3DMetadata[];
}

export interface LowerProjectCurveEdgesErr {
  ok: false;
  diagnostics: CompilerDiagnostic[];
}

/** Project one open 2D path onto a single selected face. Traverse the complete
 * OCCT result compound so every projected wire and every edge in each fragment
 * is returned to the caller. */
export function lowerProjectCurveEdges(
  commands: readonly SketchCommand[],
  face: Face,
  sourcePlane: ProjectCurveSourcePlane,
  direction: Vec3,
  featureId: string,
): LowerProjectCurveEdgesOk | LowerProjectCurveEdgesErr {
  const diagnostic = (code: DiagnosticCode, message: string, hint: string): LowerProjectCurveEdgesErr => ({
    ok: false,
    diagnostics: [{ target: 'export-occt', code, featureId, severity: 'error', message, hint }],
  });

  if (!isSourcePlane(sourcePlane) || !finiteVec3(direction)) {
    return diagnostic(
      'feature.invalid-args',
      'projectCurve: sourcePlane.origin, sourcePlane.normal, sourcePlane.xAxis and direction must be finite Vec3 values.',
      'Pass an origin in mm, finite source-plane axes and a finite world-space projection direction.',
    );
  }

  const normal = unitVector(sourcePlane.normal);
  const rawXAxis = unitVector(sourcePlane.xAxis);
  const projectDirection = unitVector(direction);
  if (normal === undefined || rawXAxis === undefined || projectDirection === undefined) {
    return diagnostic(
      'feature.invalid-args',
      'projectCurve: sourcePlane.origin, sourcePlane.normal, sourcePlane.xAxis and direction must be finite Vec3 values; the three direction vectors must be non-zero.',
      'Pass an origin in mm, a non-zero normal and xAxis for the source plane, and a non-zero world-space direction.',
    );
  }
  const xAxis = unitVector([
    rawXAxis[0] - normal[0] * dot(rawXAxis, normal),
    rawXAxis[1] - normal[1] * dot(rawXAxis, normal),
    rawXAxis[2] - normal[2] * dot(rawXAxis, normal),
  ]);
  if (xAxis === undefined) {
    return diagnostic(
      'feature.invalid-args',
      'projectCurve: sourcePlane.xAxis cannot be parallel to sourcePlane.normal.',
      'Choose a sourcePlane.xAxis direction that lies in the source plane.',
    );
  }

  let drawing: Drawing;
  try {
    drawing = drawingFromOpenCommands(commands);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return diagnostic(
      'feature.invalid-args',
      `projectCurve: invalid open source path: ${message}`,
      'Pass one open path with one moveTo and at least one segment; do not include close or a second moveTo.',
    );
  }

  const plane = new replicad.Plane(sourcePlane.origin, xAxis, normal);
  let sourceSketch: (replicad.SketchInterface & { delete?: () => void }) | undefined;
  // OCCT's generated wasm bindings are dynamically typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let directionObject: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projectedShape: any;
  try {
    sourceSketch = drawing.sketchOnPlane(plane) as unknown as replicad.SketchInterface & { delete?: () => void };
    const sourceWire = (sourceSketch as unknown as { wire?: { wrapped?: unknown } }).wire?.wrapped;
    const targetFace = (face as unknown as { wrapped?: unknown }).wrapped;
    if (sourceWire === undefined || targetFace === undefined) {
      return diagnostic(
        'feature.kernel-failed',
        'projectCurve: could not obtain the source wire or selected target face for projection.',
        'Check that the source path is a single open wire and that the face selector resolves to one B-rep face.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    directionObject = new oc.gp_Dir_4(...projectDirection);
    projection = new oc.BRepProj_Projection_1(sourceWire, targetFace, directionObject);
    if (!projection.IsDone()) {
      return diagnostic(
        'feature.kernel-failed',
        'projectCurve: OCCT did not complete the open-wire projection.',
        'Check the selected face, source-plane placement and projection direction.',
      );
    }

    const curves: Curve3DMetadata[] = [];
    projectedShape = projection.Shape();
    const explorer = new oc.TopExp_Explorer_2(
      projectedShape,
      oc.TopAbs_ShapeEnum.TopAbs_EDGE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    try {
      for (; explorer.More(); explorer.Next()) {
        const current = explorer.Current();
        const edge = oc.TopoDS.Edge_1(current);
        try {
          curves.push(edgeToCurve3DMetadata(edge));
        } finally {
          edge.delete?.();
          current.delete?.();
        }
      }
    } finally {
      explorer.delete();
    }
    if (curves.length === 0) {
      return diagnostic(
        'feature.project-curve.no-intersection',
        'projectCurve: the open source path did not intersect the selected face in the requested direction.',
        'Move the sourcePlane or reverse/adjust direction so the projected path crosses the selected face.',
      );
    }
    return { ok: true, curves };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return diagnostic(
      'feature.kernel-failed',
      `projectCurve: open-wire projection failed: ${message}`,
      'Check the source path, sourcePlane frame, selected face and projection direction.',
    );
  } finally {
    projectedShape?.delete?.();
    projection?.delete?.();
    directionObject?.delete?.();
    sourceSketch?.delete?.();
    plane.delete();
  }
}

function isSourcePlane(value: unknown): value is ProjectCurveSourcePlane {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const plane = value as Record<string, unknown>;
  return finiteVec3(plane.origin) && finiteVec3(plane.normal) && finiteVec3(plane.xAxis);
}

function finiteVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 &&
    value.every((component) => typeof component === 'number' && Number.isFinite(component));
}

function unitVector(value: unknown): Vec3 | undefined {
  if (!finiteVec3(value)) return undefined;
  const length = Math.hypot(...value);
  if (length < 1e-12) return undefined;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Stamp capture-time diagnostics stashed on `metadata.diagnostics`; true when
 *  any of them is an error. */
function stampStashedProjectCurveDiagnostics(r: FeatureRecord, diagnostics: CompilerDiagnostic[]): boolean {
  const stashed = (r.metadata as { diagnostics?: CompilerDiagnostic[] } | undefined)?.diagnostics;
  if (stashed && stashed.length > 0) {
    diagnostics.push(...stashed);
    if (stashed.some((d) => d.severity === 'error')) {
      return true;
    }
  }
  return false;
}

/** Validate metadata, pushing the invalid-args error; undefined when invalid. */
function validateProjectCurveMetadata(
  r: FeatureRecord,
  diagnostics: CompilerDiagnostic[],
): ProjectCurveMetadata | undefined {
  if (!isProjectCurveMetadata(r.metadata)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `projectCurve record '${r.id}' is missing valid metadata.`,
      hint: 'Build the record via Shape.projectCurve({...}) so the validators run.',
    });
    return undefined;
  }
  return r.metadata;
}

/** Resolve the target face, pushing the pick error; undefined when missing. */
function resolveProjectCurveFace(
  r: FeatureRecord,
  parent: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  diagnostics: CompilerDiagnostic[],
): Face | undefined {
  const faceResult = pickFace(r, parent, records);
  if ('error' in faceResult) {
    diagnostics.push(faceResult.error);
    return undefined;
  }
  return faceResult;
}

/** Build the source Drawing, pushing the empty/unsupported/kernel-failed error;
 *  undefined when the build failed. */
function buildProjectCurveDrawing(
  r: FeatureRecord,
  meta: ProjectCurveMetadata,
  diagnostics: CompilerDiagnostic[],
): Drawing | undefined {
  try {
    if (meta.source.kind === 'sketchCommands') {
      if (meta.source.commands.length === 0) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.project-curve.curve-empty',
          featureId: r.id,
          severity: 'error',
          message: 'projectCurve: source.commands is empty; nothing to project.',
          hint: HINT_TEMPLATES['feature.project-curve.curve-empty'].template,
        });
        return undefined;
      }
      return drawingFromCommands(meta.source.commands);
    } else {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: 'projectCurve: source.kind === "drawing" (serialized JSON) is not yet supported.',
        hint: 'Use source: { kind: "sketchCommands", commands: [...] } for now; serialized-drawing input is a v0.X follow-up.',
      });
      return undefined;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `projectCurve drawing build failed: ${msg}`,
      hint: 'projectCurve.source.commands rejected by the drawing builder — verify the path is closed and uses supported segment kinds.',
    });
    return undefined;
  }
}

/** sketchOnFace + sketch-tagged OcctBackend; undefined when the wrap failed. */
function applyProjectCurveSketchOnFace(
  r: FeatureRecord,
  meta: ProjectCurveMetadata,
  drawing: Drawing,
  face: Face,
  diagnostics: CompilerDiagnostic[],
): OcctBackend | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sketch = (drawing as any).sketchOnFace(face, meta.scaleMode);
    return OcctBackend.fromFaceBoundSketch(sketch);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isFaceFit = /bounds|too\s*small|fit|intersect/i.test(msg);
    diagnostics.push({
      target: 'export-occt',
      code: isFaceFit ? 'feature.project-curve.no-intersection' : 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `projectCurve sketchOnFace failed: ${msg}`,
      hint: isFaceFit
        ? HINT_TEMPLATES['feature.project-curve.no-intersection'].template
        : 'OCCT could not wrap the curve onto the face — verify the face is planar (for scaleMode=original) and the curve fits within the face bounds.',
    });
    return undefined;
  }
}
