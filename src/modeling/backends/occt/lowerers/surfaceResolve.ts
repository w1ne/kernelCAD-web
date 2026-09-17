// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import {
  buildNurbsFace, buildSkinnedSurface, type BuiltSurface,
} from '../../../../kernel/backends/occt/nurbsSurfaceLowerer';
import { lowerCoonsPatch } from '../coonsPatchLowerer';
import { lowerSurfaceTrim, NonPlanarTrimError } from '../surfaceTrimLowerer';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type {
  SurfaceId, SurfaceRecord, SurfaceTrimData,
} from '../../../../shared/intent/surfaceRecord';
import type { LowerContext } from './context';

/**
 * Resolve the Replicad Face referenced by `record.inputs.surface`. Order of
 * resolution: external map (`inputs.surfaces`) → instance cache
 * (`surfaceCache`) → session lookup via `getSurfaceRecord` + lazy build.
 *
 * Returns undefined and appends the appropriate diagnostic when the input
 * ref is missing/wrong-kind or the underlying surface cannot be built.
 */
export function resolveSurfaceFaceForRecord(
  ctx: LowerContext,
  r: FeatureRecord,
): BuiltSurface | undefined {
  const surfaceRef = r.inputs.surface;
  if (!surfaceRef || surfaceRef.kind !== 'surface') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `${r.kind}: missing or wrong-kind surface input ref.`,
      hint: `invalid-args.${r.kind}.input — call the corresponding Surface method on a captured Surface.`,
    });
    return undefined;
  }
  const sid = surfaceRef.surfaceId;
  return buildSurfaceById(ctx, sid, r);
}

/**
 * Resolve a SurfaceId to a `BuiltSurface`, building it from its
 * `SurfaceRecord` when not already cached. Recursive: a `surfaceTrim` record
 * resolves its own base surface (and a sibling-surface cutter) through this
 * same function. `r` is the *consuming* feature record (used only for
 * diagnostic attribution).
 */
export function buildSurfaceById(
  ctx: LowerContext,
  sid: SurfaceId,
  r: FeatureRecord,
): BuiltSurface | undefined {
  const cached = ctx.inputs.surfaces?.get(sid) ?? ctx.surfaceCache.get(sid);
  if (cached) return cached;
  if (!ctx.getSurfaceRecord) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `${r.kind}: surface ${sid} not resolved (lowerer has no session hook).`,
      hint: 'recompute.input.missing — use createOcctLowerer(session) so SurfaceRecords are reachable.',
    });
    return undefined;
  }
  const surfRec = ctx.getSurfaceRecord(sid);
  if (!surfRec) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `${r.kind}: SurfaceRecord ${sid} not found in session.`,
      hint: 'recompute.input.missing — Surface was not captured before its thicken/toShape escape.',
    });
    return undefined;
  }
  let surface: BuiltSurface | undefined;
  try {
    surface = buildSurfaceFromRecord(ctx, surfRec, sid, r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isCoons = surfRec.data.kind === 'coonsPatch';
    ctx.diagnostics.push({
      target: ctx.target,
      code: isCoons ? 'feature.surface-from-boundary.degenerate-patch' : 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `${r.kind}: surface build failed: ${msg}`,
      hint: isCoons
        ? HINT_TEMPLATES['feature.surface-from-boundary.degenerate-patch'].template
        : 'kernel-failed — fix the control net / degree / sections per the diagnostic message.',
    });
    return undefined;
  }
  if (!surface) return undefined;
  ctx.surfaceCache.set(sid, surface);
  return surface;
}

/** Per-`SurfaceRecord.data.kind` construction. Throws on OCCT failures; the
 *  caller owns the catch so every kind shares one kernel-failed diagnostic. */
function buildSurfaceFromRecord(
  ctx: LowerContext,
  surfRec: SurfaceRecord,
  sid: SurfaceId,
  r: FeatureRecord,
): BuiltSurface | undefined {
  if (surfRec.data.kind === 'nurbsSurface') {
    const face = buildNurbsFace({
      controls: surfRec.data.controls,
      weights: surfRec.data.weights,
      degree: surfRec.data.degree,
      knots: surfRec.data.knots,
      periodic: surfRec.data.periodic,
    });
    return { kind: 'face', face };
  }
  if (surfRec.data.kind === 'surfaceFromCurves') {
    return buildSkinnedFromSections(ctx, surfRec.data.sectionIds, r);
  }
  if (surfRec.data.kind === 'coonsPatch') {
    // NURBS Slice C: Coons patch via BRepOffsetAPI_MakeFilling. The
    // upstream curve3d records are looked up by id from the all-records
    // table threaded in by `lower()`; the lowerer parks each freshly-
    // lowered edge on `importedGeometry` so downstream consumers reuse
    // it (mirrors variableSweep's lazy-edge resolution).
    if (!ctx.allRecords) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `${r.kind}: coonsPatch ${sid} needs the all-records table to resolve boundary curves.`,
        hint: 'recompute.input.missing — surfaceFromBoundary requires the lowerer to receive the full records list.',
      });
      return undefined;
    }
    const { face } = lowerCoonsPatch(surfRec.data, ctx.allRecords, ctx.importedGeometry);
    return { kind: 'face', face };
  }
  if (surfRec.data.kind === 'surfaceTrim') {
    return buildTrimmedSurface(ctx, surfRec.data, sid, r);
  }
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    message: `Unknown SurfaceRecord data kind on ${sid}.`,
    hint: 'Use nurbsSurface(...) or surfaceFromCurves(...) to capture a Surface.',
  });
  return undefined;
}

/**
 * Skin the consumer record's `section_<i>` sketch inputs into a multi-face
 * shell. Section sketches are passed via the consumer record's inputs map
 * (SurfaceProxy.buildInputsWithSectionRefs adds `section_<i>` feature refs so
 * the dep graph drives their lowering before this record is visited).
 */
function buildSkinnedFromSections(
  ctx: LowerContext,
  sectionIds: readonly string[],
  r: FeatureRecord,
): BuiltSurface | undefined {
  const sectionShapes: OcctBackend[] = [];
  for (let i = 0; i < sectionIds.length; i++) {
    const fid = sectionIds[i];
    const back = ctx.inputs.byKey[`section_${i}`] as OcctBackend | undefined;
    if (!back) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `${r.kind}: section sketch ${fid} (section_${i}) not resolved by upstream lowering.`,
        hint: 'recompute.input.missing — surfaceFromCurves requires every section to lower cleanly. Inspect each sketch with why_did_this_fail.',
      });
      return undefined;
    }
    sectionShapes.push(back);
  }
  const planes = sectionShapes.map((_, i) => ({
    plane: 'XY' as const,
    origin: [0, 0, i * 10] as [number, number, number],
  }));
  return buildSkinnedSurface(sectionShapes, planes);
}

/**
 * NURBS Slice E (E2): trim/split a surface against a cutter. Resolve the base
 * surface and the cutter, then cut via BRepAlgoAPI_Section + a half-space
 * prism (BRepFeat_SplitShape is not bound in this wasm — see
 * surfaceTrimLowerer.ts header). Both base and a sibling-surface cutter
 * resolve through `buildSurfaceById` (recursion).
 */
function buildTrimmedSurface(
  ctx: LowerContext,
  trimData: SurfaceTrimData,
  sid: SurfaceId,
  r: FeatureRecord,
): BuiltSurface | undefined {
  const baseBuilt = buildSurfaceById(ctx, trimData.surfaceId, r);
  if (!baseBuilt) return undefined;
  if (baseBuilt.kind !== 'face') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `surfaceTrim ${sid}: base surface is a multi-face shell; trim supports single-face surfaces only.`,
      hint: 'invalid-args.surfaceTrim.base — trim a nurbsSurface / coonsPatch face, not a skinned shell.',
    });
    return undefined;
  }

  const cutterFace = resolveTrimCutter(ctx, trimData, r);
  if (!cutterFace) return undefined;

  try {
    const { face } = lowerSurfaceTrim(baseBuilt.face, cutterFace, trimData.op, trimData.piece);
    return { kind: 'face', face };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const nonPlanar = e instanceof NonPlanarTrimError || /not near-planar/i.test(msg);
    const noIntersection = /do not intersect|no section curve/i.test(msg);
    const code = nonPlanar
      ? 'feature.surface-trim.non-planar'
      : noIntersection
        ? 'feature.surface-trim.no-intersection'
        : 'feature.kernel-failed';
    ctx.diagnostics.push({
      target: ctx.target,
      code,
      featureId: r.id,
      severity: 'error',
      message: `surfaceTrim ${sid}: ${msg}`,
      hint:
        code === 'feature.kernel-failed'
          ? 'kernel-failed — ensure the surface and cutter cross cleanly (well-conditioned, non-tangent).'
          : HINT_TEMPLATES[code].template,
    });
    return undefined;
  }
}

/**
 * Resolve a `surfaceTrim` cutter (`byRef`) to a single `replicad.Face`.
 *  - `{ surfaceId }`: a sibling Surface → resolved through `buildSurfaceById`
 *    and required to be a single face.
 *  - `{ featureRef }`: a lowered feature shape (box / imported solid / sweep)
 *    looked up via `importedGeometry` / `inputs.byKey` → its first TopoDS_Face
 *    is used as the cutter surface (best-effort; the Section only needs a
 *    surface that crosses the base).
 */
function resolveTrimCutter(
  ctx: LowerContext,
  trimData: SurfaceTrimData,
  r: FeatureRecord,
): replicad.Face | undefined {
  const byRef = trimData.byRef;
  if ('surfaceId' in byRef) {
    const built = buildSurfaceById(ctx, byRef.surfaceId, r);
    if (!built) return undefined;
    if (built.kind !== 'face') {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `surfaceTrim: cutter surface ${byRef.surfaceId} is a multi-face shell; use a single-face surface as the cutter.`,
        hint: 'invalid-args.surfaceTrim.cutter — pass a nurbsSurface / coonsPatch face as the cutter.',
      });
      return undefined;
    }
    return built.face;
  }

  // featureRef cutter: find the lowered shape and extract its first face.
  // FeatureRef is a discriminated union; the cutter authoring contract
  // (surfaceTrim byRef = a Shape feature) implies kind='feature' carrying `.id`,
  // but we fall back to `.featureId` for face/edge/vertex refs so the lookup
  // still resolves the owning feature's lowered shape.
  const featureRef = byRef.featureRef;
  const fid = featureRef.kind === 'feature' ? featureRef.id : featureRef.kind === 'surface' ? featureRef.surfaceId : featureRef.featureId;
  const back =
    ctx.importedGeometry.get(fid) ??
    (ctx.inputs.byKey[fid] as OcctBackend | undefined) ??
    (ctx.inputs.byKey['by'] as OcctBackend | undefined);
  if (!back) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'recompute.input.missing',
      featureId: r.id,
      severity: 'error',
      message: `surfaceTrim: cutter feature ${fid} was not lowered before the trim resolved.`,
      hint: 'recompute.input.missing — capture/lower the cutter shape before trimming against it.',
    });
    return undefined;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = (replicad as any).getOC();
    // `back` is always an OcctBackend at this call site — importedGeometry
    // and inputs.byKey are both keyed on OcctBackend instances; the union
    // type is wider than necessary because the accessor type is ShapeBackend.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((back as OcctBackend).getReplicadShape() as any).wrapped;
    const exp = new oc.TopExp_Explorer_2(
      raw,
      oc.TopAbs_ShapeEnum.TopAbs_FACE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    if (!exp.More()) {
      throw new Error(`cutter feature ${fid} has no faces`);
    }
    const topoFace = oc.TopoDS.Face_1(exp.Current());
    return new replicad.Face(topoFace);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `surfaceTrim: could not extract a cutter face from feature ${fid}: ${msg}`,
      hint: 'invalid-args.surfaceTrim.cutter — pass a surface or a shape with at least one planar face.',
    });
    return undefined;
  }
}
