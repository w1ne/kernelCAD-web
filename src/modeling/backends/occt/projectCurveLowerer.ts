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
// Open-wire mode (`asEdge: true`): NOT IMPLEMENTED (not "unavailable").
//
// This used to read "the bundled OCCT does not expose BRepProj_Projection".
// That stopped being true in `kcad-v0.25.0`, which bundles the symbol; it is
// verified callable by `projectionBindingAvailable.test.ts`, which also carries
// the working recipe. What is missing is the kernelCAD side, and the blocker is
// a type question rather than a geometry one: cylindrical projection of an open
// wire yields N wires (2 for a line across a box — it hits the far side too),
// and `projectCurve` is declared `=> Sketch`. There is no honest Sketch to
// return. Implementing this means picking a return shape — most likely a
// separate `projectEdges()` returning wires, plus a rule for which of the N
// wires the caller wanted. Until that is decided, we reject rather than guess.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { isProjectCurveMetadata, type ProjectCurveMetadata } from '../../../shared/intent/projectCurveRecord';
import { drawingFromCommands } from '../../../kernel/backends/occt/sketchToDrawing';
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
  const stashed = (r.metadata as { diagnostics?: CompilerDiagnostic[] } | undefined)?.diagnostics;
  if (stashed && stashed.length > 0) {
    diagnostics.push(...stashed);
    if (stashed.some((d) => d.severity === 'error')) {
      return { ok: false, diagnostics };
    }
  }

  if (!isProjectCurveMetadata(r.metadata)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `projectCurve record '${r.id}' is missing valid metadata.`,
      hint: 'Build the record via Shape.projectCurve({...}) so the validators run.',
    });
    return { ok: false, diagnostics };
  }
  const meta: ProjectCurveMetadata = r.metadata;

  // asEdge:true is deferred — unimplemented here, NOT missing from OCCT.
  if (meta.asEdge) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.project-curve.no-intersection',
      featureId: r.id,
      severity: 'error',
      message: 'projectCurve: asEdge:true (open-wire projection) is not implemented. The OCCT binding (BRepProj_Projection) is available; the kernelCAD lowering is not.',
      hint: HINT_TEMPLATES['feature.project-curve.no-intersection'].template,
    });
    return { ok: false, diagnostics };
  }

  // 1. Resolve target face.
  const faceResult = pickFace(r, parent, records);
  if ('error' in faceResult) {
    diagnostics.push(faceResult.error);
    return { ok: false, diagnostics };
  }
  const face = faceResult;

  // 2. Build a Drawing from the source.
  let drawing;
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
        return { ok: false, diagnostics };
      }
      drawing = drawingFromCommands(meta.source.commands);
    } else {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: 'projectCurve: source.kind === "drawing" (serialized JSON) is not yet supported.',
        hint: 'Use source: { kind: "sketchCommands", commands: [...] } for now; serialized-drawing input is a v0.X follow-up.',
      });
      return { ok: false, diagnostics };
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
    return { ok: false, diagnostics };
  }

  // 3-4. sketchOnFace and wrap as a sketch-tagged OcctBackend.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sketch = (drawing as any).sketchOnFace(face, meta.scaleMode);
    const backend = OcctBackend.fromFaceBoundSketch(sketch);
    return { ok: true, backend };
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
    return { ok: false, diagnostics };
  }
}
