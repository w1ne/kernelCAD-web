// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import { isCurve3DMetadata } from '../../../../shared/intent/curve3dRecord';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { lowerCurve3D } from '../curve3dLowerer';
import { lowerLoftWithRails, railHitsSections } from '../loftWithRailsLowerer';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** Coordinates arrive as plain numbers, or as Params when the author passed a
 *  ParamRef (already pre-resolved by the dispatcher). */
type Coord = number | { evaluated: number };

type LoftPlane = { plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number]; rotationDeg?: number };

interface LoftMeta {
  planes?: LoftPlane[];
  startPoint?: [number, number, number] | undefined;
  endPoint?: [number, number, number] | undefined;
  twistCenter?: [number, number];
  rails?: string[];
}

/**
 * `loft` — blends >= 2 closed sketch sections, optionally guided by up to two
 * rail curves (OCCT MakePipeShell). Split into section collection, plane
 * resolution, rail resolution and the two build paths so each stays inside the
 * complexity ratchet; the bodies are unchanged from the single-arm form.
 */
export async function lowerLoft(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
  if (profileKind !== 'sketch') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `loft profile kind '${profileKind}' not supported. Use 'sketch'.`,
      hint: "Use profileKind 'sketch' for loft.",
    });
    return noShape();
  }
  const shape = await loftSketchSections(ctx, r);
  if (shape === undefined) return noShape();
  // loft blends ≥2 closed sections into a solid — an empty / zero-volume
  // result is degenerate, never legitimate.
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'loft',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** Returns undefined once the failing step has pushed its diagnostic. */
async function loftSketchSections(
  ctx: LowerContext,
  r: FeatureRecord,
): Promise<ShapeBackend | undefined> {
  const sectionCount = r.params.sectionCount?.evaluated ?? 0;
  if (sectionCount < 2) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `loft needs at least 2 sketches (sectionCount=${sectionCount}).`,
      hint: 'Pass at least 2 sketches; e.g. s1.loft(s2).',
    });
    return undefined;
  }
  const sketches = collectLoftSections(ctx, r, sectionCount);
  if (sketches === undefined) return undefined;
  const meta = readLoftMeta(r);
  const planes = resolveLoftPlanes(ctx, r, sketches, sectionCount, meta);
  if (planes === undefined) return undefined;
  const ruled = (r.params.ruled?.evaluated ?? 0) > 0.5;
  const twistDeg = r.params.twistDeg?.evaluated ?? 0;
  const withTwist = applySectionTwist(planes, twistDeg);
  const railIds = readLoftRailIds(meta);
  if (!enforceLoftRailLimit(ctx, r, railIds)) return undefined;
  if (railIds.length > 0) {
    return buildRailGuidedLoft(ctx, r, sketches, planes, railIds, twistDeg, withTwist);
  }
  if (isCollapsedPlaneStack(withTwist, meta)) {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'loft',
      volumeAfter: 0, isEmpty: true,
    });
    if (e) ctx.diagnostics.push(e);
    return undefined;
  }
  return buildLoftFromSketches(ctx, r, sketches, withTwist, ruled, meta);
}

/** Rail-guided path. Rails follow their own curves, so there is no place to
 *  apply a section rotation — reject the combination loudly rather than
 *  silently producing an untwisted solid. */
async function buildRailGuidedLoft(
  ctx: LowerContext,
  r: FeatureRecord,
  sketches: OcctBackend[],
  planes: LoftPlane[],
  railIds: string[],
  twistDeg: number,
  withTwist: LoftPlane[],
): Promise<ShapeBackend | undefined> {
  const hasSectionRotation =
    twistDeg !== 0 || withTwist.some((p) => (p.rotationDeg ?? 0) !== 0);
  if (hasSectionRotation) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `loft: rail-guided lofts do not support section rotation (twistDeg/rotationDeg); remove rails or rotation.`,
      hint: 'Rail-guided lofts follow the rails — remove opts.rails to use twistDeg/rotationDeg, or drop the rotation.',
    });
    return undefined;
  }
  const railEdges = resolveLoftRails(ctx, r, railIds);
  if (railEdges === undefined) return undefined;
  return buildRailLoft(ctx, r, sketches, planes, railEdges);
}

function readLoftRailIds(meta: LoftMeta | undefined): string[] {
  return Array.isArray((meta as { rails?: unknown } | undefined)?.rails)
    ? ((meta as { rails: string[] }).rails)
    : [];
}

/** Enforce the <=2-rail MakePipeShell limit; false once the diagnostic is pushed. */
function enforceLoftRailLimit(ctx: LowerContext, r: FeatureRecord, railIds: string[]): boolean {
  const railCount = r.params.railCount?.evaluated ?? railIds.length;
  if (railCount > 2 || railIds.length > 2) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.loft.rail-miss',
      featureId: r.id,
      severity: 'error',
      message: `loft rails: OCCT MakePipeShell accepts at most 2 rails (spine + auxiliary); got ${Math.max(railCount, railIds.length)}. For >2 guides use surfaceFromCurves/surfaceFromBoundary panels → sew → thicken (not more loft rails).`,
      hint: HINT_TEMPLATES['feature.loft.rail-miss'].template,
    });
    return false;
  }
  return true;
}

/** Non-rail path: direct OCCT loft from the resolved sections and planes. */
function buildLoftFromSketches(
  ctx: LowerContext,
  r: FeatureRecord,
  sketches: OcctBackend[],
  planes: LoftPlane[],
  ruled: boolean,
  meta: LoftMeta | undefined,
): ShapeBackend | undefined {
  try {
    return OcctBackend.loftFromSketches(sketches, planes, {
      ruled,
      startPoint: meta?.startPoint,
      endPoint: meta?.endPoint,
      twistCenter: meta?.twistCenter ?? [0, 0],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT loft failed: ${msg}`,
      hint: 'OCCT could not loft these sections — try ruled: true for sharp transitions, or use sections with similar vertex counts and orientation.',
    });
    return undefined;
  }
}

/** Collect sketch_0 through sketch_{N-1} from ctx.inputs.byKey. */
function collectLoftSections(
  ctx: LowerContext,
  r: FeatureRecord,
  sectionCount: number,
): OcctBackend[] | undefined {
  const sketches: OcctBackend[] = [];
  for (let i = 0; i < sectionCount; i++) {
    const s = ctx.inputs.byKey[`sketch_${i}`] as OcctBackend | undefined;
    if (!s) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `loft missing input sketch_${i} — upstream sketch did not lower successfully.`,
        hint: 'Loft requires every upstream sketch input to lower successfully — check upstream sketch diagnostics first.',
      });
      return undefined;
    }
    sketches.push(s);
  }
  return sketches;
}

/** Numeric view of `metadata.planes` / `startPoint` / `endPoint` / `rails`. */
function readLoftMeta(r: FeatureRecord): LoftMeta | undefined {
  const num = (c: Coord): number => (typeof c === 'number' ? c : c.evaluated);
  const point3 = (p: Coord[] | undefined): [number, number, number] | undefined =>
    p === undefined ? undefined : [num(p[0]), num(p[1]), num(p[2])];
  const point2 = (p: Coord[] | undefined): [number, number] | undefined =>
    p === undefined ? undefined : [num(p[0]), num(p[1])];
  const rawMeta = r.metadata as {
    planes?: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: Coord[]; rotationDeg?: Coord }>;
    startPoint?: Coord[];
    endPoint?: Coord[];
    twistCenter?: Coord[];
    rails?: string[];
  } | undefined;
  return rawMeta === undefined ? undefined : {
    planes: rawMeta.planes?.map((p) => ({
      plane: p.plane,
      origin: point3(p.origin)!,
      rotationDeg: p.rotationDeg === undefined ? undefined : num(p.rotationDeg),
    })),
    startPoint: point3(rawMeta.startPoint),
    endPoint: point3(rawMeta.endPoint),
    twistCenter: point2(rawMeta.twistCenter),
    rails: rawMeta.rails,
  };
}

/**
 * Apply the per-section rotation: an explicit `planes[].rotationDeg` wins;
 * otherwise the `twistDeg` shorthand is distributed evenly across the stack
 * (first section at 0 deg, last at `twistDeg`).
 */
function applySectionTwist(planes: LoftPlane[], twistDeg: number): LoftPlane[] {
  const n = planes.length;
  return planes.map((p, i) => ({
    ...p,
    rotationDeg: p.rotationDeg ?? (n > 1 ? (twistDeg * i) / (n - 1) : 0),
  }));
}

/**
 * A stack whose sections all lie on the same plane cannot enclose volume on
 * its own. OCCT's ThruSections throws a raw C++ exception for coincident wires
 * (and returns a zero-volume shell for some non-identical ones), which would
 * otherwise surface as a misleading kernel-failed. Start/end point
 * terminations cone the stack out of the plane and make coplanar sections
 * legitimate, so the gate skips those. Exact equality is deliberate: an offset
 * by FP dust still hands off to OCCT (which may build a valid sliver) instead
 * of being reported as an empty result.
 */
function isCollapsedPlaneStack(planes: LoftPlane[], meta: LoftMeta | undefined): boolean {
  if (meta?.startPoint !== undefined || meta?.endPoint !== undefined) return false;
  const first = planes[0];
  const offsetIdx = first.plane === 'XY' ? 2 : first.plane === 'YZ' ? 0 : 1;
  const planeOffset = first.origin[offsetIdx];
  return planes.every((p) => p.plane === first.plane && p.origin[offsetIdx] === planeOffset);
}

/** Explicit metadata.planes wins; else z-stack with spacing. */
function resolveLoftPlanes(
  ctx: LowerContext,
  r: FeatureRecord,
  sketches: OcctBackend[],
  sectionCount: number,
  meta: LoftMeta | undefined,
): LoftPlane[] | undefined {
  if (Array.isArray(meta?.planes)) {
    if (meta.planes.length !== sectionCount) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `loft planes length ${meta.planes.length} does not match section count ${sectionCount}.`,
        hint: 'If you pass opts.planes, its length must equal the section count. Or omit planes and use opts.spacing.',
      });
      return undefined;
    }
    return meta.planes;
  }
  const spacing = r.params.spacing?.evaluated ?? 10;
  return sketches.map((_, i) => ({
    plane: 'XY' as const,
    origin: [0, 0, i * spacing] as [number, number, number],
  }));
}

/** Resolve each rail id to a TopoDS_Edge, lowering a virtual curve3d on demand. */
function resolveLoftRails(
  ctx: LowerContext,
  r: FeatureRecord,
  railIds: string[],
): unknown[] | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const railEdges: any[] = [];
  for (const railId of railIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let edge: any = ctx.importedGeometry.get(railId);
    if (!edge && ctx.allRecords) {
      const upstream = ctx.allRecords.find((u) => u.id === railId);
      if (upstream?.kind === 'curve3d') {
        const upMeta = upstream.metadata as { curve3d?: unknown } | undefined;
        const cm = upMeta?.curve3d;
        if (!isCurve3DMetadata(cm)) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.curve3d.degenerate-controls',
            featureId: r.id,
            severity: 'error',
            message: `loft: rail curve3d '${railId}' is missing valid metadata.curve3d.`,
            hint: 'Build each rail via nurbsCurve(...) / spline3d(...) / curveBridge(...).',
          });
          return undefined;
        }
        try {
          edge = lowerCurve3D(cm).edge;
          ctx.importedGeometry.set(railId, edge as unknown as ShapeBackend);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `loft: failed to lower rail '${railId}': ${msg}`,
            hint: 'kernel-failed — verify the rail NURBS control net.',
          });
          return undefined;
        }
      }
    }
    if (!edge) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.loft.rail-miss',
        featureId: r.id,
        severity: 'error',
        message: `loft: rail '${railId}' could not be resolved to a curve.`,
        hint: HINT_TEMPLATES['feature.loft.rail-miss'].template,
      });
      return undefined;
    }
    railEdges.push(edge);
  }
  return railEdges;
}

/** Rail-guided loft: lift each section onto its plane, check rail proximity,
 *  then hand the wires to MakePipeShell. */
async function buildRailLoft(
  ctx: LowerContext,
  r: FeatureRecord,
  sketches: OcctBackend[],
  planes: LoftPlane[],
  railEdges: unknown[],
): Promise<ShapeBackend | undefined> {
  try {
    // Lift each section onto its plane and pull the outer wire.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionWires: any[] = [];
    for (let i = 0; i < sketches.length; i++) {
      const s = sketches[i] as unknown as {
        kind?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _drawing?: any;
        _hasNurbs?: boolean;
        _commands?: unknown;
      };
      const p = planes[i];
      if (s.kind !== 'sketch' || (!s._drawing && !s._hasNurbs)) {
        ctx.diagnostics.push({
          target: 'export-occt',
          code: 'feature.invalid-args',
          featureId: r.id,
          severity: 'error',
          message: `loft: input ${i} is not a sketch.`,
          hint: 'Pass closed Sketch sections to loft.',
        });
        return undefined;
      }
      let lifted: { face: () => { outerWire: () => { wrapped: unknown } } };
      if (s._hasNurbs && s._commands) {
        const { buildNurbsSketchOnPlane } = await import('../../../../kernel/backends/occt/pathNurbsLowerer');
        lifted = buildNurbsSketchOnPlane(s._commands as never, p.plane, {
          origin: p.origin,
        }) as unknown as typeof lifted;
      } else {
        lifted = s._drawing!.sketchOnPlane(
          p.plane,
          p.origin,
        ) as unknown as typeof lifted;
      }
      sectionWires.push(lifted.face().outerWire().wrapped);
    }
    for (let i = 0; i < railEdges.length; i++) {
      if (!railHitsSections(railEdges[i], sectionWires)) {
        ctx.diagnostics.push({
          target: 'export-occt',
          code: 'feature.loft.rail-miss',
          featureId: r.id,
          severity: 'error',
          message: `loft: rail[${i}] does not pass within 1 mm of every section.`,
          hint: HINT_TEMPLATES['feature.loft.rail-miss'].template,
        });
        return undefined;
      }
    }
    return lowerLoftWithRails(railEdges[0], sectionWires, railEdges[1]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT rail loft failed: ${msg}`,
      hint: 'OCCT MakePipeShell could not build a solid from these rails and sections — check that each rail meets every section.',
    });
    return undefined;
  }
}
