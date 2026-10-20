// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { faceToShape, thickenFace, thickenShell, ThickenedSolidError } from '../../../../kernel/backends/occt/nurbsSurfaceLowerer';
import { lowerSurfaceSew as sewSurfaceFaces } from '../../../../kernel/backends/occt/surfaceSewLowerer';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';
import { buildSurfaceById, resolveSurfaceFaceForRecord } from './surfaceResolve';

/** `surfaceThicken` — offsets a Surface both ways into a solid. */
export function lowerSurfaceThicken(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  // W1.3 NURBS: consume the upstream Surface (resolved via session hook
  // or pre-populated by the recompute engine into `inputs.surfaces`) and
  // offset both sides via BRepOffsetAPI_MakeThickSolid.MakeThickSolidBySimple.
  const face = resolveSurfaceFaceForRecord(ctx, r);
  if (!face) {
    return noShape();
  }
  const t = r.params.t.evaluated;
  try {
    shape = thickenFace(face, t);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const invalid = e instanceof ThickenedSolidError;
    ctx.diagnostics.push({
      target: ctx.target,
      code: invalid ? 'feature.surface-thicken.invalid-solid' : 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `surfaceThicken: ${invalid ? 'result rejected' : 'OCCT failed'}: ${msg}`,
      hint: invalid
        ? HINT_TEMPLATES['feature.surface-thicken.invalid-solid'].template
        : 'kernel-failed — try a smaller thickness, simplify the control net, or ensure the surface has no self-intersections.',
    });
    return noShape();
  }
  return built(shape);
}

/** `shapeThicken` — solidify a sewn multi-patch shell (or surfaceToShape shell). */
export function lowerShapeThicken(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as ShapeBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: 'shapeThicken: base shell did not lower.',
      hint: 'Call .thicken(t) on a Shape returned by sew([...]) or surfaceToShape().',
    });
    return noShape();
  }
  const t = r.params.t?.evaluated;
  if (t === undefined || !(t > 0) || !Number.isFinite(t)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'Shape.thicken(t)',
        path: 't',
        got: t,
        requires: 'a positive finite wall thickness in mm',
        unit: 'mm',
        example: 'sewn.thicken(3)',
      }),
    });
    return noShape();
  }
  try {
    return built(thickenShell(base as import('../../../../kernel/backends/occt/occtBackend').OcctBackend, t));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const invalid = e instanceof ThickenedSolidError;
    ctx.diagnostics.push({
      target: ctx.target,
      code: invalid ? 'feature.surface-thicken.invalid-solid' : 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `shapeThicken: ${invalid ? 'result rejected' : 'OCCT failed'}: ${msg}`,
      hint: invalid
        ? HINT_TEMPLATES['feature.surface-thicken.invalid-solid'].template
        : 'kernel-failed — ensure the sewn shell is open and manifold, then try a smaller thickness.',
    });
    return noShape();
  }
}

/** `surfaceToShape` — wraps a Surface face as a single-face shell. */
export function lowerSurfaceToShape(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  // W1.3 NURBS: wrap the Replicad Face as a single-face TopoDS_Shell.
  const face = resolveSurfaceFaceForRecord(ctx, r);
  if (!face) {
    return noShape();
  }
  try {
    shape = faceToShape(face);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `surfaceToShape: OCCT failed: ${msg}`,
      hint: 'kernel-failed — surface produced an invalid Face; check control-net + degree.',
    });
    return noShape();
  }
  return built(shape);
}

/** `surfaceSew` — stitches N single-face surfaces into a shell (a solid when
 *  watertight). */
export function lowerSurfaceSew(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // NURBS Slice E (5): stitch N surface faces into a shell — and, when
  // watertight, a solid — via BRepBuilderAPI_Sewing. Each `surface_<i>`
  // input resolves through the same buildSurfaceById path as
  // surfaceThicken / surfaceToShape (extended to MULTIPLE inputs). Only
  // single-face surfaces are sewable: a skinned multi-face shell as an
  // input is rejected with feature.invalid-args.
  const surfaceKeys = Object.keys(r.inputs)
    .filter((k) => k.startsWith('surface_'))
    .sort((a, b) => {
      const ia = Number(a.slice('surface_'.length));
      const ib = Number(b.slice('surface_'.length));
      return ia - ib;
    });
  if (surfaceKeys.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `surfaceSew: no surface_* inputs found.`,
      hint: 'invalid-args.surfaceSew.input — call sew([surfaceA, surfaceB, ...]).',
    });
    return noShape();
  }
  const faces: import('replicad').Face[] = [];
  for (const key of surfaceKeys) {
    const ref = r.inputs[key];
    if (!ref || ref.kind !== 'surface') {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `surfaceSew: input ${key} is missing or not a surface ref.`,
        hint: 'invalid-args.surfaceSew.input — every sew() input must be a captured Surface.',
      });
      return noShape();
    }
    const builtSurface = buildSurfaceById(ctx, ref.surfaceId, r);
    if (!builtSurface) {
      // buildSurfaceById already pushed the specific diagnostic.
      return noShape();
    }
    if (builtSurface.kind !== 'face') {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `surfaceSew: input ${key} (${ref.surfaceId}) is a multi-face shell; sew accepts single-face surfaces only.`,
        hint: 'invalid-args.surfaceSew.input — sew nurbsSurface / coonsPatch / trimmed faces, not skinned shells.',
      });
      return noShape();
    }
    faces.push(builtSurface.face);
  }

  const tolerance = r.params.tolerance.evaluated;
  const requireClosed = (r.metadata as { requireClosed?: boolean } | undefined)?.requireClosed === true;
  let sewResult: import('../../../../kernel/backends/occt/surfaceSewLowerer').SurfaceSewResult;
  try {
    sewResult = sewSurfaceFaces(faces, { tolerance, requireClosed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `surfaceSew: OCCT sewing failed: ${msg}`,
      hint: 'kernel-failed — ensure the faces are well-conditioned and share edges within tolerance.',
    });
    return noShape();
  }

  // Review-mandated enforcement: requireClosed must not be a silent
  // no-op. When the caller asked for a watertight result but the sewed
  // shell is not a closed solid, surface the open-shell diagnostic. When
  // requireClosed is false, accept the (possibly open) shell silently.
  if (requireClosed && !(sewResult.isSolid && sewResult.isClosed)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.surface-sew.open-shell',
      featureId: r.id,
      severity: 'error',
      message: `surfaceSew: requireClosed was set but the sewn result is an open shell (not a closed solid).`,
      hint: HINT_TEMPLATES['feature.surface-sew.open-shell'].template,
    });
  }

  const shape: ShapeBackend = sewResult.backend;
  return built(shape);
}
