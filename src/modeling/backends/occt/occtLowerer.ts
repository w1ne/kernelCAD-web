import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../../../kernel/backends/backend';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind, Param, PatternSpec, PlaneSpec, Vec3, Vec3Param } from '../../../shared/intent/types';
import { isValidPlaneSpec } from '../../../shared/intent/types';
import { forwardKinematics, type NumericPoses } from '../../capture/forwardKinematics';
import type { AssemblyJointStored, AssemblyPartStored } from '../../capture/assembly';
import { mateFk, type ResolvedMatePart } from '../../mates/solver';
import { expandCoupledPoses, type MateCouplingRecord } from '../../mates/coupledPoses';
import type { Connector } from '../../mates/connector';
import type { MateRecord } from '../../mates/mate';
import type { MateType } from '../../mates/mateTypes';
import { resolveTopologyOriginOnBackend } from './connectorTopology';
import { KernelError } from '../../../shared/intent/kernelError';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import {
  buildNurbsFace, buildSkinnedSurface, thickenFace, faceToShape,
} from '../../../kernel/backends/occt/nurbsSurfaceLowerer';
import { pickEdges, pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { computeDihedralPublic } from '../../../kernel/backends/occt/edgeQueries';
import { lowerSheetMetalBend, resolveBendAxis } from './sheetMetalLowerer';
import { findRootSheetMetalRecord } from '../../sheetMetal';
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../../kernel/backends/sceneBackend';
import { lookupSourceColor } from '../../../kernel/backends/occt/lookupSourceColor';
import { Transform } from '../../../shared/runtime/se3';
import * as replicad from 'replicad';
import {
  cutWithHistory,
  fuseWithHistory,
  intersectWithHistory,
  mergeBooleanHistory,
} from '../../../kernel/backends/occt/historyAwareBooleans';
import {
  filletWithHistory,
  chamferWithHistory,
  shellWithHistory,
  mergeEdgeFeatureHistory,
  type EdgeRefForFilleting,
} from '../../../kernel/backends/occt/historyAwareEdgeFeatures';
import { propagateTransformHistory } from '../../../kernel/naming/evolutionRecord';
import type { HistoryMap, FaceLineage } from '../../../kernel/naming/evolutionRecord';
import { retagInstance } from '../../../kernel/backends/occt/patternHistory';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/codes';

// ---------------------------------------------------------------------------
// Shared helpers: Vec3Param resolution + axis normalization
// ---------------------------------------------------------------------------

/** Drain any `_resolvedWarnings` deposited on `record` by edgeSelection's
 *  resolveFaceRef created-ref branch into the lowerer's diagnostics list.
 *  Called immediately after a successful `pickEdges` / `pickFace` so warnings
 *  ride out alongside the feature's other diagnostics. */
function drainResolvedWarnings(
  record: FeatureRecord,
  diagnostics: CompilerDiagnostic[],
): void {
  const warns = (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings;
  if (warns && warns.length > 0) {
    diagnostics.push(...warns);
    (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings = [];
  }
}


/** Read a Vec3Param to a numeric Vec3 by picking the `evaluated` field of each
 *  component. The recompute engine pre-resolves every Param-shaped node in the
 *  record (params + metadata + transforms) against the live ParamTable before
 *  invoking the lowerer, so `evaluated` already reflects the current value
 *  for any ParamRef-bearing component. Lowerers therefore never touch the
 *  ParamTable directly — they only read `.evaluated`. */
function readVec3Param(v: Vec3Param): [number, number, number] {
  return [v.x.evaluated, v.y.evaluated, v.z.evaluated];
}

/** Normalize an axis vector to unit length. Throws `feature.invalid-args` with
 *  hint `invalid-args.axis.zero` when the resolved vector is zero or contains
 *  non-finite components. The throw lets a ParamRef edit that produces a
 *  zero-axis surface as a structured diagnostic via the dispatcher's
 *  exception path rather than producing a silently-broken transform. */
export function normalizeAxis(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0 || !Number.isFinite(len)) {
    throw new KernelError(
      'feature.invalid-args',
      `axis must be non-zero; resolved to [${v[0]}, ${v[1]}, ${v[2]}].`,
      undefined,
      'invalid-args.axis.zero — provide a non-zero direction; ParamRefs may have resolved to zero.',
    );
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ---------------------------------------------------------------------------
// Shared helper: variable-radius fillet / variable-distance chamfer
// ---------------------------------------------------------------------------

type VariableEdgeKind = 'fillet' | 'chamfer';

type ApplyVariableEdgeFeatureResult =
  | { ok: true; shape: OcctBackend; diagnostics: CompilerDiagnostic[] }
  | { ok: false; diagnostics: CompilerDiagnostic[] };

/**
 * Apply a variable-radius fillet or variable-distance chamfer.
 *
 * Both forms share the same plumbing: per-group synthetic FeatureRecord
 * construction, edge resolution via pickEdges, validation of the per-group
 * scalar (radius for fillet, distance for chamfer), and backend dispatch
 * to the corresponding *Variable method.
 *
 * Callers are the `case 'fillet':` and `case 'chamfer':` arms of the lower
 * function; both pass `kind` to disambiguate the value key, the backend
 * method, and the diagnostic-code prefix.
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
    groups?: Array<{ radius?: number; distance?: number }>;
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
  const baseRef = feature.inputs.base as import('../../../shared/intent/types').FeatureRef | undefined;
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
  const narrowedBase: import('../../../shared/intent/types').FeatureRef = baseRef as { kind: 'feature'; id: import('../../../shared/intent/types').FeatureId };

  // Per-group resolution loop. Build a synthetic one-input FeatureRecord
  // per group so we can reuse pickEdges' canonical/label/query/segments
  // dispatch — same behavior as single-radius edge selection.
  const filletGroups: Array<{ edges: import('replicad').Edge[]; radius: number }> = [];
  const chamferGroups: Array<{ edges: import('replicad').Edge[]; distance: number }> = [];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const value = g[valueKey];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: feature.id,
        severity: 'error',
        message: `${kind} group ${i} has invalid ${valueKey} ${value}; must be a positive finite number.`,
        hint: `Each group needs a positive finite ${valueKey}.`,
      });
      return { ok: false, diagnostics };
    }

    // I1 fix: replace silent-drop conditional spreads with an explicit kind switch.
    const ref = feature.inputs[`edge_group_${i}`] as import('../../../shared/intent/types').FeatureRef | undefined;
    const synthInputs: Record<string, import('../../../shared/intent/types').FeatureRef> = {
      base: narrowedBase,
    };
    if (ref) {
      switch (ref.kind) {
        case 'edge':
          synthInputs.edges = ref;
          break;
        case 'face':
          synthInputs.face = ref;
          break;
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
          return { ok: false, diagnostics };
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
          return { ok: false, diagnostics };
        }
      }
    }

    // Synthesize a one-input record so pickEdges can resolve it.
    const synth: FeatureRecord = {
      id: feature.id,
      kind: feature.kind,
      params: {},
      inputs: synthInputs,
      transforms: [],
      suppressed: false,
    };

    const edgesResult = pickEdges(synth, base, allRecords);
    if ('error' in edgesResult) {
      // Forward the underlying selection diagnostic verbatim — its code
      // (feature.face-ref.* / feature.selection.*) is more specific than a
      // generic invalid-args.
      diagnostics.push({
        ...edgesResult.error,
        message: `${kind} group ${i}: ${edgesResult.error.message}`,
      });
      return { ok: false, diagnostics };
    }
    drainResolvedWarnings(synth, diagnostics);

    if (kind === 'fillet') {
      filletGroups.push({ edges: edgesResult, radius: value });
    } else {
      chamferGroups.push({ edges: edgesResult, distance: value });
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

/**
 * Lowers `FeatureRecord`s to `OcctBackend` shapes.
 *
 * Owns dispatch from the intent IR (`box`, `cylinder`, `sphere`, `extrude`,
 * `revolve`, `boolean`) to OCCT primitives, then applies any post-hoc
 * `record.transforms` in order. Boolean ops walk `inputs.byKey`: `base` is
 * the LHS, all keys starting with `cutter_` (lexicographically sorted) are
 * the operand sequence applied in left-to-right order.
 *
 * Operations not supported in v0.1 produce a single error `CompilerDiagnostic`
 * rather than throwing, so callers can collect diagnostics for a whole tree.
 */
/** v0.5: build a lowerer pre-wired with a session's imported STEP geometry.
 *  Use from any code that ran `runScript` and then needs to lower the
 *  resulting records — without this, `importedStep` records error out
 *  because the lowerer's `importedGeometry` map is empty. */
export function createOcctLowerer(
  session?: {
    importedGeometry: Map<string, ShapeBackend>;
    scriptDir?: string;
    /** W1.3: surface-record lookup. Optional for callers that don't ship NURBS. */
    getSurfaceRecord?: (
      id: import('../../../shared/intent/surfaceRecord').SurfaceId,
    ) => import('../../../shared/intent/surfaceRecord').SurfaceRecord | undefined;
  },
): OcctLowerer {
  const lowerer = new OcctLowerer();
  if (session) {
    lowerer.importedGeometry = session.importedGeometry;
    lowerer.scriptDir = session.scriptDir;
    if (session.getSurfaceRecord) {
      lowerer.getSurfaceRecord = session.getSurfaceRecord.bind(session);
    }
  }
  return lowerer;
}

export class OcctLowerer implements FeatureLowerer {
  readonly target: BackendTarget = 'export-occt';
  readonly supports: ReadonlySet<FeatureKind> = new Set<FeatureKind>([
    'box',
    'cylinder',
    'sphere',
    'extrude',
    'revolve',
    'boolean',
    'fillet',
    'chamfer',
    'shell',
    'sketch',    // NEW
    'sweep',     // NEW (v0.13.0-rc.8)
    'loft',      // NEW (v0.13.0-rc.10)
    'mirror',    // NEW (v0.13.0-rc.13)
    'pattern',
    'importedStep',  // v0.5: lib.fromSTEP(path)
    'assemblyPart',
    'assemblyJoint',
    'assemblyConnect',
    'assemblyModel',
    'solvedAssembly',
    'assemblyExport',
    'surfaceThicken',   // W1.3
    'surfaceToShape',   // W1.3
    'sheetMetal',       // W2.2
    'sheetMetalBend',   // W2.2
    'sdfMaterialize',   // W2.3
    'referenceImage',   // virtual — no BREP; defense-in-depth guard
  ]);

  /** v0.5: pre-lowered geometry for `importedStep` records, populated by
   *  `lib.fromSTEP(path)` at script-run time. Keyed by feature id; threaded
   *  in by the script-runtime caller after the script returns. */
  importedGeometry: Map<string, ShapeBackend> = new Map();

  /** W1.3: per-lowerer-instance cache mapping `SurfaceId` to the resolved
   *  surface (either a single Replicad Face for `nurbsSurface`, or a
   *  multi-face shell for `surfaceFromCurves`). Populated lazily on first
   *  surface ref consumption per surface id; reused across `surfaceThicken`
   *  / `surfaceToShape` records that point at the same surface. */
  surfaceCache: Map<
    import('../../../shared/intent/surfaceRecord').SurfaceId,
    import('../../../kernel/backends/occt/nurbsSurfaceLowerer').BuiltSurface
  > = new Map();

  /** W1.3: optional session hook to look up a SurfaceRecord by id at lower
   *  time. Provided by `createOcctLowerer(session)`; undefined if the lowerer
   *  was instantiated without a session (legacy / unit-test code paths). */
  getSurfaceRecord?: (
    id: import('../../../shared/intent/surfaceRecord').SurfaceId,
  ) => import('../../../shared/intent/surfaceRecord').SurfaceRecord | undefined;

  /**
   * Resolve the Replicad Face referenced by `record.inputs.surface`. Order of
   * resolution: external map (`inputs.surfaces`) → instance cache
   * (`surfaceCache`) → session lookup via `getSurfaceRecord` + lazy build.
   *
   * Returns undefined and appends the appropriate diagnostic when the input
   * ref is missing/wrong-kind or the underlying surface cannot be built.
   */
  private resolveSurfaceFaceForRecord(
    r: FeatureRecord,
    inputs: ResolvedInputs,
    diagnostics: CompilerDiagnostic[],
  ): import('../../../kernel/backends/occt/nurbsSurfaceLowerer').BuiltSurface | undefined {
    const surfaceRef = r.inputs.surface;
    if (!surfaceRef || surfaceRef.kind !== 'surface') {
      diagnostics.push({
        target: this.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `${r.kind}: missing or wrong-kind surface input ref.`,
        hint: `invalid-args.${r.kind}.input — call the corresponding Surface method on a captured Surface.`,
      });
      return undefined;
    }
    const sid = surfaceRef.surfaceId;
    let surface: import('../../../kernel/backends/occt/nurbsSurfaceLowerer').BuiltSurface | undefined =
      inputs.surfaces?.get(sid) ?? this.surfaceCache.get(sid);
    if (surface) return surface;
    if (!this.getSurfaceRecord) {
      diagnostics.push({
        target: this.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `${r.kind}: surface ${sid} not resolved (lowerer has no session hook).`,
        hint: 'recompute.input.missing — use createOcctLowerer(session) so SurfaceRecords are reachable.',
      });
      return undefined;
    }
    const surfRec = this.getSurfaceRecord(sid);
    if (!surfRec) {
      diagnostics.push({
        target: this.target,
        code: 'recompute.input.missing',
        featureId: r.id,
        severity: 'error',
        message: `${r.kind}: SurfaceRecord ${sid} not found in session.`,
        hint: 'recompute.input.missing — Surface was not captured before its thicken/toShape escape.',
      });
      return undefined;
    }
    try {
      if (surfRec.data.kind === 'nurbsSurface') {
        const face = buildNurbsFace({
          controls: surfRec.data.controls,
          weights: surfRec.data.weights,
          degree: surfRec.data.degree,
          knots: surfRec.data.knots,
          periodic: surfRec.data.periodic,
        });
        surface = { kind: 'face', face };
      } else if (surfRec.data.kind === 'surfaceFromCurves') {
        // Section sketches are passed via the consumer record's inputs map
        // (SurfaceProxy.buildInputsWithSectionRefs adds `section_<i>` feature
        // refs so the dep graph drives their lowering before this record is
        // visited). Read them from `inputs.byKey` here.
        const sectionShapes: OcctBackend[] = [];
        for (let i = 0; i < surfRec.data.sectionIds.length; i++) {
          const fid = surfRec.data.sectionIds[i];
          const back = inputs.byKey[`section_${i}`] as OcctBackend | undefined;
          if (!back) {
            diagnostics.push({
              target: this.target,
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
        surface = buildSkinnedSurface(sectionShapes, planes);
      } else {
        diagnostics.push({
          target: this.target,
          code: 'feature.invalid-args',
          featureId: r.id,
          severity: 'error',
          message: `Unknown SurfaceRecord data kind on ${sid}.`,
          hint: 'Use nurbsSurface(...) or surfaceFromCurves(...) to capture a Surface.',
        });
        return undefined;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      diagnostics.push({
        target: this.target,
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: `${r.kind}: surface build failed: ${msg}`,
        hint: 'kernel-failed — fix the control net / degree / sections per the diagnostic message.',
      });
      return undefined;
    }
    if (!surface) return undefined;
    this.surfaceCache.set(sid, surface);
    return surface;
  }

  /** v0.6: absolute directory of the calling `.kcad.ts` script. Used by the
   *  text lowerer to resolve relative `fontPath(...)` arguments. */
  scriptDir?: string;

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const diagnostics: CompilerDiagnostic[] = [];
    let shape: ShapeBackend;

    // Record table for label-resolution path; threaded through pickEdges/pickFace.
    const allRecords = inputs.records;

    switch (r.kind) {
      case 'box': {
        const x = r.params.x.evaluated;
        const y = r.params.y.evaluated;
        const z = r.params.z.evaluated;
        const centered = (r.params.centered?.evaluated ?? 0) > 0.5;
        const rawBox = OcctBackend.box(x, y, z, centered);
        const boxSeedMap: HistoryMap = new Map();
        const boxFaceNames = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
        for (const name of boxFaceNames) {
          try {
            const hash = rawBox.findCanonicalFaceHash(name);
            const lineage: FaceLineage = { rootHash: hash, canonicalName: name, rootFeatureId: r.id };
            boxSeedMap.set(hash, lineage);
          } catch {
            // defensive: shouldn't happen for box, but skip silently if it does
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const boxWrapped = (rawBox as OcctBackend).getReplicadShape() as any;
        shape = new OcctBackend(boxWrapped, 'box', boxSeedMap);
        break;
      }
      case 'cylinder': {
        const rawCyl = OcctBackend.cylinder(r.params.h.evaluated, r.params.r.evaluated);
        const cylSeedMap: HistoryMap = new Map();
        const cylinderFaceNames = ['top', 'bottom'] as const;
        for (const name of cylinderFaceNames) {
          try {
            const hash = rawCyl.findCanonicalFaceHash(name);
            cylSeedMap.set(hash, { rootHash: hash, canonicalName: name, rootFeatureId: r.id });
          } catch {
            // defensive: skip if face not found
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cylWrapped = (rawCyl as OcctBackend).getReplicadShape() as any;
        shape = new OcctBackend(cylWrapped, 'cylinder', cylSeedMap);
        break;
      }
      case 'sphere': {
        // Sphere has no canonical planar face names — leave historyMap undefined.
        // Falls back to the legacy !base.kind path in edgeSelection (correct behaviour).
        shape = OcctBackend.sphere(r.params.r.evaluated);
        break;
      }
      case 'importedStep': {
        // `lib.fromSTEP(path)` ran the import at capture time (host-side
        // fs read + replicad.importSTEP); the resulting OcctBackend was
        // parked in `lowerer.importedGeometry` keyed by feature id.
        // Lowering is a hand-back — the geometry is already a Shape3D.
        const backend = this.importedGeometry.get(r.id);
        if (!backend) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `importedStep record '${r.id}' has no pre-lowered geometry registered on the lowerer.`,
            hint: "invalid-args.importedStep.missing-backend — wire the session's importedGeometry map into the lowerer before calling engine.run().",
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        shape = backend;
        break;
      }
      case 'sdfMaterialize': {
        // `sdf.materialize(field, opts?)` ran the marching-cubes sweep at
        // capture time (host-side pure JS + OCCT sewing); the resulting
        // OcctBackend was parked in `session.importedGeometry` keyed by
        // feature id. Lowering is a hand-back — geometry is already built.
        const backend = this.importedGeometry.get(r.id);
        if (!backend) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sdfMaterialize record '${r.id}' has no pre-lowered geometry registered on the lowerer.`,
            hint: "invalid-args.sdfMaterialize.missing-backend — wire the session's importedGeometry map into the lowerer before calling engine.run().",
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        shape = backend;
        break;
      }
      case 'sketch': {
        const meta = r.metadata as { textContent?: unknown; commands?: unknown } | undefined;
        if (typeof meta?.textContent === 'string') {
          const res = await (await import('../../../kernel/backends/occt/textLowerer')).lowerSketchText(r, this.scriptDir);
          if (!res.ok) {
            diagnostics.push(...res.diagnostics);
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          shape = res.backend;
          break;
        }
        const commands = meta?.commands;
        if (!Array.isArray(commands) || commands.length === 0) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sketch requires metadata.commands: SketchCommand[] OR metadata.textContent: string.`,
            hint: 'Construct sketches via path().moveTo(...).lineTo(...).close() OR sketch.text(content, opts).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = OcctBackend.fromSketchCommands(commands as import('../../capture/sketch').SketchCommand[]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Narrow degenerate-arc cases (radiusArc-only for now) to the kept
          // specific code; everything else collapses into the generic
          // kernel-failed bucket.
          const isDegenerateArc = msg.startsWith('radiusArc:');
          const code = isDegenerateArc ? 'feature.sketch.degenerate-arc' : 'feature.kernel-failed';
          const hint = isDegenerateArc
            ? 'The arc segment is degenerate. Try a larger radius, different endpoints, or another arc constructor (threePointsArc/sagittaArc).'
            : 'Sketch construction failed — read the diagnostic message for the underlying error.';
          diagnostics.push({
            target: 'export-occt',
            code,
            featureId: r.id,
            severity: 'error',
            message: `sketch construction failed: ${msg}`,
            hint,
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'extrude': {
        // Profile kind is a quoted string in IR (e.g. "'rect'", "'circle'").
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'rect') {
          const height = r.params.height.evaluated;
          shape = OcctBackend.extrudeRect(
            r.params.w.evaluated,
            r.params.h.evaluated,
            height,
          );
        } else if (profileKind === 'circle') {
          const height = r.params.height.evaluated;
          shape = OcctBackend.extrudeCircle(r.params.r.evaluated, height);
        } else if (profileKind === 'polygon') {
          const depth = r.params.depth.evaluated;
          const points = (r.metadata as { points?: unknown } | undefined)?.points;
          if (!Array.isArray(points) || points.length < 3 ||
              !points.every(p => Array.isArray(p) && p.length === 2 &&
                                  typeof p[0] === 'number' && typeof p[1] === 'number')) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `extrude polygon requires metadata.points: [number, number][] with at least 3 points.`,
              hint: 'Pass at least 3 [x, y] number pairs as the polygon points.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudePolygon(points as [number, number][], depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
              hint: 'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else if (profileKind === 'rounded-rect') {
          const width = r.params.width?.evaluated;
          const height = r.params.height?.evaluated;
          const radius = r.params.radius?.evaluated;
          const depth = r.params.depth?.evaluated;
          if (width === undefined || height === undefined || radius === undefined || depth === undefined) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `extrude rounded-rect requires width, height, radius, and depth params (positive finite numbers).`,
              hint: 'Pass width, height, radius, and depth as positive finite numbers.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudeRoundedRect(width, height, radius, depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
              hint: 'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else if (profileKind === 'sketch') {
          const depth = r.params.depth.evaluated;
          const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `extrude with profile='sketch' requires an input named 'sketch'.`,
              hint: 'Chain extrude from a path()...close() sketch.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          try {
            shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT extrude failed: ${msg}`,
              hint: 'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `extrude profile kind '${profileKind}' not supported. Use 'rect', 'circle', 'polygon', 'rounded-rect', or 'sketch'.`,
                hint: "Use a supported profile kind: 'rect', 'circle', 'polygon', 'rounded-rect', or 'sketch'.",
              },
            ],
          };
        }
        break;
      }
      case 'sheetMetal': {
        // Reuse the sketch→extrude pipeline. Sheet metal differs only in:
        //   (a) the record kind is 'sheetMetal' (threaded for face-label
        //       canonicalization and bend lineage walks);
        //   (b) thickness = depth;
        //   (c) kFactor + sketchPlane carried on metadata for .bend() and
        //       flattenPattern().
        const depth = r.params.thickness.evaluated;
        const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
        if (!sketchInput) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sheetMetal requires an input sketch.`,
            hint: 'Pass a closed path()...close() sketch as the first argument: sheetMetal(sketch, opts).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT extrude failed during sheetMetal lowering: ${msg}`,
            hint: 'sheetMetal lowers via the extrude pipeline. Check for self-intersecting profile or near-zero thickness.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'sheetMetalBend': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sheetMetalBend requires an input named 'base'.`,
            hint: 'Chain .bend() on a sheetMetal(...) Shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Walk lineage backward to find the root sheetMetal record so we can
        // read its kFactor and thickness. If none, emit feature.invalid-args.
        const rootRec = findRootSheetMetalRecord(r, allRecords ?? []);
        if (!rootRec) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `.bend() only works on Shapes whose lineage roots at sheetMetal(...).`,
            hint: 'Build the body via sheetMetal(sketch, opts), then chain .bend().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const kFactor = rootRec.params.kFactor.evaluated;
        const thickness = rootRec.params.thickness.evaluated;
        // Top-face normal for slice-1 xy-plane bodies is +Z. (We could read
        // metadata.sketchPlane to support xz/yz; slice-1 sheets lower on XY.)
        const topNormal: [number, number, number] = [0, 0, 1];
        // Resolve the bend axis from edges / face inputs.
        const axisResult = resolveBendAxis(
          base,
          r.inputs.edges,
          r.inputs.face,
          r.id,
          thickness,
        );
        if ('diagnostic' in axisResult) {
          diagnostics.push(axisResult.diagnostic);
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const result = lowerSheetMetalBend({
          featureId: r.id,
          base,
          axis: axisResult.axis,
          topNormal,
          angleDeg: r.params.angle.evaluated,
          radius: r.params.radius.evaluated,
          kFactor,
          thickness,
        });
        diagnostics.push(...result.diagnostics);
        if (!result.shape) {
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Persist the bend record on r.metadata for flattenPattern.
        if (result.bendRecord) {
          const md = (r.metadata ??= {}) as Record<string, unknown>;
          md.bendRecord = result.bendRecord;
        }
        shape = result.shape;
        break;
      }
      case 'revolve': {
        const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
        if (!sketchInput) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve requires an input named 'sketch'.`,
            hint: 'Chain revolve from a path()...close() sketch.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const commands = sketchInput.getSketchCommands();
        if (!commands) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve sketch input has no command history.`,
            hint: 'Chain revolve from a path()...close() sketch (the sketch must carry its command history).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Empty profile: only moveTo + close (or even less). No segments means
        // no area to revolve.
        const segmentCount = commands.filter(c => c.kind === 'lineTo' || c.kind === 'tangentArc').length;
        if (segmentCount === 0) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve profile has no line/arc segments — area is zero.`,
            hint: 'Add at least one lineTo or arc segment to the path before close.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Axis-cross check: any point with x < 0 means the profile spans the
        // rotation axis, which yields a self-intersecting revolve.
        const crossing = commands.find(c => (c.kind === 'moveTo' || c.kind === 'lineTo' || c.kind === 'tangentArc') && c.x.evaluated < 0);
        if (crossing) {
          const xv = (crossing as { x: { evaluated: number } }).x.evaluated;
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.revolve.crosses-axis',
            featureId: r.id,
            severity: 'error',
            message: `revolve profile point (x=${xv}) crosses rotation axis. All points must satisfy x >= 0.`,
            hint: 'A revolve profile must stay on one side of the rotation axis. Clamp all path coordinates to x >= 0.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Optional partial-revolve `angleDeg` param. Default 360 (full).
        // Range: (0, 360]. Out-of-range values are caught here and surfaced
        // as `feature.invalid-args` rather than letting replicad throw a
        // less-specific error.
        const angleDeg = r.params.angleDeg ? Number(r.params.angleDeg.evaluated) : 360;
        if (!Number.isFinite(angleDeg) || angleDeg <= 0 || angleDeg > 360) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `revolve angleDeg must be in (0, 360]; got ${angleDeg}.`,
            hint: 'Pass an angle in (0, 360]. Use 360 (default) for a full revolve, e.g. 180 for a half revolve.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = OcctBackend.revolveFromSketch(sketchInput, angleDeg);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT revolve failed: ${msg}`,
            hint: 'OCCT could not revolve — the profile may self-intersect or be degenerate.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'sweep': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'sketch') {
          const sketchInput = inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep with profile='sketch' requires an input named 'sketch'.`,
              hint: 'Chain sweep from a path()...close() sketch.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          const rail = (r.metadata as { rail?: unknown } | undefined)?.rail;
          if (!Array.isArray(rail) || rail.length < 2) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail must be an array of at least 2 points; got ${Array.isArray(rail) ? `length ${rail.length}` : 'non-array'}.`,
              hint: 'Pass a rail array of [x, y, z] tuples (≥2 points). Use helix(...) for helical rails.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          if (rail.length > 5000) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail has ${rail.length} points (cap is 5000). For helices, reduce \`pointsPerTurn\` or \`turns\`. For polylines, simplify the path.`,
              hint: 'Reduce rail point count to ≤ 5000. For helices, lower pointsPerTurn or turns.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Validate every entry is [number, number, number] of finite numbers.
          for (let i = 0; i < rail.length; i++) {
            const p = rail[i];
            if (!Array.isArray(p) || p.length !== 3 ||
                !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
              diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `sweep rail point at index ${i} must be a [x, y, z] tuple of finite numbers; got ${JSON.stringify(p)}.`,
                hint: 'Each rail point must be a [x, y, z] tuple of finite numbers.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics };
            }
          }
          const frenet = (r.params.frenet?.evaluated ?? 0) > 0.5;
          try {
            shape = OcctBackend.sweepFromSketch(
              sketchInput,
              rail as [number, number, number][],
              { frenet },
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // All sweep failure modes (multi-face profile, profile too large,
            // spine self-intersection, generic) collapse into kernel-failed.
            // The message preserves the underlying cause string from OCCT/
            // Replicad; the hint is generic to the sweep recovery class.
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT sweep failed: ${msg}`,
              hint: 'OCCT could not sweep — common causes: profile larger than rail curvature, sharp corners causing self-intersection, multi-face profile, or non-planar profile.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `sweep profile kind '${profileKind}' not supported. Use 'sketch'.`,
                hint: "Use profileKind 'sketch' for sweep.",
              },
            ],
          };
        }
        break;
      }
      case 'loft': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'sketch') {
          const sectionCount = r.params.sectionCount?.evaluated ?? 0;
          if (sectionCount < 2) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `loft needs at least 2 sketches (sectionCount=${sectionCount}).`,
              hint: 'Pass at least 2 sketches; e.g. s1.loft(s2).',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Collect sketch_0 through sketch_{N-1} from inputs.byKey
          const sketches: OcctBackend[] = [];
          for (let i = 0; i < sectionCount; i++) {
            const s = inputs.byKey[`sketch_${i}`] as OcctBackend | undefined;
            if (!s) {
              diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft missing input sketch_${i} — upstream sketch did not lower successfully.`,
                hint: 'Loft requires every upstream sketch input to lower successfully — check upstream sketch diagnostics first.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics };
            }
            sketches.push(s);
          }
          // Resolve planes: explicit metadata.planes wins; else z-stack with spacing.
          const meta = r.metadata as {
            planes?: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>;
            startPoint?: [number, number, number];
            endPoint?: [number, number, number];
          } | undefined;
          let planes: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>;
          if (Array.isArray(meta?.planes)) {
            if (meta.planes.length !== sectionCount) {
              diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft planes length ${meta.planes.length} does not match section count ${sectionCount}.`,
                hint: 'If you pass opts.planes, its length must equal the section count. Or omit planes and use opts.spacing.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics };
            }
            planes = meta.planes;
          } else {
            const spacing = r.params.spacing?.evaluated ?? 10;
            planes = sketches.map((_, i) => ({
              plane: 'XY' as const,
              origin: [0, 0, i * spacing] as [number, number, number],
            }));
          }
          const ruled = (r.params.ruled?.evaluated ?? 0) > 0.5;
          try {
            shape = OcctBackend.loftFromSketches(sketches, planes, {
              ruled,
              startPoint: meta?.startPoint,
              endPoint: meta?.endPoint,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT loft failed: ${msg}`,
              hint: 'OCCT could not loft these sections — try ruled: true for sharp transitions, or use sections with similar vertex counts and orientation.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: this.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft profile kind '${profileKind}' not supported. Use 'sketch'.`,
                hint: "Use profileKind 'sketch' for loft.",
              },
            ],
          };
        }
        break;
      }
      case 'boolean': {
        // Op expression is a quoted string in IR (e.g. "'difference'").
        const op = String(r.params.op.expression).replace(/'/g, '');
        const base = inputs.byKey['base'];
        if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
        let acc: OcctBackend = base as OcctBackend;
        const cutters = Object.entries(inputs.byKey)
          .filter(([k]) => k.startsWith('cutter_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v as OcctBackend);
        const opFn =
          op === 'difference' ? cutWithHistory :
          op === 'union' ? fuseWithHistory :
          op === 'intersection' ? intersectWithHistory :
          null;
        if (!opFn) throw new Error(`Unknown boolean op: ${op}`);
        for (const c of cutters) {
          const result = opFn(acc, c);
          const newMap = mergeBooleanHistory(acc.historyMap, c.historyMap, result);
          // Wrap the result TopoDS_Shape back into a Replicad Shape3D using
          // replicad.cast(), which downcasts the raw shape to the correct
          // OCCT subtype (Solid or Compound) and wraps it in the matching
          // Replicad class. The cast result is AnyShape; boolean ops always
          // yield a 3D solid or compound, so the cast to Shape3D is safe.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(result.shape as any) as replicad.Shape3D;
          acc = new OcctBackend(wrapped, undefined, newMap);
        }
        shape = acc;
        break;
      }
      case 'fillet': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
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
        const meta = r.metadata as { variable?: boolean } | undefined;
        if (meta?.variable === true) {
          const result = applyVariableEdgeFeature('fillet', base, r, allRecords);
          diagnostics.push(...result.diagnostics);
          if (!result.ok) {
            return { shape: base, diagnostics };
          }
          shape = result.shape;
          break;
        }
        const radius = r.params.radius?.evaluated;
        if (radius === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `fillet requires a 'radius' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .fillet(2).',
          });
          throw new Error('fillet: no radius');
        }
        const edgesResult = pickEdges(r, base, allRecords);
        if ('error' in edgesResult) {
          diagnostics.push(edgesResult.error);
          return { shape: base, diagnostics };
        }
        drainResolvedWarnings(r, diagnostics);
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
            break;
          }
          // All edges had unknown dihedral (e.g., cylinder cap edges on the
          // parametric seam where normalAt throws). OCCT can fillet circular
          // cap edges directly — trust it with the original edge set. The
          // non-Error catch below handles any genuine OCCT rejection cleanly.
          edgesForFillet = edgesResult as import('replicad').Edge[];
        } else {
          edgesForFillet = sharpEdges;
        }
        // M2: pre-filter edges below 2 × radius. The OCCT BlendChain solver
        // rejects fillet radii larger than half the target edge length;
        // historically this caused the WHOLE fillet operation to fail (see
        // E3, R6, R19 in the agent-eval rounds — they all had to "skip and
        // document" their front-face perimeter fillet/chamfer because the
        // R=3 lens-cutout corner edges were sub-1mm). Filtering pre-call
        // means the long edges get filleted and the agent gets a clean
        // info diagnostic naming the skipped count.
        const filletMinEdgeLength = 2 * radius;
        const longFilletEdges: import('replicad').Edge[] = [];
        let skippedFilletEdges = 0;
        for (const e of edgesForFillet) {
          // Edge.length is the arc length via BRepAdaptor_Curve; safe on
          // straight, arc, and spline edges. Throws if the edge has no
          // underlying curve (degenerate); skip those defensively.
          let len: number;
          try { len = e.length; } catch { skippedFilletEdges++; continue; }
          if (len >= filletMinEdgeLength) longFilletEdges.push(e); else skippedFilletEdges++;
        }
        if (skippedFilletEdges > 0 && longFilletEdges.length === 0) {
          // All target edges shorter than 2×radius — the fillet didn't run at
          // all. Surface as `error` (not `warn`) so the chain walker reports
          // the feature as failed; agent should retry with a smaller radius.
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.edge-feature.short-edges-skipped',
            featureId: r.id,
            severity: 'error',
            message: `fillet skipped: all ${skippedFilletEdges} target edges are shorter than 2 × radius = ${filletMinEdgeLength.toFixed(2)} mm`,
            hint: 'OCCT blend solver rejects fillet/chamfer radii larger than half the target edge length. Some edges were below 2 × radius and got skipped so the rest could chamfer. Either reduce the radius, refactor upstream booleans so target edges are longer, or scope your fillet/chamfer to a face/edge query that only matches the long edges.',
          });
          shape = base;
          break;
        }
        if (skippedFilletEdges > 0) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.edge-feature.short-edges-skipped',
            featureId: r.id,
            severity: 'warn',
            message: `fillet skipped ${skippedFilletEdges} of ${edgesForFillet.length} target edges shorter than 2 × radius = ${filletMinEdgeLength.toFixed(2)} mm; chamfering the remaining ${longFilletEdges.length}.`,
            hint: 'OCCT blend solver rejects fillet/chamfer radii larger than half the target edge length. Some edges were below 2 × radius and got skipped so the rest could chamfer. Either reduce the radius, refactor upstream booleans so target edges are longer, or scope your fillet/chamfer to a face/edge query that only matches the long edges.',
          });
          edgesForFillet = longFilletEdges;
        }
        try {
          // Convert replicad Edge[] → EdgeRefForFilleting[] by hashing each
          // edge's underlying TopoDS_Edge handle.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const edgeRefs: EdgeRefForFilleting[] = edgesForFillet.map((e: any) => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hash: ((e.wrapped ?? e._wrapped ?? e) as any).HashCode(2147483647).toString(16),
          }));
          const filletResult = filletWithHistory(base, edgeRefs, radius);
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
              break;
            }
            // Edge-based or default selection: OCCT genuinely rejected. Emit a
            // clean diagnostic without leaking the raw pointer.
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: 'OCCT fillet failed (non-Error C++ exception during Build)',
              hint: 'OCCT could not apply that fillet — try a smaller radius, a different edge selection, or check whether the target edges are already G1-smooth.',
            });
            return { shape: base, diagnostics };
          }
          const msg = e.message;
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT fillet failed: ${msg}`,
            hint: 'OCCT could not apply that fillet — try a smaller radius (typically less than half of the smallest face dimension).',
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'chamfer': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
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
          const result = applyVariableEdgeFeature('chamfer', base, r, allRecords);
          diagnostics.push(...result.diagnostics);
          if (!result.ok) {
            return { shape: base, diagnostics };
          }
          shape = result.shape;
          break;
        }
        const distance = r.params.distance?.evaluated;
        if (distance === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `chamfer requires a 'distance' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .chamfer(2).',
          });
          throw new Error('chamfer: no distance');
        }
        const edgesResult = pickEdges(r, base, allRecords);
        if ('error' in edgesResult) {
          diagnostics.push(edgesResult.error);
          return { shape: base, diagnostics };
        }
        drainResolvedWarnings(r, diagnostics);
        // M2: pre-filter edges below 2 × distance. Same rationale as fillet:
        // OCCT blend solver rejects chamfer distances larger than half the
        // target edge length. Filter pre-call so long edges get chamfered
        // and the agent gets a clean diagnostic naming the skipped count.
        const chamferMinEdgeLength = 2 * distance;
        const longChamferEdges: import('replicad').Edge[] = [];
        let skippedChamferEdges = 0;
        for (const e of edgesResult as import('replicad').Edge[]) {
          let len: number;
          try { len = e.length; } catch { skippedChamferEdges++; continue; }
          if (len >= chamferMinEdgeLength) longChamferEdges.push(e); else skippedChamferEdges++;
        }
        if (skippedChamferEdges > 0 && longChamferEdges.length === 0) {
          // All target edges shorter than 2×distance — chamfer didn't run.
          // `error` so the chain walker flags the feature as failed.
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.edge-feature.short-edges-skipped',
            featureId: r.id,
            severity: 'error',
            message: `chamfer skipped: all ${skippedChamferEdges} target edges are shorter than 2 × distance = ${chamferMinEdgeLength.toFixed(2)} mm`,
            hint: 'OCCT blend solver rejects fillet/chamfer radii larger than half the target edge length. Some edges were below 2 × radius and got skipped so the rest could chamfer. Either reduce the radius, refactor upstream booleans so target edges are longer, or scope your fillet/chamfer to a face/edge query that only matches the long edges.',
          });
          shape = base;
          break;
        }
        let edgesForChamfer: import('replicad').Edge[] = edgesResult as import('replicad').Edge[];
        if (skippedChamferEdges > 0) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.edge-feature.short-edges-skipped',
            featureId: r.id,
            severity: 'warn',
            message: `chamfer skipped ${skippedChamferEdges} of ${(edgesResult as import('replicad').Edge[]).length} target edges shorter than 2 × distance = ${chamferMinEdgeLength.toFixed(2)} mm; chamfering the remaining ${longChamferEdges.length}.`,
            hint: 'OCCT blend solver rejects fillet/chamfer radii larger than half the target edge length. Some edges were below 2 × radius and got skipped so the rest could chamfer. Either reduce the radius, refactor upstream booleans so target edges are longer, or scope your fillet/chamfer to a face/edge query that only matches the long edges.',
          });
          edgesForChamfer = longChamferEdges;
        }
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
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT chamfer failed: ${msg}`,
            hint: 'OCCT could not apply that chamfer — try a smaller distance (typically less than half of the smallest face dimension).',
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'shell': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `shell requires an input named 'base'.`,
            hint: 'Chain shell onto a solid shape.',
          });
          throw new Error('shell: no base shape');
        }
        const thickness = r.params.thickness?.evaluated;
        if (thickness === undefined) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `shell requires a 'thickness' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .shell(1, { face: \'top\' }).',
          });
          throw new Error('shell: no thickness');
        }
        const faceResult = pickFace(r, base, allRecords);
        if ('error' in faceResult) {
          diagnostics.push(faceResult.error);
          return { shape: base, diagnostics };
        }
        drainResolvedWarnings(r, diagnostics);
        try {
          // Convert replicad Face → { hash: FaceHash } by hashing the
          // underlying TopoDS_Face handle.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const faceHash = ((faceResult as any).wrapped ?? (faceResult as any)._wrapped ?? faceResult as any).HashCode(2147483647).toString(16);
          const shellResult = shellWithHistory(base, [{ hash: faceHash }], thickness);
          const newMap = mergeEdgeFeatureHistory(base.historyMap, shellResult);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(shellResult.shape as any) as replicad.Shape3D;
          shape = new OcctBackend(wrapped, undefined, newMap);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT shell failed: ${msg}`,
            hint: 'OCCT could not shell that solid — try a thinner wall or a different open face. Thickness must be smaller than the shape\'s minimum thickness.',
          });
          return { shape: base, diagnostics };
        }
        break;
      }
      case 'hole': {
        const target = inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `hole requires an input named 'target'.`,
            hint: 'Chain .hole() onto a solid shape, e.g. box(20, 20, 20).hole("top", { u: 0, v: 0, diameter: 4, depth: 5 }).',
          });
          throw new Error('hole: no target shape');
        }
        const { lowerHole } = await import('../../../kernel/backends/occt/holeLowerer');
        const res = lowerHole(r, target, allRecords);
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'holes': {
        const target = inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `holes requires an input named 'target'.`,
            hint: 'Chain .holes() onto a solid shape with at least one position.',
          });
          throw new Error('holes: no target shape');
        }
        const { lowerHoles } = await import('../../../kernel/backends/occt/holeLowerer');
        const res = lowerHoles(r, target, allRecords);
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'cutout': {
        const target = inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `cutout requires an input named 'target'.`,
            hint: 'Chain .cutout() onto a solid shape, passing a closed sketch profile.',
          });
          throw new Error('cutout: no target shape');
        }
        const profile = inputs.byKey.profile as OcctBackend | undefined;
        const { lowerCutout } = await import('../../../kernel/backends/occt/cutoutLowerer');
        const res = lowerCutout(r, target, profile, allRecords);
        diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'mirror': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires an input named 'base'.`,
            hint: "Chain mirror onto a solid shape, e.g. box(10,10,10).mirror({ plane: 'yz' }).",
          });
          throw new Error('mirror: no base shape');
        }
        const meta = r.metadata as { plane?: PlaneSpec } | undefined;
        const plane = meta?.plane;
        if (!isValidPlaneSpec(plane)) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires a valid plane spec; got ${JSON.stringify(plane)}.`,
            hint: "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset: <number> }.",
          });
          return { shape: base, diagnostics };
        }
        const mirrorInputHashes = base.faceHashes();
        const mirrorInputMap = base.historyMap;
        try {
          shape = base.mirror(plane);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT mirror union failed: ${msg}`,
            hint: 'OCCT rejected the mirror union — translate the source away from the mirror plane, or use { plane, offset }.',
          });
          return { shape: base, diagnostics };
        }
        // Mirror is a union internally; face count may change if faces on the
        // mirror plane merge. Only propagate historyMap when face count matches.
        if (mirrorInputMap !== undefined) {
          const mirrorOutputBackend = shape as OcctBackend;
          const mirrorOutputHashes = mirrorOutputBackend.faceHashes();
          if (mirrorOutputHashes.length === mirrorInputHashes.length) {
            const newMap = propagateTransformHistory(mirrorInputMap, mirrorInputHashes, mirrorOutputHashes);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wrapped = (mirrorOutputBackend.getReplicadShape() as any);
            shape = new OcctBackend(wrapped, undefined, newMap);
          }
          // else: face count mismatch due to mirror-plane face merging — leave shape
          // without historyMap; resolver will return face-ref-not-resolvable.
        }
        break;
      }
      case 'pattern': {
        const base = inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: this.target,
            code: 'feature.pattern.source-not-found',
            featureId: r.id,
            severity: 'error',
            message: `pattern base input is missing or failed.`,
            hint: HINT_TEMPLATES['feature.pattern.source-not-found'].template,
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const pattern = (r.metadata as { pattern?: PatternSpec } | undefined)?.pattern;
        if (!pattern) {
          diagnostics.push({
            target: this.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: 'pattern feature is missing pattern metadata.',
            hint: 'Create patterns through .patternLinear(...) / .patternCircular(...) / .patternGrid(...).',
          });
          return { shape: base, diagnostics };
        }

        // Runtime count guard (catches Param-bound counts < 2 that capture-time
        // proxy validation can't see).
        const totalCount = pattern.kind === 'grid'
          ? pattern.x.count * pattern.y.count
          : pattern.count;
        if (totalCount < 2) {
          diagnostics.push({
            target: this.target,
            code: 'feature.pattern.count-out-of-range',
            featureId: r.id,
            severity: 'error',
            message: `pattern total instance count is ${totalCount}; must be >= 2.`,
            hint: HINT_TEMPLATES['feature.pattern.count-out-of-range'].template,
          });
          return { shape: base, diagnostics };
        }

        // Source FeatureId is the named input that the captured FeatureRecord
        // references. We retag every lineage entry whose featureId matches it.
        const sourceId = (r.inputs.base as { kind: 'feature'; id: string }).id;

        // --- Instance enumeration -------------------------------------------
        // Build an iterator yielding (i, transformFn) pairs covering all
        // count-1 derived instances. Instance 0 = base (no transform applied
        // beyond retag). Order: linear/circular walk i=1..count-1; grid walks
        // (x,y) skipping (0,0) in (x then y) order. We preserve the (x,y)
        // order so historyMap entries match an externally predictable instance
        // numbering: i = x * y.count + y, skipping (0,0).

        type Instance = { i: number; applyTo: (s: OcctBackend) => OcctBackend };
        const instances: Instance[] = [];
        if (pattern.kind === 'linear') {
          for (let i = 1; i < pattern.count; i++) {
            const [dx, dy, dz] = pattern.direction;
            const s = pattern.spacing * i;
            instances.push({
              i,
              applyTo: (sh) => sh.translate(dx * s, dy * s, dz * s),
            });
          }
        } else if (pattern.kind === 'circular') {
          for (let i = 1; i < pattern.count; i++) {
            const ang = (pattern.angleDeg / pattern.count) * i;
            instances.push({
              i,
              applyTo: (sh) => sh.rotate(pattern.axis, ang),
            });
          }
        } else {
          // grid: instance index = x * y.count + y; skip (0,0).
          for (let x = 0; x < pattern.x.count; x++) {
            for (let y = 0; y < pattern.y.count; y++) {
              if (x === 0 && y === 0) continue;
              const idx = x * pattern.y.count + y;
              const tx =
                pattern.x.direction[0] * pattern.x.spacing * x +
                pattern.y.direction[0] * pattern.y.spacing * y;
              const ty =
                pattern.x.direction[1] * pattern.x.spacing * x +
                pattern.y.direction[1] * pattern.y.spacing * y;
              const tz =
                pattern.x.direction[2] * pattern.x.spacing * x +
                pattern.y.direction[2] * pattern.y.spacing * y;
              instances.push({ i: idx, applyTo: (sh) => sh.translate(tx, ty, tz) });
            }
          }
        }

        // --- Cumulative fuse with retagged-per-instance history --------------

        // Instance 0 — base, no transform. Retag its lineage entries.
        // We reuse `base`'s TopoDS directly (no clone), so its face hashes
        // match `tagged0`'s keys. Subsequent fuses build new OcctBackends so
        // base remains untouched.
        const base0Map = (base.historyMap ?? new Map()) as HistoryMap;
        const tagged0 = retagInstance(base0Map, sourceId, 0);
        let cumulative = new OcctBackend(
          base.getReplicadShape() as replicad.Shape3D,
          base.kind,
          tagged0,
        );

        // Hashes are read from `base` directly (not a clone). Cloning may
        // refresh TShape pointers and shift face hashes; reading from `base`
        // keeps them aligned with `base.historyMap`. The transform is applied
        // to a clone so it doesn't mutate `base`.
        const baseInputHashes = base.faceHashes();
        for (const inst of instances) {
          // Clone base, apply transform; propagate history through transform.
          const cloneOfBase = base.clone();
          const transformed = inst.applyTo(cloneOfBase);
          const outputHashes = transformed.faceHashes();
          let transformedMap: HistoryMap;
          if (base.historyMap && outputHashes.length === baseInputHashes.length) {
            transformedMap = propagateTransformHistory(base.historyMap, baseInputHashes, outputHashes);
          } else {
            transformedMap = new Map();   // defensive — no history to propagate
          }
          const taggedInstanceMap = retagInstance(transformedMap, sourceId, inst.i);
          const instanceBackend = new OcctBackend(
            transformed.getReplicadShape() as replicad.Shape3D,
            base.kind,
            taggedInstanceMap,
          );
          // History-aware fuse — same pattern as `case 'boolean':`.
          const fused = fuseWithHistory(cumulative, instanceBackend);
          const newMap = mergeBooleanHistory(cumulative.historyMap, instanceBackend.historyMap, fused);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(fused.shape as any) as replicad.Shape3D;
          cumulative = new OcctBackend(wrapped, base.kind, newMap);
        }
        shape = cumulative;
        break;
      }
      case 'assemblyPart': {
        const base = inputs.byKey.shape as OcctBackend | undefined;
        if (!base) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly part shape input is missing or failed.`,
            hint: 'Assembly parts must wrap a successfully lowered source shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        shape = base.clone();
        const at = (r.metadata as { at?: Vec3Param } | undefined)?.at;
        if (at !== undefined) {
          const [tx, ty, tz] = readVec3Param(at);
          shape = shape.translate(tx, ty, tz);
        }
        break;
      }
      case 'assemblyJoint': {
        const partA = inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly joint input 'a' is missing or failed.`,
            hint: 'Assembly joints must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Read joint metadata Vec3 values. Joint frames are now pure numeric
        // tuples (v1 spec deferred joint reactivity). `normalizeAxis`
        // validates that the axis is non-zero; the throw surfaces as a
        // structured diagnostic via the dispatcher's exception path.
        const jointMeta = r.metadata as { origin?: [number, number, number]; axis?: [number, number, number] } | undefined;
        if (jointMeta?.axis !== undefined) {
          normalizeAxis(jointMeta.axis);
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyConnect': {
        const partA = inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly connect input 'a' is missing or failed.`,
            hint: 'Assembly connect records must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyModel': {
        // Kinematic-zero counterpart of `solvedAssembly`: same SceneBackend
        // shape change, but no FK runs — `model()` is the unposed view of
        // the assembly, so each part's worldTransform is the identity. The
        // legacy boolean-union path is gone; consumers that needed a fused
        // single-Shape now call Scene.toUnion()/Scene.toCompound() explicitly.
        const partEntries = Object.entries(inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly model has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.model().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const meta = r.metadata as {
          assemblyName?: string;
          partIds?: FeatureId[];
          declaredMateCount?: number;
        } | undefined;
        const partIds = meta?.partIds ?? [];
        // Exp-D four-bolt-flange-v2 surfaced this: an agent declared mates
        // on the assembly, then ended the script with arm.model() (not
        // solvedModel({})). model() skips mate FK entirely — parts stack
        // at local-frame origin and downstream interference / scoring
        // gates lie. Emit an info diag at the model() lowering so the
        // mate-FK skip surfaces explicitly, not via downstream symptoms.
        const declaredMateCount = meta?.declaredMateCount ?? 0;
        if (declaredMateCount > 0) {
          const assemblyName = meta?.assemblyName ?? '<unnamed>';
          diagnostics.push({
            target: this.target,
            code: 'assembly.mates-ignored-by-model-call',
            featureId: r.id,
            severity: 'info',
            message: `assembly '${assemblyName}' declared ${declaredMateCount} mate(s) but the script returned arm.model() (which skips mate FK); parts will pose at their local-frame origin, not their mate-derived world positions.`,
            hint: 'Replace `arm.model()` with `arm.solvedModel({})` (or `arm.solvedModel(poses)`) so the mate solver runs and parts pose correctly. arm.model() is the unposed view — useful only when the assembly declares no mates.',
          });
        }
        if (partEntries.length !== partIds.length) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assemblyModel: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
            hint: 'Ensure inputs and partIds stay in sync.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const records = allRecords ?? [];
        const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
          const partId = partIds[i];
          const partRec = records.find((rec) => rec.id === partId);
          const partName =
            (partRec?.metadata as { partName?: string } | undefined)?.partName ?? partId;
          const color = partRec ? lookupSourceColor(partRec, records) : undefined;
          return {
            name: partName,
            shape: partShape as OcctBackend,
            worldTransform: Transform.identity(),
            ...(color !== undefined ? { color } : {}),
          };
        });
        const sceneBackend: SceneBackend = {
          target: this.target,
          assemblyName: meta?.assemblyName ?? 'unnamed',
          parts: sceneParts,
          _kind: 'scene',
        };
        // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
        // r.transforms loop below cannot apply. Mirror the solvedAssembly
        // boundary cast (Task 4); Task 7 widens the dispatch signature.
        return { shape: sceneBackend as unknown as ShapeBackend, diagnostics };
      }
      case 'solvedAssembly': {
        // 1. Read poses from metadata. Param.evaluated is updated by the
        //    recompute pipeline (resolveParams walks metadata) before lower
        //    is called — so we just read it; never resolve ParamRefs here.
        type EncodedPose =
          | { kind: 'scalar'; value: Param }
          | { kind: 'ball'; value: [Param, Param, Param] };
        type EncodedMate = {
          name: string;
          a: string;
          b: string;
          type: MateType;
          pose?: EncodedPose;
        };
        const meta = r.metadata as {
          assemblyName?: string;
          partIds?: FeatureId[];
          jointIds?: FeatureId[];
          poses?: Record<string, EncodedPose>;
          mates?: EncodedMate[];
          couplings?: readonly MateCouplingRecord[];
          connectorsByPartId?: Record<FeatureId, readonly Connector[]>;
        } | undefined;
        const partIds = meta?.partIds ?? [];
        const jointIds = meta?.jointIds ?? [];
        const encodedPoses = meta?.poses ?? {};
        const encodedMates: readonly EncodedMate[] = meta?.mates ?? [];
        const mateCouplings = meta?.couplings ?? [];
        const connectorsByPartId = meta?.connectorsByPartId ?? {};

        const partEntries = Object.entries(inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `solvedAssembly has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.solvedModel(poses).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }

        // 2. Resolve poses to numeric values via Param.evaluated.
        const numericPoses: NumericPoses = {};
        for (const [name, p] of Object.entries(encodedPoses)) {
          if (p.kind === 'ball') {
            numericPoses[name] = [
              p.value[0].evaluated,
              p.value[1].evaluated,
              p.value[2].evaluated,
            ];
          } else {
            numericPoses[name] = p.value.evaluated;
          }
        }

        // 3. Reconstruct AssemblyPartStored / AssemblyJointStored stubs from
        //    FeatureRecords. forwardKinematics only reads .id on parts and
        //    {id, name, kind, parentPartId, childPartId, axis, origin} on
        //    joints — so we build the minimal viable shape.
        const records = allRecords ?? [];
        const parts: AssemblyPartStored[] = [];
        for (const partId of partIds) {
          const partRec = records.find(rec => rec.id === partId);
          if (!partRec || partRec.kind !== 'assemblyPart') {
            diagnostics.push({
              target: this.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: missing or wrong-kind part record '${partId}'.`,
              hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          parts.push({ id: partRec.id } as AssemblyPartStored);
        }
        const joints: AssemblyJointStored[] = [];
        for (const jointId of jointIds) {
          const jointRec = records.find(rec => rec.id === jointId);
          if (!jointRec || jointRec.kind !== 'assemblyJoint') {
            diagnostics.push({
              target: this.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: missing or wrong-kind joint record '${jointId}'.`,
              hint: 'Each jointId in metadata.jointIds must reference an assemblyJoint record.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          const jm = jointRec.metadata as {
            jointName: string;
            jointKind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
            axis?: Vec3;
            origin: Vec3;
          };
          const aRef = jointRec.inputs.a as { id: FeatureId } | undefined;
          const bRef = jointRec.inputs.b as { id: FeatureId } | undefined;
          if (!aRef || !bRef) {
            diagnostics.push({
              target: this.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: joint '${jointId}' is missing parent or child part input.`,
              hint: 'Joint records must have a/b inputs referencing parent and child parts.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          joints.push({
            id: jointRec.id,
            name: jm.jointName,
            kind: jm.jointKind,
            parentPartId: aRef.id,
            childPartId: bRef.id,
            ...(jm.axis !== undefined ? { axis: jm.axis } : {}),
            origin: jm.origin,
          });
        }

        // Recompute-time pose validation. Capture allows ParamRef-bearing
        // partial pose maps; the lowerer must emit structured diagnostics
        // when (a) a non-fixed joint has no pose value or (b) a pose
        // resolved to a non-finite number (NaN / +/-Infinity).
        for (const j of joints) {
          if (j.kind !== 'fixed' && numericPoses[j.name] === undefined) {
            diagnostics.push({
              target: this.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: joint '${j.name}' (${j.kind}) requires a pose value.`,
              hint: `invalid-args.solvedModel.missing-pose — joint ${j.name} requires a pose value.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        }
        for (const [name, val] of Object.entries(numericPoses)) {
          const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
          if (!finite) {
            diagnostics.push({
              target: this.target,
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: pose '${name}' is not finite (${JSON.stringify(val)}).`,
              hint: `kernel-failed.solvedModel.bad-pose — pose value for ${name} is not finite.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
        }

        // 4. Run body-tree forward kinematics. Throws KernelError on graph
        //    issues (multi-parent, cycles); the dispatcher's exception path
        //    surfaces these as structured diagnostics.
        const worldT = forwardKinematics(parts, joints, numericPoses);

        // 4b. v0.6 T17: when the assembly declares mates, run `mateFk` over
        //     the captured mate metadata. The mate-derived transforms WIN
        //     over the v0.5 joint-derived transforms per part — parts that
        //     participate in a mate graph are placed in LOCAL frames at
        //     authoring time, and the mate solver is the source of truth for
        //     their world position. Without this step the lowerer would emit
        //     identity transforms for purely-mated parts and the rendered
        //     output (compound, STL, STEP) would sit at the local origin
        //     even though the capture-time Scene's `worldTransform` (T16) is
        //     correct.
        if (encodedMates.length > 0 && partEntries.length === partIds.length) {
          // Resolve mate poses the same way joint poses are: Param.evaluated
          // already reflects the live ParamTable value (resolveParams walked
          // metadata before lower was called).
          const matePoses: NumericPoses = {};
          for (const m of encodedMates) {
            const override = numericPoses[m.name];
            if (override !== undefined) {
              matePoses[m.name] = override;
            } else if (m.pose === undefined) {
              continue;
            } else if (m.pose.kind === 'ball') {
              matePoses[m.name] = [
                m.pose.value[0].evaluated,
                m.pose.value[1].evaluated,
                m.pose.value[2].evaluated,
              ];
            } else {
              matePoses[m.name] = m.pose.value.evaluated;
            }
          }
          // Mate-pose finiteness check (mirror of the joint-pose check above).
          // Capture allows ParamRef poses; if the live ParamTable resolves one
          // to NaN / +/-Infinity, surface a structured diagnostic instead of
          // letting `mateFk` produce a degenerate transform.
          let matePoseFiniteFailed = false;
          for (const [name, val] of Object.entries(matePoses)) {
            const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
            if (!finite) {
              diagnostics.push({
                target: this.target,
                code: 'feature.kernel-failed',
                featureId: r.id,
                severity: 'error',
                message: `solvedAssembly: mate pose '${name}' is not finite (${JSON.stringify(val)}).`,
                hint: `kernel-failed.solvedModel.bad-pose — mate pose value for ${name} is not finite.`,
              });
              matePoseFiniteFailed = true;
            }
          }
          if (matePoseFiniteFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // Resolve topology connector origins via each part's already-
          // lowered backend, then build the pure-data `ResolvedMatePart[]`
          // input for `mateFk`. Vec3 origins pass through unchanged.
          const resolvedParts: ResolvedMatePart[] = [];
          let topologyResolutionFailed = false;
          for (let i = 0; i < partIds.length; i++) {
            const partId = partIds[i];
            const partRec = records.find((rec) => rec.id === partId)!;
            const partName =
              (partRec.metadata as { partName?: string } | undefined)?.partName ?? partId;
            const rawConnectors = connectorsByPartId[partId] ?? [];
            if (rawConnectors.length === 0) {
              resolvedParts.push({ id: partId, name: partName, connectors: [] });
              continue;
            }
            const partBackend = partEntries[i][1] as OcctBackend;
            const resolvedConnectors: Connector[] = [];
            for (const c of rawConnectors) {
              if (c.origin.kind === 'vec3') {
                resolvedConnectors.push(c);
                continue;
              }
              try {
                const value = resolveTopologyOriginOnBackend(partBackend, c.origin.query, {
                  records,
                  consumerId: partId,
                });
                resolvedConnectors.push({
                  ...c,
                  origin: { kind: 'vec3', value },
                });
              } catch (err) {
                const msg = (err as Error).message;
                diagnostics.push({
                  target: this.target,
                  code: 'feature.invalid-args',
                  featureId: r.id,
                  severity: 'error',
                  message: `solvedAssembly: failed to resolve connector '${c.name}' on part '${partName}' (${msg}).`,
                  hint: 'invalid-args.assembly.mate-connector-origin-unresolved — declare the connector with a numeric origin or a topology query that resolves on the lowered shape.',
                });
                topologyResolutionFailed = true;
              }
            }
            if (topologyResolutionFailed) break;
            resolvedParts.push({ id: partId, name: partName, connectors: resolvedConnectors });
          }
          if (topologyResolutionFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics };
          }
          // mateFk is pure — KernelErrors propagate out and surface via the
          // dispatcher's exception path as structured diagnostics, same as
          // forwardKinematics' graph errors.
          const mates: MateRecord[] = encodedMates.map((m) => ({
            name: m.name,
            a: m.a,
            b: m.b,
            type: m.type,
          }));
          const expandedMatePoses = expandCoupledPoses(mates, mateCouplings, matePoses);
          const mateWorldT = mateFk(resolvedParts, mates, expandedMatePoses);
          // Merge: mate-derived transforms WIN over joint-derived transforms.
          // Disconnected-from-mates parts retain their joint-FK transform (or
          // identity if no joint either). This is the explicit precedence
          // documented in `Assembly.solvedModel`'s JSDoc.
          //
          // `mateFk` always populates a transform for every part it was given
          // (disconnected parts default to identity). To keep that identity
          // from clobbering a v0.5 joint-tree transform when the SAME part is
          // both on a joint tree AND in the mate-parts list but NOT actually
          // referenced by any mate, we only overwrite when the part has at
          // least one mate-connector entry (i.e. it's a real participant in
          // the mate graph). Mate participants are exactly the parts whose
          // FeatureId appears in `connectorsByPartId`.
          for (const [partId, mT] of mateWorldT) {
            if (partId in connectorsByPartId) {
              // Exp-B four-bolt-flange surfaced this: when a part has an
              // authored `at:` AND is positioned by mate FK, the `at:` is
              // silently dropped — the agent only learns about it 2 reasoning
              // steps later via a Gate 2 axis-mismatch. Emit an info-level
              // diagnostic so the conflict surfaces at the override point.
              const partRec = records.find((rec) => rec.id === partId);
              // `resolvePartPlacement` defaults `at` to [0,0,0] even when the
              // user passed nothing — so we can't just check for presence.
              // Only fire the diagnostic when `at` is a non-trivial vec3
              // (any coord magnitude > 1e-6 mm) AND was authored by the user
              // (the placedBy/connect path leaves `at` synthesized from the
              // connector pair — that's not a conflict, it's how connect
              // was designed; skip those).
              const partMeta = partRec?.metadata as
                | { at?: { x?: { evaluated?: number }; y?: { evaluated?: number }; z?: { evaluated?: number } };
                    placedBy?: unknown;
                    partName?: string }
                | undefined;
              const partAt = partMeta?.at;
              const ax = partAt?.x?.evaluated ?? 0;
              const ay = partAt?.y?.evaluated ?? 0;
              const az = partAt?.z?.evaluated ?? 0;
              const atIsNonTrivial = Math.abs(ax) + Math.abs(ay) + Math.abs(az) > 1e-6;
              const placedByConnect = partMeta?.placedBy !== undefined;
              if (partRec && atIsNonTrivial && !placedByConnect) {
                const partName = partMeta?.partName ?? partId;
                diagnostics.push({
                  target: this.target,
                  code: 'assembly.placement-ignored-by-mate-fk',
                  featureId: partRec.id,
                  severity: 'info',
                  message: `assembly.part '${partName}' has both an authored \`at:\` placement (${ax.toFixed(2)}, ${ay.toFixed(2)}, ${az.toFixed(2)}) AND a mate-FK-derived pose; the \`at:\` is being ignored.`,
                  hint: "Remove the `at:` and let the mate decide the pose, or place the part's local frame so its mate connector sits at the origin (mate FK composes parent_world ∘ trans(parent_conn) ∘ joint ∘ trans(-child_conn)).",
                });
              }
              worldT.set(partId, mT);
            }
          }
        }

        // 5. Build a SceneBackend (no boolean union — each part stays in its
        //    LOCAL frame and the FK-derived worldTransform travels with it).
        //    This preserves per-part identity (color, name, topology) for
        //    downstream meshing / STEP-compound export. The legacy union
        //    path is gone; consumers that needed a fused single-Shape now
        //    call Scene.toUnion() / Scene.toCompound() explicitly.
        if (partEntries.length !== partIds.length) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `solvedAssembly: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
            hint: 'Ensure inputs and partIds stay in sync.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
          const partId = partIds[i];
          const T = worldT.get(partId);
          if (!T) {
            throw new KernelError(
              'feature.invalid-args',
              `solvedAssembly: forwardKinematics produced no transform for part '${partId}'.`,
              r.id,
              'invalid-args.solve.internal — please file a bug.',
            );
          }
          const partRec = records.find((rec) => rec.id === partId)!;
          const partMeta = partRec.metadata as { partName?: string } | undefined;
          const partName = partMeta?.partName ?? partId;
          const color = lookupSourceColor(partRec, records);
          return {
            name: partName,
            shape: partShape as OcctBackend,
            worldTransform: T,
            ...(color !== undefined ? { color } : {}),
          };
        });
        const assemblyName =
          (r.metadata as { assemblyName?: string } | undefined)?.assemblyName ?? 'unnamed';
        const sceneBackend: SceneBackend = {
          target: this.target,
          assemblyName,
          parts: sceneParts,
          _kind: 'scene',
        };
        // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
        // `r.transforms` loop below cannot be applied to it. Task 7 widens
        // the dispatch signature to LoweringResult; today we cast cleanly at
        // the boundary so existing ShapeBackend-typed call sites (recompute
        // engine's shapes map, meshing) keep compiling. Consumers that need
        // the SceneBackend at runtime use isSceneBackend(...) to discriminate.
        return { shape: sceneBackend as unknown as ShapeBackend, diagnostics };
      }
      case 'assemblyExport': {
        // Backs `Scene.toCompound()` and `Scene.toUnion()`. Reads the upstream
        // SceneBackend (produced by `solvedAssembly` / `assemblyModel`),
        // applies each part's worldTransform to its local-frame shape, then
        // either:
        //   - 'compound': groups the transformed parts into a TopoDS_Compound
        //     via replicad.makeCompound (lossless on per-part identity).
        //   - 'union'   : boolean-fuses them into a single solid (lossy on
        //     color, name, metadata — documented antipattern).
        const sceneInput = inputs.byKey.scene as unknown;
        if (!isSceneBackend(sceneInput)) {
          diagnostics.push({
            target: this.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: input 'scene' is not a SceneBackend (upstream solvedAssembly / assemblyModel must lower to a SceneBackend).`,
            hint: 'Construct via Scene.toCompound() / Scene.toUnion() on a Scene returned by Assembly.model() / Assembly.solvedModel().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const meta = r.metadata as { op?: 'compound' | 'union' } | undefined;
        const op = meta?.op;
        if (op !== 'compound' && op !== 'union') {
          diagnostics.push({
            target: this.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: metadata.op must be 'compound' or 'union'; got ${JSON.stringify(op)}.`,
            hint: 'Use Scene.toCompound() or Scene.toUnion() rather than constructing the feature directly.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const sceneBackend = sceneInput as SceneBackend;
        if (sceneBackend.parts.length === 0) {
          diagnostics.push({
            target: this.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: scene has no parts.`,
            hint: 'Call assembly.part(...) at least once before exporting the scene.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        // Apply each part's worldTransform to its local-frame shape. Parts are
        // visited in scene-declaration order so both compound and union are
        // deterministic.
        //
        // We clone before applyTransform because replicad's translate()/rotate()
        // mutate-and-destroy the source OCCT handle. The recompute engine caches
        // the SceneBackend across `params.update` runs, so without a fresh clone
        // the second recompute hits "This object has been deleted." on any part
        // with a non-identity worldTransform. Identity transforms early-return
        // `this` from applyTransform, which is why the yaw=0 path historically
        // worked but ball-joint poses broke.
        const transformed: OcctBackend[] = sceneBackend.parts.map((p: SceneBackendPart) =>
          (p.shape as OcctBackend).clone().applyTransform(p.worldTransform),
        );
        if (op === 'compound') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const replicadShapes = transformed.map((b) => (b as OcctBackend).getReplicadShape() as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const compound = replicad.makeCompound(replicadShapes) as any;
          shape = new OcctBackend(compound);
          break;
        }
        // op === 'union': fold-fuse from the first part. Mirrors the
        // pre-Task-4 union loop, just consumed from a SceneBackend instead.
        let fused: OcctBackend = transformed[0];
        for (let i = 1; i < transformed.length; i++) {
          fused = fused.union(transformed[i]) as OcctBackend;
        }
        shape = fused;
        break;
      }
      case 'surfaceThicken': {
        // W1.3 NURBS: consume the upstream Surface (resolved via session hook
        // or pre-populated by the recompute engine into `inputs.surfaces`) and
        // offset both sides via BRepOffsetAPI_MakeThickSolid.MakeThickSolidBySimple.
        const face = this.resolveSurfaceFaceForRecord(r, inputs, diagnostics);
        if (!face) {
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        const t = r.params.t.evaluated;
        try {
          shape = thickenFace(face, t);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: this.target,
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `surfaceThicken: OCCT failed: ${msg}`,
            hint: 'kernel-failed — try a smaller thickness, simplify the control net, or ensure the surface has no self-intersections.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'surfaceToShape': {
        // W1.3 NURBS: wrap the Replicad Face as a single-face TopoDS_Shell.
        const face = this.resolveSurfaceFaceForRecord(r, inputs, diagnostics);
        if (!face) {
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        try {
          shape = faceToShape(face);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          diagnostics.push({
            target: this.target,
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `surfaceToShape: OCCT failed: ${msg}`,
            hint: 'kernel-failed — surface produced an invalid Face; check control-net + degree.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics };
        }
        break;
      }
      case 'referenceImage': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer, so this arm is
        // defense-in-depth for callers that invoke the lowerer directly.
        return { shape: undefined as unknown as ShapeBackend, diagnostics };
      }
      default:
        return {
          shape: undefined as unknown as ShapeBackend,
          diagnostics: [
            {
              target: this.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `Feature kind '${r.kind}' is not supported.`,
              hint: 'Use a documented feature kind.',
            },
          ],
        };
    }

    // Apply post-hoc transforms in declared order.
    for (const t of r.transforms) {
      const inputBackend = shape as OcctBackend;
      const inputHashes = inputBackend.faceHashes();
      const inputMap = inputBackend.historyMap;
      switch (t.op) {
        case 'translate':
          shape = shape.translate(t.vec.x.evaluated, t.vec.y.evaluated, t.vec.z.evaluated);
          break;
        case 'rotateAxis': {
          const ax: Vec3 = [t.axis.x.evaluated, t.axis.y.evaluated, t.axis.z.evaluated];
          const pv: Vec3 | undefined = t.pivot
            ? [t.pivot.x.evaluated, t.pivot.y.evaluated, t.pivot.z.evaluated]
            : undefined;
          shape = shape.rotate(ax, t.degrees.evaluated, pv);
          break;
        }
        case 'scale':
          shape = shape.scale([t.sx, t.sy, t.sz]);
          break;
        case 'reflect':
          if (!isValidPlaneSpec(t.plane)) {
            diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `reflect transform has invalid plane spec: ${JSON.stringify(t.plane)}.`,
              hint: "Reflect plane must be 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number }.",
            });
            break; // skip applying the transform; preserve the prior shape
          }
          shape = (shape as OcctBackend).reflect(t.plane);
          break;
      }
      // Propagate historyMap if input had one. All four transform ops (translate,
      // rotateAxis, scale, reflect) preserve topology (face count invariant).
      if (inputMap !== undefined) {
        const outputBackend = shape as OcctBackend;
        const outputHashes = outputBackend.faceHashes();
        if (outputHashes.length === inputHashes.length) {
          const newMap = propagateTransformHistory(inputMap, inputHashes, outputHashes);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = (outputBackend.getReplicadShape() as any);
          shape = new OcctBackend(wrapped, undefined, newMap);
        }
        // else: defensive path — face count mismatch (unexpected for these ops).
        // Leave shape without historyMap; resolver returns face-ref-not-resolvable.
      }
    }

    return { shape, diagnostics };
  }
}
