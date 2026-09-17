// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { isCurve3DMetadata } from '../../../../shared/intent/curve3dRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { FeatureRef } from '../../../../shared/intent/types';
import { isVariableSweepMetadata } from '../../../../shared/intent/variableSweepRecord';
import { lowerCurve3D as buildCurve3dEdge } from '../curve3dLowerer';
import { lowerEmbossText as embossTextOntoFace } from '../embossTextLowerer';
import { lowerProjectCurve as projectCurveOntoFace } from '../projectCurveLowerer';
import { lowerVariableSweep as buildVariableSweepShape, type VariableSweepSectionLowered } from '../variableSweepLowerer';
import { built, finished, noShape, type LowerContext, type LowerOutcome } from './context';

/** `curve3d` — builds a Geom_BSplineCurve edge and parks it on
 *  `importedGeometry`; contributes no Shape. */
export function lowerCurve3d(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // NURBS Slice B: lower a 3D NURBS curve to a `TopoDS_Edge` backed by
  // a `Geom_BSplineCurve`. The edge is parked on
  // `session.importedGeometry` so downstream consumers (variableSweep,
  // surfaceFromBoundary, lazy Curve3DProxy evaluators) can reach it.
  // Like `referenceImage`, this record contributes no `Shape` — the
  // capture layer marks it `metadata.virtual = true`.
  const meta = r.metadata as { curve3d?: unknown } | undefined;
  const m = meta?.curve3d;
  if (!isCurve3DMetadata(m)) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.curve3d.degenerate-controls',
      featureId: r.id,
      severity: 'error',
      message: `curve3d record '${r.id}' is missing valid metadata.curve3d.`,
      hint: 'Build the record via session.addCurve3D({ metadata }) so the validators run.',
    });
    return noShape();
  }
  try {
    const { edge } = buildCurve3dEdge(m);
    // Park the raw OCCT edge on the importedGeometry map. The map is
    // typed as ShapeBackend (the same slot fromSTEP / sdfMaterialize
    // use); curve3d stores a TopoDS_Edge instead, and the consumer
    // (variableSweep lowerer, lazy proxy) is responsible for retrieving
    // it with the matching expectation.
    ctx.importedGeometry.set(r.id, edge as unknown as ShapeBackend);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT BSplineCurve build failed: ${msg}`,
      hint: 'kernel-failed — verify the control points, knots, and degree form a valid NURBS curve.',
    });
  }
  return noShape();
}

/** `variableSweep` — BRepOffsetAPI_MakePipeShell along a 3D spine. */
export function lowerVariableSweep(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // NURBS Slice B Task 8: variable-section sweep via
  // `BRepOffsetAPI_MakePipeShell`. Direct OCCT (no replicad wrapper
  // around the builder). Spine resolution order:
  //   1. `importedGeometry[spineId]` — if a prior caller pre-parked
  //      the edge (e.g. via direct curve3d lowering for tests).
  //   2. The upstream curve3d record (looked up via `inputs.records`),
  //      lowered on-demand. This is the engine-driven path: curve3d
  //      records are `metadata.virtual === true`, so the engine skips
  //      their lowering and we materialise the edge here.
  //   3. A sketch input (in `byKey.spine`) lifted to its outer wire's
  //      first edge — supports straight-line / planar sketch spines.
  // Profiles always resolved from `byKey` — each section input is a
  // sketch lowered upstream.
  const meta = r.metadata as { variableSweep?: unknown } | undefined;
  const m = meta?.variableSweep;
  if (!isVariableSweepMetadata(m)) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `variableSweep record '${r.id}' is missing valid metadata.variableSweep.`,
      hint: 'Build the record via session.addVariableSweep({...}) (or the kcad.variableSweep public API) so the validators run.',
    });
    return noShape();
  }

  const spineEdge = resolveVariableSweepSpine(ctx, r, m.spineRef);
  if (!spineEdge) return noShape();

  const lowered = resolveVariableSweepSections(ctx, r, m.sections);
  if (!lowered) return noShape();

  try {
    const shape = buildVariableSweepShape(spineEdge, lowered, {
      ...(m.continuity !== undefined ? { continuity: m.continuity } : {}),
      ...(m.closed !== undefined ? { closed: m.closed } : {}),
      ...(m.orientation !== undefined ? { orientation: m.orientation } : {}),
      // Sketch-derived profiles are always lifted onto the XY plane at
      // z=0 — let OCCT translate them to the spine station via the
      // `WithContact=true` arm of `BRepOffsetAPI_MakePipeShell::Add_2`.
      // `withCorrection=true` rotates each profile perpendicular to
      // the spine tangent at its vertex — required when the spine
      // tangent is non-vertical (e.g. a sketch spine in the XY plane,
      // where without correction profile and spine are coplanar and
      // the swept volume collapses).
      withContact: true,
      withCorrection: true,
    });
    return built(shape);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT variable-section sweep failed: ${msg}`,
      hint: 'kernel-failed — check spine length, profile planarity, t-span coverage, and that profile wires are closed and single-loop.',
    });
    return noShape();
  }
}

/**
 * Steps 1-3 of the spine resolution order documented on `lowerVariableSweep`.
 *
 * Contract: returns a truthy OCCT edge handle, or `undefined` **after** pushing
 * the diagnostic that explains why. The caller answers a falsy return with a
 * bare `noShape()` and pushes nothing, so any new `return undefined` added here
 * must push first or the failure goes out with an empty diagnostics list. The
 * return type cannot carry this — `unknown | undefined` collapses to `unknown`.
 */
function resolveVariableSweepSpine(
  ctx: LowerContext,
  r: FeatureRecord,
  spineRef: FeatureRef,
): unknown {
  // Resolve spine edge. The spine input is a FeatureRef.
  const spineId = spineRef.kind === 'feature' ? spineRef.id : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let spineEdge: any = spineId ? ctx.importedGeometry.get(spineId) : undefined;

  // Step 2: if the upstream is a virtual curve3d record and the edge
  // is not yet parked, lower it on-demand. This is the normal path
  // for engine-driven runs because the engine skips virtual records.
  if (!spineEdge && spineId && ctx.allRecords) {
    const upstream = ctx.allRecords.find((u) => u.id === spineId);
    if (upstream?.kind === 'curve3d') {
      const upMeta = upstream.metadata as { curve3d?: unknown } | undefined;
      const cm = upMeta?.curve3d;
      if (!isCurve3DMetadata(cm)) {
        ctx.diagnostics.push({
          target: 'export-occt',
          code: 'feature.curve3d.degenerate-controls',
          featureId: r.id,
          severity: 'error',
          message: `variableSweep: spine curve3d '${spineId}' is missing valid metadata.curve3d.`,
          hint: 'Build the spine via nurbsCurve(...) / spline3d(...) so the validators run.',
        });
        return undefined;
      }
      try {
        const { edge } = buildCurve3dEdge(cm);
        spineEdge = edge;
        // Cache the edge on importedGeometry so subsequent recompute
        // passes (params.update) and other downstream consumers reuse
        // the lowered edge instead of rebuilding it.
        ctx.importedGeometry.set(spineId, edge as unknown as ShapeBackend);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.diagnostics.push({
          target: 'export-occt',
          code: 'feature.kernel-failed',
          featureId: r.id,
          severity: 'error',
          message: `variableSweep: failed to lower curve3d spine '${spineId}': ${msg}`,
          hint: 'kernel-failed — verify the spine nurbsCurve control points, knots, and degree form a valid NURBS curve.',
        });
        return undefined;
      }
    }
  }

  if (!spineEdge) {
    const sketchInput = ctx.inputs.byKey.spine as OcctBackend | undefined;
    if (sketchInput) {
      try {
        const { face } = OcctBackend.liftSketchToFace(sketchInput, 'XY');
        // The lifted sketch face's outer wire's first edge — replicad
        // wraps `wire.wrapped` as TopoDS_Wire; extract its first edge
        // via TopExp_Explorer. Single-edge sketch wires are the
        // common case (a straight-line spine sketch); multi-edge
        // wires would need full-wire spine support in lowerVariableSweep.
        const wire = face().outerWire();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oc = (replicad as any).getOC();
        const exp = new oc.TopExp_Explorer_2(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (wire as any).wrapped,
          oc.TopAbs_ShapeEnum.TopAbs_EDGE,
          oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
        );
        if (exp.More()) {
          spineEdge = oc.TopoDS.Edge_1(exp.Current());
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.diagnostics.push({
          target: 'export-occt',
          code: 'feature.invalid-args',
          featureId: r.id,
          severity: 'error',
          message: `variableSweep: failed to lift spine sketch: ${msg}`,
          hint: 'invalid-args.variableSweep.spine — pass a Curve3D (preferred) or a single-edge Sketch as the spine.',
        });
        return undefined;
      }
    }
  }
  if (!spineEdge) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `variableSweep: spine input could not be resolved (no parked Curve3D edge and no sketch backend).`,
      hint: 'invalid-args.variableSweep.spine — pass a Curve3D (nurbsCurve/spline3d) or a Sketch (path().…close()).',
    });
    return undefined;
  }
  return spineEdge;
}

/**
 * Resolve each section's profile wire from the sketch in `byKey.section_${i}`.
 * The capture layer guarantees one input per section in addVariableSweep().
 */
function resolveVariableSweepSections(
  ctx: LowerContext,
  r: FeatureRecord,
  sections: readonly { t: number }[],
): VariableSweepSectionLowered[] | undefined {
  const lowered: VariableSweepSectionLowered[] = [];
  for (let i = 0; i < sections.length; i++) {
    const profileInput = ctx.inputs.byKey[`section_${i}`] as OcctBackend | undefined;
    if (!profileInput) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `variableSweep: missing input 'section_${i}' — upstream sketch did not lower successfully.`,
        hint: 'Every section profile must be a Sketch that lowers cleanly — check upstream sketch diagnostics first.',
      });
      return undefined;
    }
    let profileWire;
    try {
      const { face } = OcctBackend.liftSketchToFace(profileInput, 'XY');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profileWire = (face().outerWire() as any).wrapped;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: `variableSweep: failed to lift section ${i} profile: ${msg}`,
        hint: 'kernel-failed — each section profile must be a single closed sketch loop.',
      });
      return undefined;
    }
    lowered.push({
      t: sections[i].t,
      profileWire,
      locationPnt: [0, 0, 0], // unused for t=0/t=1 — see buildVariableSweepShape
    });
  }
  return lowered;
}

/** `embossText` — raises or recesses text on a target face. */
export async function lowerEmbossText(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  // W3: emboss/engrave text onto a target face. Reuses replicad's
  // `drawText → sketchOnFace → extrude → fuse|cut` pipeline. Lower
  // delegates to `lowerEmbossText`; parent shape resolved from
  // `ctx.inputs.byKey.parent`.
  const parentBackend = ctx.inputs.byKey.parent as OcctBackend | undefined;
  if (!parentBackend) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `embossText requires an input named 'parent'.`,
      hint: 'Chain embossText onto a solid via Shape.embossText({...}); the parent input is the LHS body.',
    });
    return noShape();
  }
  const res = await embossTextOntoFace(r, parentBackend, ctx.allRecords, ctx.scriptDir);
  if (!res.ok) {
    ctx.diagnostics.push(...res.diagnostics);
    return finished(parentBackend);
  }
  const shape: ShapeBackend = res.backend;
  return built(shape);
}

/** `projectCurve` — projects a closed 2D curve onto a target face. */
export async function lowerProjectCurve(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  // W3: project a 2D closed curve onto a target face. The lowerer
  // returns a sketch-tagged OcctBackend (face-bound sketch). Downstream
  // chains (`.extrude(d)` / `.cut(...)`) consume it via the normal
  // sketch pipeline.
  const parentBackend = ctx.inputs.byKey.parent as OcctBackend | undefined;
  if (!parentBackend) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `projectCurve requires an input named 'parent'.`,
      hint: 'Chain projectCurve onto a solid via Shape.projectCurve({...}); the parent input is the body holding the target face.',
    });
    return noShape();
  }
  const res = await projectCurveOntoFace(r, parentBackend, ctx.allRecords);
  if (!res.ok) {
    ctx.diagnostics.push(...res.diagnostics);
    return finished(parentBackend);
  }
  const shape: ShapeBackend = res.backend;
  return built(shape);
}
