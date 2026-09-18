// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Edge } from 'replicad';
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { computeDihedralPublic } from '../../../../kernel/backends/occt/edgeQueries';
import { pickEdges } from '../../../../kernel/backends/occt/edgeSelection';
import {
  chamferWithHistory,
  filletWithHistory,
  mergeEdgeFeatureHistory,
  type EdgeRefForFilleting,
} from '../../../../kernel/backends/occt/historyAwareEdgeFeatures';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { FeatureId, FeatureRef } from '../../../../shared/intent/types';
import { built, finished, type LowerContext, type LowerOutcome } from './context';
import { drainResolvedWarnings, filterEdgesByMinLength } from './helpers';

// ---------------------------------------------------------------------------
// Shared helper: variable-radius fillet / variable-distance chamfer
// ---------------------------------------------------------------------------

type VariableEdgeKind = 'fillet' | 'chamfer';

type ApplyVariableEdgeFeatureResult =
  | { ok: true; shape: OcctBackend; diagnostics: CompilerDiagnostic[] }
  | { ok: false; diagnostics: CompilerDiagnostic[] };

/** One `{ edges, radius | distance }` entry as authored on `metadata.groups`. */
type VariableEdgeGroup = { radius?: number | { evaluated: number }; distance?: number | { evaluated: number } };

/**
 * Apply a variable-radius fillet or variable-distance chamfer.
 *
 * Both forms share the same plumbing: per-group synthetic FeatureRecord
 * construction, edge resolution via pickEdges, validation of the per-group
 * scalar (radius for fillet, distance for chamfer), and backend dispatch
 * to the corresponding *Variable method.
 *
 * Callers are `lowerFillet` / `lowerChamfer`; both pass `kind` to disambiguate
 * the value key, the backend method, and the diagnostic-code prefix.
 *
 * Returns either `{ shape, diagnostics }` (success) or `{ diagnostics }`
 * (failure — caller falls through to its own error handling).
 */
export function applyVariableEdgeFeature(
  kind: VariableEdgeKind,
  base: OcctBackend,
  feature: FeatureRecord,
  allRecords: readonly FeatureRecord[] | undefined,
): ApplyVariableEdgeFeatureResult {
  const diagnostics: CompilerDiagnostic[] = [];

  const meta = feature.metadata as {
    variable?: boolean;
    groups?: Array<VariableEdgeGroup>;
  } | undefined;

  const groups = meta?.groups ?? [];
  const valueKey: 'radius' | 'distance' = kind === 'fillet' ? 'radius' : 'distance';

  if (groups.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: kind === 'fillet'
        ? `variable-radius fillet has no groups.`
        : `variable-distance chamfer has no groups.`,
      hint: kind === 'fillet'
        ? 'Pass [{ edges: ..., radius: ... }, ...] with one entry per intended blend region.'
        : 'Pass [{ edges: ..., distance: ... }, ...] with one entry per intended bevel region.',
    });
    return { ok: false, diagnostics };
  }

  // N3 fix: runtime-narrow inputs.base to a 'feature' ref before extracting id.
  const baseRef = feature.inputs.base as FeatureRef | undefined;
  if (!baseRef || (baseRef as { kind?: string }).kind !== 'feature') {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: `${kind} input 'base' must be a feature ref; got ${JSON.stringify(baseRef)}.`,
      hint: 'Chain the variable-radius/distance feature onto a solid shape.',
    });
    return { ok: false, diagnostics };
  }
  const narrowedBase: FeatureRef = baseRef as { kind: 'feature'; id: FeatureId };

  // Per-group resolution loop. Build a synthetic one-input FeatureRecord
  // per group so we can reuse pickEdges' canonical/label/query/segments
  // dispatch — same behavior as single-radius edge selection.
  const filletGroups: Array<{ edges: Edge[]; radius: number }> = [];
  const chamferGroups: Array<{ edges: Edge[]; distance: number }> = [];

  for (let i = 0; i < groups.length; i++) {
    const resolved = resolveVariableEdgeGroup(
      { kind, valueKey, base, feature, allRecords, narrowedBase },
      groups[i],
      i,
      diagnostics,
    );
    if (!resolved) return { ok: false, diagnostics };
    if (kind === 'fillet') {
      filletGroups.push({ edges: resolved.edges, radius: resolved.value });
    } else {
      chamferGroups.push({ edges: resolved.edges, distance: resolved.value });
    }
  }

  let shape: OcctBackend;
  try {
    shape = kind === 'fillet'
      ? base.filletVariable(filletGroups)
      : base.chamferVariable(chamferGroups);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: feature.id,
      severity: 'error',
      message: kind === 'fillet'
        ? `OCCT variable fillet failed: ${msg}`
        : `OCCT variable chamfer failed: ${msg}`,
      hint: kind === 'fillet'
        ? 'OCCT could not apply that variable fillet — try smaller per-group radii or a coarser group split.'
        : 'OCCT could not apply that variable chamfer — try smaller per-group distances or a coarser group split.',
    });
    return { ok: false, diagnostics };
  }

  return { ok: true, shape, diagnostics };
}

interface VariableEdgeCtx {
  kind: VariableEdgeKind;
  valueKey: 'radius' | 'distance';
  base: OcctBackend;
  feature: FeatureRecord;
  allRecords: readonly FeatureRecord[] | undefined;
  narrowedBase: FeatureRef;
}

/** Validate one group's scalar and resolve its edge selection. Returns
 *  undefined once the failing branch has pushed its diagnostic. */
function resolveVariableEdgeGroup(
  vc: VariableEdgeCtx,
  g: VariableEdgeGroup,
  i: number,
  diagnostics: CompilerDiagnostic[],
): { edges: Edge[]; value: number } | undefined {
  const { kind, valueKey, feature } = vc;
  const raw = g[valueKey];
  // param()-driven values arrive as pre-resolved Params.
  const value = typeof raw === 'object' && raw !== null ? raw.evaluated : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: `${kind} group ${i} has invalid ${valueKey} ${value}; must be a positive finite number.`,
      hint: `Each group needs a positive finite ${valueKey}.`,
    });
    return undefined;
  }

  const synthInputs = buildGroupInputs(vc, i, diagnostics);
  if (!synthInputs) return undefined;

  // Synthesize a one-input record so pickEdges can resolve it.
  const synth: FeatureRecord = {
    id: feature.id,
    kind: feature.kind,
    params: {},
    inputs: synthInputs,
    transforms: [],
    suppressed: false,
  };

  const edgesResult = pickEdges(synth, vc.base, vc.allRecords);
  if ('error' in edgesResult) {
    // Forward the underlying selection diagnostic verbatim — its code
    // (feature.face-ref.* / feature.selection.*) is more specific than a
    // generic invalid-args.
    diagnostics.push({
      ...edgesResult.error,
      message: `${kind} group ${i}: ${edgesResult.error.message}`,
    });
    return undefined;
  }
  drainResolvedWarnings(synth, diagnostics);
  return { edges: edgesResult, value };
}

/** I1 fix: replace silent-drop conditional spreads with an explicit kind switch. */
function buildGroupInputs(
  vc: VariableEdgeCtx,
  i: number,
  diagnostics: CompilerDiagnostic[],
): Record<string, FeatureRef> | undefined {
  const { kind, feature } = vc;
  const ref = feature.inputs[`edge_group_${i}`] as FeatureRef | undefined;
  const synthInputs: Record<string, FeatureRef> = { base: vc.narrowedBase };
  if (!ref) return synthInputs;
  switch (ref.kind) {
    case 'edge':
      synthInputs.edges = ref;
      return synthInputs;
    case 'face':
      synthInputs.face = ref;
      return synthInputs;
    case 'feature':
    case 'vertex':
    case 'surface': {
      // Unexpected ref kind for an edge_group input. 'surface' is valid
      // only on `surfaceThicken` / `surfaceToShape` records — never on
      // an edge-feature input slot.
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: feature.id,
        severity: 'error',
        message: `${kind} group ${i} edge_group_${i} ref kind '${ref.kind}' is not supported (expected 'edge' or 'face').`,
        hint: 'Use an EdgeSelector or canonical face name in the edge_group slot.',
      });
      return undefined;
    }
    default: {
      // Exhaustiveness guard: catches any future FeatureRef kinds added to the union.
      const _exhaustive: never = ref;
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: feature.id,
        severity: 'error',
        message: `${kind} group ${i} edge_group_${i} ref kind '${(_exhaustive as { kind?: string }).kind ?? '<unknown>'}' is not supported (expected 'edge' or 'face').`,
        hint: 'Use an EdgeSelector or canonical face name in the edge_group slot.',
      });
      return undefined;
    }
  }
}

/** `fillet` — constant-radius (or the variable form via
 *  `applyVariableEdgeFeature`), with the smooth-edge pre-filter and the
 *  OCCT failure taxonomy. */
export function lowerFillet(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `fillet requires an input named 'base'.`,
      hint: 'Chain fillet onto a solid shape, e.g. box(10, 10, 10).fillet(1).',
    });
    throw new Error('fillet: no base shape');
  }
  // rc.12: variable-radius form is delegated to applyVariableEdgeFeature.
  const meta = r.metadata as { variable?: boolean; continuity?: 'G1' | 'G2' } | undefined;
  if (meta?.variable === true) {
    const result = applyVariableEdgeFeature('fillet', base, r, ctx.allRecords);
    ctx.diagnostics.push(...result.diagnostics);
    if (!result.ok) {
      return finished(base);
    }
    shape = result.shape;
    return built(shape);
  }
  // Slice C Task 6: optional continuity grade (G1 default; G2 calls
  // BRepFilletAPI_MakeFillet.SetContinuity(GeomAbs_G2, 1e-4)).
  const filletContinuity = meta?.continuity ?? 'G1';
  const radius = r.params.radius?.evaluated;
  if (radius === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `fillet requires a 'radius' parameter.`,
      hint: 'Pass a positive finite number as the first argument, e.g. .fillet(2).',
    });
    throw new Error('fillet: no radius');
  }
  const edgesResult = pickEdges(r, base, ctx.allRecords);
  if ('error' in edgesResult) {
    ctx.diagnostics.push(edgesResult.error);
    return finished(base);
  }
  drainResolvedWarnings(r, ctx.diagnostics);
  // Filter to sharp edges only — BRepFilletAPI_MakeFillet requires convex/concave
  // (non-smooth) edges. Smooth edges (G1, dihedral ≈ 180°) will cause OCCT to throw.
  // If all edges are already smooth (e.g., iterating a fillet on a face that was already
  // filleted), treat as a no-op success so the user intent ("round this face") is met.
  const shapeForDihedral = base.getReplicadShape() as unknown as { faces: import('replicad').Face[] };
  const SMOOTH_THRESHOLD = 5; // degrees; edges with dihedral > (180 - threshold) are smooth
  let nullCount = 0;
  const sharpEdges = (edgesResult as import('replicad').Edge[]).filter((e) => {
    const d = computeDihedralPublic(shapeForDihedral, e);
    // null means the dihedral could not be computed — either the edge has only one
    // adjacent face, isSameEdge found no match, or normalAt threw a non-Error C++
    // exception (typical for cylinder cap edges sitting on the parametric U-seam
    // of a CYLINDRE/CONE/SPHERE face). Track and inspect after the filter.
    if (d === null) {
      nullCount++;
      return false;
    }
    return d.angleDeg < 180 - SMOOTH_THRESHOLD;
  });
  let edgesForFillet: import('replicad').Edge[];
  if (sharpEdges.length === 0) {
    if (nullCount === 0) {
      // Genuinely all G1-smooth — fillet already satisfied, return shape unchanged.
      shape = base;
      return built(shape);
    }
    // All edges had unknown dihedral (e.g., cylinder cap edges on the
    // parametric seam where normalAt throws). OCCT can fillet circular
    // cap edges directly — trust it with the original edge set. The
    // non-Error catch below handles any genuine OCCT rejection cleanly.
    edgesForFillet = edgesResult as import('replicad').Edge[];
  } else {
    edgesForFillet = sharpEdges;
  }
  const filletFilter = filterEdgesByMinLength(edgesForFillet, 2 * radius, {
    op: 'fillet', paramName: 'radius', featureId: r.id,
  });
  if (filletFilter.diagnostic) ctx.diagnostics.push(filletFilter.diagnostic);
  if (filletFilter.diagnostic?.severity === 'error') {
    shape = base;
    return built(shape);
  }
  edgesForFillet = filletFilter.kept;
  try {
    // Convert replicad Edge[] → EdgeRefForFilleting[] by hashing each
    // edge's underlying TopoDS_Edge handle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edgeRefs: EdgeRefForFilleting[] = edgesForFillet.map((e: any) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hash: ((e.wrapped ?? e._wrapped ?? e) as any).HashCode(2147483647).toString(16),
    }));
    const filletResult = filletWithHistory(base, edgeRefs, radius, filletContinuity);
    const newMap = mergeEdgeFeatureHistory(base.historyMap, filletResult);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(filletResult.shape as any) as replicad.Shape3D;
    shape = new OcctBackend(wrapped, undefined, newMap);
  } catch (e) {
    if (!(e instanceof Error)) {
      // Non-JS exception (WASM/OCCT C++ exception pointer) thrown during Build.
      // String(e) on a raw WASM pointer leaks an unhelpful integer ("8479736"),
      // so we never include it in the diagnostic message regardless of path.
      if (r.inputs.face !== undefined) {
        // Pre-existing silent no-op: face-based fillet on already-G1-smooth
        // boundary (the fillet-of-fillet case) — the user intent of
        // "the face is already fully rounded" is met by returning unchanged.
        shape = base;
        return built(shape);
      }
      // Edge-based or default selection: OCCT genuinely rejected. Emit a
      // clean diagnostic without leaking the raw pointer.
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: 'OCCT fillet failed (non-Error C++ exception during Build)',
        hint: 'OCCT could not apply that fillet — try a smaller radius, a different edge selection, or check whether the target edges are already G1-smooth.',
      });
      return finished(base);
    }
    const msg = e.message;
    // Slice C Task 6: when G2 was requested and OCCT reports IsDone=false,
    // the geometry is the genuine "G2 not applicable here" case (adjacent
    // faces are themselves only G1). Surface the specific diagnostic so
    // the agent can downgrade to G1 or refit upstream faces.
    if (filletContinuity === 'G2' && /BRepFilletAPI_MakeFillet failed/.test(msg)) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.fillet.continuity-not-applicable',
        featureId: r.id,
        severity: 'error',
        message: `OCCT fillet failed with continuity: 'G2' — adjacent faces are not G2-compatible.`,
        hint: "drop continuity: 'G2' (adjacent faces are only G1) or refit the upstream faces as NURBS surfaces.",
      });
      return finished(base);
    }
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT fillet failed: ${msg}`,
      hint: 'OCCT could not apply that fillet — try a smaller radius (typically less than half of the smallest face dimension).',
    });
    return finished(base);
  }
  return built(shape);
}

/** `chamfer` — constant-distance, or the variable form via
 *  `applyVariableEdgeFeature`. */
export function lowerChamfer(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `chamfer requires an input named 'base'.`,
      hint: 'Chain chamfer onto a solid shape, e.g. box(10, 10, 10).chamfer(1).',
    });
    throw new Error('chamfer: no base shape');
  }
  // rc.12: variable-distance form is delegated to applyVariableEdgeFeature.
  const meta = r.metadata as { variable?: boolean } | undefined;
  if (meta?.variable === true) {
    const result = applyVariableEdgeFeature('chamfer', base, r, ctx.allRecords);
    ctx.diagnostics.push(...result.diagnostics);
    if (!result.ok) {
      return finished(base);
    }
    shape = result.shape;
    return built(shape);
  }
  const distance = r.params.distance?.evaluated;
  if (distance === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `chamfer requires a 'distance' parameter.`,
      hint: 'Pass a positive finite number as the first argument, e.g. .chamfer(2).',
    });
    throw new Error('chamfer: no distance');
  }
  const edgesResult = pickEdges(r, base, ctx.allRecords);
  if ('error' in edgesResult) {
    ctx.diagnostics.push(edgesResult.error);
    return finished(base);
  }
  drainResolvedWarnings(r, ctx.diagnostics);
  const chamferFilter = filterEdgesByMinLength(
    edgesResult as import('replicad').Edge[],
    2 * distance,
    { op: 'chamfer', paramName: 'distance', featureId: r.id },
  );
  if (chamferFilter.diagnostic) ctx.diagnostics.push(chamferFilter.diagnostic);
  if (chamferFilter.diagnostic?.severity === 'error') {
    shape = base;
    return built(shape);
  }
  const edgesForChamfer = chamferFilter.kept;
  try {
    // Convert replicad Edge[] → EdgeRefForFilleting[] by hashing each
    // edge's underlying TopoDS_Edge handle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edgeRefs: EdgeRefForFilleting[] = edgesForChamfer.map((e: any) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hash: ((e.wrapped ?? e._wrapped ?? e) as any).HashCode(2147483647).toString(16),
    }));
    const chamferResult = chamferWithHistory(base, edgeRefs, distance);
    const newMap = mergeEdgeFeatureHistory(base.historyMap, chamferResult);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(chamferResult.shape as any) as replicad.Shape3D;
    shape = new OcctBackend(wrapped, undefined, newMap);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT chamfer failed: ${msg}`,
      hint: 'OCCT could not apply that chamfer — try a smaller distance (typically less than half of the smallest face dimension).',
    });
    return finished(base);
  }
  return built(shape);
}
