// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../../../kernel/backends/backend';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FaceRef, FeatureId, FeatureKind, Param, PatternSpec, PlaneSpec, Vec3, Vec3Param } from '../../../shared/intent/types';
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
import { thickenFace, faceToShape } from '../../../kernel/backends/occt/nurbsSurfaceLowerer';
import { lowerCurve3D } from './curve3dLowerer';
import { lowerLoftWithRails, railHitsSections } from './loftWithRailsLowerer';
import { isCurve3DMetadata } from '../../../shared/intent/curve3dRecord';
import { lowerVariableSweep, type VariableSweepSectionLowered } from './variableSweepLowerer';
import { isVariableSweepMetadata } from '../../../shared/intent/variableSweepRecord';
import { lowerSurfaceSew } from '../../../kernel/backends/occt/surfaceSewLowerer';
import { lowerEmbossText } from './embossTextLowerer';
import { subtractiveNoOpDiagnostic } from './subtractiveNoOp';
import { intersectionEmptyDiagnostic, emptyResultDiagnostic } from './additiveNoOp';
import { lowerProjectCurve } from './projectCurveLowerer';
import { pickEdges, pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { computeDihedralPublic } from '../../../kernel/backends/occt/edgeQueries';
import { lowerSheetMetalBend, resolveBendAxis } from './sheetMetalLowerer';
import { findRootSheetMetalRecord } from '../../sheetMetal';
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../../kernel/backends/sceneBackend';
import { lookupSourceColor, lookupSourceMaterial } from '../../../kernel/backends/occt/lookupSourceColor';
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
import { draftWithHistory } from '../../../kernel/backends/occt/draftWithHistory';
import { propagateTransformHistory } from '../../../kernel/naming/evolutionRecord';
import type { HistoryMap } from '../../../kernel/naming/evolutionRecord';
import { retagInstance } from '../../../kernel/backends/occt/patternHistory';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { HelicalSweepArgsError, helixAxisBasis } from '../../../kernel/backends/occt/helicalSweep';
import { helix, helixOptionsFromSpec, type HelixRailSpec } from '../../helix';
import type { LowerContext } from './lowerers/context';
import {
  drainResolvedWarnings,
  filterEdgesByMinLength,
  normalizeAxis,
  readVec3Param,
} from './lowerers/helpers';
import { buildSurfaceById, resolveSurfaceFaceForRecord } from './lowerers/surfaceResolve';
import { lowerImported, lowerSdfMaterialize } from './lowerers/imported';
import { lowerBox, lowerCylinder, lowerSphere } from './lowerers/primitives';
import { lowerRevolve } from './lowerers/revolve';
import { lowerExtrude, lowerSketch } from './lowerers/sketchExtrude';
import { applyTransforms, finishLowering } from './lowerers/transforms';

// `normalizeAxis` moved to lowerers/helpers.ts; re-exported here so the
// public import path stays `backends/occt/occtLowerer`.
export { normalizeAxis };

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
    groups?: Array<{ radius?: number | { evaluated: number }; distance?: number | { evaluated: number } }>;
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
    'importedBrep',  // lib.fromBREP(path) — OCCT native, exact B-rep
    'importedStl',   // lib.fromSTL(path)  — sewn triangle mesh (faceted)
    'assemblyPart',
    'assemblyJoint',
    'assemblyConnect',
    'assemblyModel',
    'solvedAssembly',
    'assemblyExport',
    'surfaceThicken',   // W1.3
    'surfaceToShape',   // W1.3
    'surfaceSew',       // NURBS Slice E (5): stitch N surface faces into a closed solid
    'sheetMetal',       // W2.2
    'sheetMetalBend',   // W2.2
    'sdfMaterialize',   // W2.3
    'referenceImage',   // virtual — no BREP; defense-in-depth guard
    'renderEnvironment',// W2: HDRI / IBL virtual record; defense-in-depth guard
    'cameraTarget',     // Script-callable camera look-at override; virtual record; defense-in-depth guard
    'dfmSpec',          // W3: print-prep gate declaration; virtual record; defense-in-depth guard
    'feaStudy',         // structural study declaration; virtual record; defense-in-depth guard
    'drawingDatum',     // GD&T datum declaration for svg-drawing; virtual record; defense-in-depth guard
    'drawingTolerance', // GD&T tolerance declaration for svg-drawing; virtual record; defense-in-depth guard
    'curve3d',          // NURBS Slice B: 3D NURBS curve → TopoDS_Edge on session.importedGeometry
    'variableSweep',    // NURBS Slice B Task 8: BRepOffsetAPI_MakePipeShell along a 3D spine
    'embossText',       // W3: emboss/engrave text onto a face (raise or recess via signed depth)
    'projectCurve',     // W3: project a closed 2D curve onto a face (open-wire mode deferred)
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

  /** v0.6: absolute directory of the calling `.kcad.ts` script. Used by the
   *  text lowerer to resolve relative `fontPath(...)` arguments. */
  scriptDir?: string;

  /** Bundle everything the per-kind lowering steps read (instance state +
   *  this call's inputs) into one context object. The `diagnostics` array is
   *  the accumulator `lower()` returns. */
  private contextFor(inputs: ResolvedInputs): LowerContext {
    return {
      target: this.target,
      inputs,
      // Record table for label-resolution path; threaded through pickEdges/pickFace.
      allRecords: inputs.records,
      diagnostics: [],
      importedGeometry: this.importedGeometry,
      surfaceCache: this.surfaceCache,
      getSurfaceRecord: this.getSurfaceRecord,
      scriptDir: this.scriptDir,
    };
  }

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const ctx = this.contextFor(inputs);
    let shape: ShapeBackend;

    switch (r.kind) {
      case 'box': return finishLowering(ctx, r, lowerBox(ctx, r));
      case 'cylinder': return finishLowering(ctx, r, lowerCylinder(ctx, r));
      case 'sphere': return finishLowering(ctx, r, lowerSphere(ctx, r));
      case 'importedStep':
      case 'importedBrep':
      case 'importedStl': return finishLowering(ctx, r, lowerImported(ctx, r));
      case 'sdfMaterialize': return finishLowering(ctx, r, lowerSdfMaterialize(ctx, r));
      case 'sketch': return finishLowering(ctx, r, await lowerSketch(ctx, r));
      case 'extrude': return finishLowering(ctx, r, lowerExtrude(ctx, r));
      case 'sheetMetal': {
        // Reuse the sketch→extrude pipeline. Sheet metal differs only in:
        //   (a) the record kind is 'sheetMetal' (threaded for face-label
        //       canonicalization and bend lineage walks);
        //   (b) thickness = depth;
        //   (c) kFactor + sketchPlane carried on metadata for .bend() and
        //       flattenPattern().
        const depth = r.params.thickness.evaluated;
        const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
        if (!sketchInput) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sheetMetal requires an input sketch.`,
            hint: 'Pass a closed path()...close() sketch as the first argument: sheetMetal(sketch, opts).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        try {
          shape = OcctBackend.extrudeFromSketch(sketchInput, depth);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT extrude failed during sheetMetal lowering: ${msg}`,
            hint: 'sheetMetal lowers via the extrude pipeline. Check for self-intersecting profile or near-zero thickness.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'sheetMetalBend': {
        const base = ctx.inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `sheetMetalBend requires an input named 'base'.`,
            hint: 'Chain .bend() on a sheetMetal(...) Shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        // Walk lineage backward to find the root sheetMetal record so we can
        // read its kFactor and thickness. If none, emit feature.invalid-args.
        const rootRec = findRootSheetMetalRecord(r, ctx.allRecords ?? []);
        if (!rootRec) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `.bend() only works on Shapes whose lineage roots at sheetMetal(...).`,
            hint: 'Build the body via sheetMetal(sketch, opts), then chain .bend().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
          ctx.diagnostics.push(axisResult.diagnostic);
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        ctx.diagnostics.push(...result.diagnostics);
        if (!result.shape) {
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        // Persist the bend record on r.metadata for flattenPattern.
        if (result.bendRecord) {
          const md = (r.metadata ??= {}) as Record<string, unknown>;
          md.bendRecord = result.bendRecord;
        }
        shape = result.shape;
        break;
      }
      case 'revolve': return finishLowering(ctx, r, lowerRevolve(ctx, r));
      case 'sweep': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'sketch') {
          const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
          if (!sketchInput) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep with profile='sketch' requires an input named 'sketch'.`,
              hint: 'Chain sweep from a path()...close() sketch.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          // A rail from helix() carries its (pre-resolved) dimensions: regenerate
          // it from the live values so a ParamRef radius/pitch/turns follows a
          // param change, whatever the spine mode.
          const helixSpec = (r.metadata as { helix?: HelixRailSpec } | undefined)?.helix;
          const rail = helixSpec !== undefined
            ? helix(helixOptionsFromSpec(helixSpec))
            : (r.metadata as { rail?: unknown } | undefined)?.rail;
          if (!Array.isArray(rail) || rail.length < 2) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail must be an array of at least 2 points; got ${Array.isArray(rail) ? `length ${rail.length}` : 'non-array'}.`,
              hint: 'Pass a rail array of [x, y, z] tuples (≥2 points). Use helix(...) for helical rails.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          if (rail.length > 5000) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep rail has ${rail.length} points (cap is 5000). For helices, reduce \`pointsPerTurn\` or \`turns\`. For polylines, simplify the path.`,
              hint: 'Reduce rail point count to ≤ 5000. For helices, lower pointsPerTurn or turns.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          // Validate every entry is [number, number, number] of finite numbers.
          for (let i = 0; i < rail.length; i++) {
            const p = rail[i];
            if (!Array.isArray(p) || p.length !== 3 ||
                !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
              ctx.diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `sweep rail point at index ${i} must be a [x, y, z] tuple of finite numbers; got ${JSON.stringify(p)}.`,
                hint: 'Each rail point must be a [x, y, z] tuple of finite numbers.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
          }
          const frenet = (r.params.frenet?.evaluated ?? 0) > 0.5;
          const rawTransition = (r.metadata as { transitionMode?: unknown } | undefined)?.transitionMode;
          const ALLOWED_MODES = ['right', 'transformed', 'round'] as const;
          if (rawTransition !== undefined && !ALLOWED_MODES.includes(rawTransition as typeof ALLOWED_MODES[number])) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep.transitionMode must be one of 'right' | 'transformed' | 'round'; got ${JSON.stringify(rawTransition)}.`,
              hint: "Pass transitionMode: 'right' (default, sharp), 'transformed' (extend tangents), or 'round' (tangent-arc corner).",
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          const transitionMode = (rawTransition ?? 'right') as 'right' | 'transformed' | 'round';
          const rawSpine = (r.metadata as { spine?: unknown } | undefined)?.spine;
          const ALLOWED_SPINES = ['polyline', 'smooth', 'helix'] as const;
          if (rawSpine !== undefined && !ALLOWED_SPINES.includes(rawSpine as typeof ALLOWED_SPINES[number])) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `sweep.spine must be one of 'polyline' | 'smooth' | 'helix'; got ${JSON.stringify(rawSpine)}.`,
              hint: "Pass spine: 'polyline' (default — straight rail edges, real corners), 'smooth' (single B-spline spine through the rail points; use for curved rails), or 'helix' (exact helix for a helix() rail; threads).",
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          const spine = (rawSpine ?? 'polyline') as 'polyline' | 'smooth' | 'helix';
          if (spine === 'helix' && helixSpec === undefined) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: "sweep spine 'helix' requires a rail produced by helix(); this record carries no helix dimensions.",
              hint: "Pass helix({ radius, pitch, turns }) straight to sweep(rail, { spine: 'helix' }), or use spine: 'smooth' for other curved rails.",
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          try {
            if (spine === 'helix') {
              const o = helixOptionsFromSpec(helixSpec!);
              shape = OcctBackend.sweepSketchAlongHelix(sketchInput, {
                origin: [0, 0, 0],
                ...helixAxisBasis(o.axis ?? 'Z'),
                radius: o.radius,
                pitch: o.pitch,
                turns: o.turns,
                startAngle: o.startAngle ?? 0,
              });
            } else {
              shape = OcctBackend.sweepFromSketch(
                sketchInput,
                rail as [number, number, number][],
                { frenet, transitionMode, spine },
              );
            }
          } catch (e) {
            if (e instanceof HelicalSweepArgsError) {
              ctx.diagnostics.push({
                target: 'export-occt',
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: e.message,
                hint: e.hint,
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
            const msg = e instanceof Error ? e.message : String(e);
            // All sweep failure modes (multi-face profile, profile too large,
            // spine self-intersection, generic) collapse into kernel-failed.
            // The message preserves the underlying cause string from OCCT/
            // Replicad; the hint is generic to the sweep recovery class.
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `OCCT sweep failed: ${msg}`,
              hint: 'OCCT could not sweep — common causes: profile larger than rail curvature, sharp corners causing self-intersection, multi-face profile, or non-planar profile.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: ctx.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `sweep profile kind '${profileKind}' not supported. Use 'sketch'.`,
                hint: "Use profileKind 'sketch' for sweep.",
              },
            ],
          };
        }
        // sweep drags a closed profile along a rail into a solid — an empty /
        // zero-volume result is degenerate, never legitimate.
        {
          const e = emptyResultDiagnostic({
            featureId: r.id, opLabel: 'sweep',
            volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
          });
          if (e) ctx.diagnostics.push(e);
        }
        break;
      }
      case 'loft': {
        const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
        if (profileKind === 'sketch') {
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
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          // Collect sketch_0 through sketch_{N-1} from ctx.inputs.byKey
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
                hint: 'Loft requires every upstream sketch input to lower successfully — check upstream sketch ctx.diagnostics first.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
            sketches.push(s);
          }
          // Resolve planes: explicit metadata.planes wins; else z-stack with spacing.
          // Coordinates are plain numbers, or Params when the author passed a
          // ParamRef (already pre-resolved by the dispatcher).
          type Coord = number | { evaluated: number };
          const num = (c: Coord): number => (typeof c === 'number' ? c : c.evaluated);
          const point3 = (p: Coord[] | undefined): [number, number, number] | undefined =>
            p === undefined ? undefined : [num(p[0]), num(p[1]), num(p[2])];
          const rawMeta = r.metadata as {
            planes?: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: Coord[] }>;
            startPoint?: Coord[];
            endPoint?: Coord[];
            rails?: string[];
          } | undefined;
          const meta = rawMeta === undefined ? undefined : {
            planes: rawMeta.planes?.map((p) => ({ plane: p.plane, origin: point3(p.origin)! })),
            startPoint: point3(rawMeta.startPoint),
            endPoint: point3(rawMeta.endPoint),
            rails: rawMeta.rails,
          };
          let planes: Array<{ plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }>;
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
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
          const railIds = Array.isArray((meta as { rails?: unknown } | undefined)?.rails)
            ? ((meta as { rails: string[] }).rails)
            : [];
          const railCount = r.params.railCount?.evaluated ?? railIds.length;
          if (railCount > 2 || railIds.length > 2) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.loft.rail-miss',
              featureId: r.id,
              severity: 'error',
              message: `loft rails: OCCT MakePipeShell accepts at most 2 rails (spine + auxiliary); got ${Math.max(railCount, railIds.length)}.`,
              hint: HINT_TEMPLATES['feature.loft.rail-miss'].template,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          if (railIds.length > 0) {
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
                    return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
                    return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
                return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
              }
              railEdges.push(edge);
            }
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
                  return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
                }
                let lifted: { face: () => { outerWire: () => { wrapped: unknown } } };
                if (s._hasNurbs && s._commands) {
                  const { buildNurbsSketchOnPlane } = await import('../../../kernel/backends/occt/pathNurbsLowerer');
                  lifted = buildNurbsSketchOnPlane(s._commands as never, p.plane) as unknown as typeof lifted;
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
                  return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
                }
              }
              shape = lowerLoftWithRails(railEdges[0], sectionWires, railEdges[1]);
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
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
          } else {
            try {
              shape = OcctBackend.loftFromSketches(sketches, planes, {
                ruled,
                startPoint: meta?.startPoint,
                endPoint: meta?.endPoint,
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
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
          }
        } else {
          return {
            shape: undefined as unknown as ShapeBackend,
            diagnostics: [
              {
                target: ctx.target,
                code: 'feature.invalid-args',
                featureId: r.id,
                severity: 'error',
                message: `loft profile kind '${profileKind}' not supported. Use 'sketch'.`,
                hint: "Use profileKind 'sketch' for loft.",
              },
            ],
          };
        }
        // loft blends ≥2 closed sections into a solid — an empty / zero-volume
        // result is degenerate, never legitimate.
        {
          const e = emptyResultDiagnostic({
            featureId: r.id, opLabel: 'loft',
            volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
          });
          if (e) ctx.diagnostics.push(e);
        }
        break;
      }
      case 'boolean': {
        // Op expression is a quoted string in IR (e.g. "'difference'").
        const op = String(r.params.op.expression).replace(/'/g, '');
        const base = ctx.inputs.byKey['base'];
        if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
        let acc: OcctBackend = base as OcctBackend;
        // For a difference, capture the base volume so we can flag a no-op cut
        // (cutter missed the body) below — the kernel otherwise returns the
        // unchanged solid as a success.
        const volumeBeforeCut = op === 'difference' ? acc.volume() : null;
        const cutters = Object.entries(ctx.inputs.byKey)
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
        if (volumeBeforeCut !== null) {
          const noop = subtractiveNoOpDiagnostic({
            featureId: r.id,
            opLabel: 'boolean difference',
            volumeBefore: volumeBeforeCut,
            volumeAfter: acc.volume(),
          });
          if (noop) ctx.diagnostics.push(noop);
        }
        // Additive analog of the cutter-miss: an intersection of disjoint
        // bodies yields no common solid. Empty/zero-volume here is unambiguous
        // (the operands don't overlap). Union is NOT gated — containment of one
        // operand in another is a legitimate no-volume-change result.
        if (op === 'intersection') {
          const empty = intersectionEmptyDiagnostic({
            featureId: r.id,
            volumeAfter: acc.volume(),
            isEmpty: acc.isEmpty(),
          });
          if (empty) ctx.diagnostics.push(empty);
        }
        break;
      }
      case 'fillet': {
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
            return { shape: base, diagnostics: ctx.diagnostics };
          }
          shape = result.shape;
          break;
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
          return { shape: base, diagnostics: ctx.diagnostics };
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
        const filletFilter = filterEdgesByMinLength(edgesForFillet, 2 * radius, {
          op: 'fillet', paramName: 'radius', featureId: r.id,
        });
        if (filletFilter.diagnostic) ctx.diagnostics.push(filletFilter.diagnostic);
        if (filletFilter.diagnostic?.severity === 'error') {
          shape = base;
          break;
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
              break;
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
            return { shape: base, diagnostics: ctx.diagnostics };
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
            return { shape: base, diagnostics: ctx.diagnostics };
          }
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT fillet failed: ${msg}`,
            hint: 'OCCT could not apply that fillet — try a smaller radius (typically less than half of the smallest face dimension).',
          });
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'chamfer': {
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
            return { shape: base, diagnostics: ctx.diagnostics };
          }
          shape = result.shape;
          break;
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
          return { shape: base, diagnostics: ctx.diagnostics };
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
          break;
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
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'shell': {
        const base = ctx.inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
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
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `shell requires a 'thickness' parameter.`,
            hint: 'Pass a positive finite number as the first argument, e.g. .shell(1, { face: \'top\' }).',
          });
          throw new Error('shell: no thickness');
        }
        const faceResult = pickFace(r, base, ctx.allRecords);
        if ('error' in faceResult) {
          ctx.diagnostics.push(faceResult.error);
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        drainResolvedWarnings(r, ctx.diagnostics);
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
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT shell failed: ${msg}`,
            hint: 'OCCT could not shell that solid — try a thinner wall or a different open face. Thickness must be smaller than the shape\'s minimum thickness.',
          });
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'draft': {
        const base = ctx.inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `draft requires an input named 'base'.`,
            hint: 'Chain draft onto a solid shape.',
          });
          throw new Error('draft: no base shape');
        }
        const angleDeg = r.params.angle?.evaluated;
        if (angleDeg === undefined) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `draft requires an 'angle' parameter.`,
            hint: "Pass the taper angle in degrees, e.g. .draft(5, { face: 'front' }).",
          });
          throw new Error('draft: no angle');
        }
        const faceResult = pickFace(r, base, ctx.allRecords);
        if ('error' in faceResult) {
          ctx.diagnostics.push(faceResult.error);
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        drainResolvedWarnings(r, ctx.diagnostics);
        // Honesty signal: the capture layer DEFAULTS metadata.neutralPlane to
        // the drafted face's own selector string (canonical/label name), and
        // sets '' when the face is a non-named selector (FaceQuery etc.). The
        // neutral plane is ALWAYS derived from the target face geometry here, so
        // a genuine override — a named neutralPlane pointing at a DIFFERENT face
        // than the drafted one — is silently dropped. Surface a warning in that
        // case rather than pretending the named plane was honored. Full
        // named-neutral-plane resolution is deferred to a later slice.
        const neutralPlane = (r.metadata as { neutralPlane?: string } | undefined)?.neutralPlane ?? '';
        const faceRef = (r.inputs.face as { ref?: FaceRef } | undefined)?.ref;
        const targetFaceSelector =
          faceRef?.kind === 'canonical' ? faceRef.face
          : faceRef?.kind === 'label' ? faceRef.name
          : ''; // FaceQuery / tracked / created etc. → capture default was ''
        if (neutralPlane !== '' && neutralPlane !== targetFaceSelector) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.draft.neutral-plane-derived',
            featureId: r.id,
            severity: 'warn',
            message: `Named neutralPlane '${neutralPlane}' differs from the drafted face '${targetFaceSelector || '(query)'}'; the parting plane was derived from the face geometry instead.`,
            hint: 'A named neutralPlane different from the drafted face is not yet honored; the parting plane was derived from the face geometry. Full named-neutral-plane support lands in a later slice.',
          });
        }
        try {
          // The resolved replicad Face gives us both the target face hash and the
          // geometry needed to DERIVE the neutral plane + pull direction when the
          // capture metadata left them unspecified (Slice E cross-task contract:
          // metadata.neutralPlane may be the empty string '' for FaceQuery
          // selectors, and metadata.pullDir is absent when not supplied).
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const face = faceResult as any;
          const faceHash = (face.wrapped ?? face._wrapped ?? face).HashCode(2147483647).toString(16);
          const center = face.center as { x: number; y: number; z: number };
          const nRaw = typeof face.normalAt === 'function'
            ? (face.normalAt() as { x: number; y: number; z: number })
            : { x: 0, y: 0, z: 1 };
          const nLen = Math.hypot(nRaw.x, nRaw.y, nRaw.z) || 1;
          const faceNormal: [number, number, number] = [nRaw.x / nLen, nRaw.y / nLen, nRaw.z / nLen];

          // Pull direction: explicit metadata.pullDir, else derive a demoulding
          // axis. The pull must NOT be parallel to the drafted face normal (a face
          // tapered about a plane parallel to itself is degenerate), so when no
          // pullDir is given we pick the principal axis (±X/±Y/±Z) most
          // perpendicular to the face normal, breaking ties toward +Z — the
          // conventional mould-opening direction for a top-drafted side wall.
          const meta = r.metadata as { pullDir?: [number, number, number] } | undefined;
          let pullDir: [number, number, number];
          if (meta?.pullDir !== undefined) {
            pullDir = meta.pullDir;
          } else {
            // Candidate axes ordered so +Z wins ties (stable, conventional).
            const axes: [number, number, number][] = [
              [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0],
            ];
            let best = axes[0];
            let bestPerp = -1;
            for (const a of axes) {
              const dotAbs = Math.abs(a[0] * faceNormal[0] + a[1] * faceNormal[1] + a[2] * faceNormal[2]);
              const perp = 1 - dotAbs; // larger = more perpendicular to face normal
              if (perp > bestPerp + 1e-9) { bestPerp = perp; best = a; }
            }
            pullDir = best;
          }

          // Neutral plane: derived from the target face geometry. A face tapered
          // about its own plane would be a no-op, so we anchor the parting plane
          // at the base of the shape along the pull axis and orient it by the pull
          // direction. This is the robust default that also satisfies the
          // neutralPlane === '' contract (no resolvable neutral-plane face).
          const bb = base.boundingBox();
          const pLen = Math.hypot(pullDir[0], pullDir[1], pullDir[2]) || 1;
          const pUnit: [number, number, number] = [pullDir[0] / pLen, pullDir[1] / pLen, pullDir[2] / pLen];
          // Anchor at the face centroid projected onto the parting level: place the
          // plane at the shape extent OPPOSITE the pull direction so the whole face
          // tapers (the parting line sits at the base, away from the pull).
          const lows = [bb.min[0], bb.min[1], bb.min[2]];
          const highs = [bb.max[0], bb.max[1], bb.max[2]];
          const anchor: [number, number, number] = [
            pUnit[0] >= 0 ? lows[0] : highs[0],
            pUnit[1] >= 0 ? lows[1] : highs[1],
            pUnit[2] >= 0 ? lows[2] : highs[2],
          ];
          // Keep the in-pull-axis component at the parting level but the in-plane
          // components at the face centroid so the plane passes through the body.
          const planePoint: [number, number, number] = [
            Math.abs(pUnit[0]) > 0.5 ? anchor[0] : center.x,
            Math.abs(pUnit[1]) > 0.5 ? anchor[1] : center.y,
            Math.abs(pUnit[2]) > 0.5 ? anchor[2] : center.z,
          ];

          const angleRad = (angleDeg * Math.PI) / 180;
          const res = draftWithHistory(
            base,
            [{ hash: faceHash }],
            angleRad,
            pullDir,
            { point: planePoint, normal: pUnit },
          );
          const newMap = mergeEdgeFeatureHistory(base.historyMap, res);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wrapped = replicad.cast(res.shape as any) as replicad.Shape3D;
          shape = new OcctBackend(wrapped, undefined, newMap);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'OCCT draft failed';
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.draft.failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT draft failed: ${msg}`,
            hint: 'Drafts need a planar neutral plane and a consistent pull direction; check that the face is planar and the angle is < 90°.',
          });
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'hole': {
        const target = ctx.inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          ctx.diagnostics.push({
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
        const res = lowerHole(r, target, ctx.allRecords);
        ctx.diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics: ctx.diagnostics };
        }
        shape = res.backend;
        {
          const noop = subtractiveNoOpDiagnostic({
            featureId: r.id, opLabel: 'hole',
            volumeBefore: target.volume(), volumeAfter: res.backend.volume(),
          });
          if (noop) ctx.diagnostics.push(noop);
        }
        break;
      }
      case 'holes': {
        const target = ctx.inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          ctx.diagnostics.push({
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
        const res = lowerHoles(r, target, ctx.allRecords);
        ctx.diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics: ctx.diagnostics };
        }
        shape = res.backend;
        {
          const noop = subtractiveNoOpDiagnostic({
            featureId: r.id, opLabel: 'holes',
            volumeBefore: target.volume(), volumeAfter: res.backend.volume(),
          });
          if (noop) ctx.diagnostics.push(noop);
        }
        break;
      }
      case 'cutout': {
        const target = ctx.inputs.byKey.target as OcctBackend | undefined;
        if (!target) {
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `cutout requires an input named 'target'.`,
            hint: 'Chain .cutout() onto a solid shape, passing a closed sketch profile.',
          });
          throw new Error('cutout: no target shape');
        }
        const profile = ctx.inputs.byKey.profile as OcctBackend | undefined;
        const { lowerCutout } = await import('../../../kernel/backends/occt/cutoutLowerer');
        const res = lowerCutout(r, target, profile, ctx.allRecords);
        ctx.diagnostics.push(...res.diagnostics);
        if (res.diagnostics.some(d => d.severity === 'error')) {
          return { shape: target, diagnostics: ctx.diagnostics };
        }
        shape = res.backend;
        {
          const noop = subtractiveNoOpDiagnostic({
            featureId: r.id, opLabel: 'cutout',
            volumeBefore: target.volume(), volumeAfter: res.backend.volume(),
          });
          if (noop) ctx.diagnostics.push(noop);
        }
        break;
      }
      case 'mirror': {
        const base = ctx.inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
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
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `mirror requires a valid plane spec; got ${JSON.stringify(plane)}.`,
            hint: "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset: <number> }.",
          });
          return { shape: base, diagnostics: ctx.diagnostics };
        }
        const mirrorInputHashes = base.faceHashes();
        const mirrorInputMap = base.historyMap;
        try {
          shape = base.mirror(plane);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.diagnostics.push({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `OCCT mirror union failed: ${msg}`,
            hint: 'OCCT rejected the mirror union — translate the source away from the mirror plane, or use { plane, offset }.',
          });
          return { shape: base, diagnostics: ctx.diagnostics };
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
        const base = ctx.inputs.byKey.base as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.pattern.source-not-found',
            featureId: r.id,
            severity: 'error',
            message: `pattern base input is missing or failed.`,
            hint: HINT_TEMPLATES['feature.pattern.source-not-found'].template,
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const pattern = (r.metadata as { pattern?: PatternSpec } | undefined)?.pattern;
        if (!pattern) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: 'pattern feature is missing pattern metadata.',
            hint: 'Create patterns through .patternLinear(...) / .patternCircular(...) / .patternGrid(...).',
          });
          return { shape: base, diagnostics: ctx.diagnostics };
        }

        // Runtime count guard (catches Param-bound counts < 2 that capture-time
        // proxy validation can't see).
        const totalCount = pattern.kind === 'grid'
          ? pattern.x.count * pattern.y.count
          : pattern.count;
        if (totalCount < 2) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.pattern.count-out-of-range',
            featureId: r.id,
            severity: 'error',
            message: `pattern total instance count is ${totalCount}; must be >= 2.`,
            hint: HINT_TEMPLATES['feature.pattern.count-out-of-range'].template,
          });
          return { shape: base, diagnostics: ctx.diagnostics };
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
        const base = ctx.inputs.byKey.shape as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly part shape input is missing or failed.`,
            hint: 'Assembly parts must wrap a successfully lowered source shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        const partA = ctx.inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly joint input 'a' is missing or failed.`,
            hint: 'Assembly joints must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        const partA = ctx.inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly connect input 'a' is missing or failed.`,
            hint: 'Assembly connect records must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyModel': {
        // SceneBackend counterpart of `solvedAssembly`: mate-free model()
        // parts stay at identity, while mate-bearing model() records carry
        // enough metadata for default mate FK. The legacy boolean-union path
        // is gone; consumers that need a fused single-Shape now call
        // Scene.toUnion()/Scene.toCompound() explicitly.
        const partEntries = Object.entries(ctx.inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly model has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.model().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const meta = r.metadata as {
          assemblyName?: string;
          partIds?: FeatureId[];
          mates?: {
            name: string;
            a: string;
            b: string;
            type: MateType;
            pose?: { kind: 'scalar'; value: Param } | { kind: 'ball'; value: [Param, Param, Param] };
          }[];
          couplings?: readonly MateCouplingRecord[];
          connectorsByPartId?: Record<FeatureId, readonly Connector[]>;
        } | undefined;
        const partIds = meta?.partIds ?? [];
        const encodedMates = meta?.mates ?? [];
        const mateCouplings = meta?.couplings ?? [];
        const connectorsByPartId = meta?.connectorsByPartId ?? {};
        if (partEntries.length !== partIds.length) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assemblyModel: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
            hint: 'Ensure inputs and partIds stay in sync.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const records = ctx.allRecords ?? [];
        const worldT = new Map<FeatureId, Transform>();
        for (const partId of partIds) worldT.set(partId, Transform.identity());

        if (encodedMates.length > 0) {
          const matePoses: NumericPoses = {};
          for (const m of encodedMates) {
            if (m.pose === undefined) continue;
            if (m.pose.kind === 'ball') {
              matePoses[m.name] = [
                m.pose.value[0].evaluated,
                m.pose.value[1].evaluated,
                m.pose.value[2].evaluated,
              ];
            } else {
              matePoses[m.name] = m.pose.value.evaluated;
            }
          }

          let matePoseFiniteFailed = false;
          for (const [name, val] of Object.entries(matePoses)) {
            const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
            if (!finite) {
              ctx.diagnostics.push({
                target: ctx.target,
                code: 'feature.kernel-failed',
                featureId: r.id,
                severity: 'error',
                message: `assemblyModel: mate pose '${name}' is not finite (${JSON.stringify(val)}).`,
                hint: `kernel-failed.assemblyModel.bad-pose — mate pose value for ${name} is not finite.`,
              });
              matePoseFiniteFailed = true;
            }
          }
          if (matePoseFiniteFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }

          const resolvedParts: ResolvedMatePart[] = [];
          let topologyResolutionFailed = false;
          for (let i = 0; i < partIds.length; i++) {
            const partId = partIds[i];
            const partRec = records.find((rec) => rec.id === partId);
            if (!partRec || partRec.kind !== 'assemblyPart') {
              ctx.diagnostics.push({
                target: ctx.target,
                code: 'recompute.input.missing',
                featureId: r.id,
                severity: 'error',
                message: `assemblyModel: missing or wrong-kind part record '${partId}'.`,
                hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
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
                ctx.diagnostics.push({
                  target: ctx.target,
                  code: 'feature.invalid-args',
                  featureId: r.id,
                  severity: 'error',
                  message: `assemblyModel: failed to resolve connector '${c.name}' on part '${partName}' (${msg}).`,
                  hint: 'invalid-args.assembly.mate-connector-origin-unresolved — declare the connector with a numeric origin or a topology query that resolves on the lowered shape.',
                });
                topologyResolutionFailed = true;
              }
            }
            if (topologyResolutionFailed) break;
            resolvedParts.push({ id: partId, name: partName, connectors: resolvedConnectors });
          }
          if (topologyResolutionFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }

          const mates: MateRecord[] = encodedMates.map((m) => ({
            name: m.name,
            a: m.a,
            b: m.b,
            type: m.type,
          }));
          const expandedMatePoses = expandCoupledPoses(mates, mateCouplings, matePoses);
          const mateWorldT = mateFk(resolvedParts, mates, expandedMatePoses);
          for (const [partId, mT] of mateWorldT) {
            if (partId in connectorsByPartId) worldT.set(partId, mT);
          }
        }

        const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
          const partId = partIds[i];
          const partRec = records.find((rec) => rec.id === partId);
          const partName =
            (partRec?.metadata as { partName?: string } | undefined)?.partName ?? partId;
          const color = partRec ? lookupSourceColor(partRec, records) : undefined;
          const material = partRec ? lookupSourceMaterial(partRec, records) : undefined;
          return {
            name: partName,
            shape: partShape as OcctBackend,
            worldTransform: worldT.get(partId) ?? Transform.identity(),
            ...(color !== undefined ? { color } : {}),
            ...(material !== undefined ? { material } : {}),
          };
        });
        const sceneBackend: SceneBackend = {
          target: ctx.target,
          assemblyName: meta?.assemblyName ?? 'unnamed',
          parts: sceneParts,
          _kind: 'scene',
        };
        // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
        // r.transforms loop below cannot apply. Mirror the solvedAssembly
        // boundary cast (Task 4); Task 7 widens the dispatch signature.
        return { shape: sceneBackend as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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

        const partEntries = Object.entries(ctx.inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `solvedAssembly has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.solvedModel(poses).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        const records = ctx.allRecords ?? [];
        const parts: AssemblyPartStored[] = [];
        for (const partId of partIds) {
          const partRec = records.find(rec => rec.id === partId);
          if (!partRec || partRec.kind !== 'assemblyPart') {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: missing or wrong-kind part record '${partId}'.`,
              hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          parts.push({ id: partRec.id } as AssemblyPartStored);
        }
        const joints: AssemblyJointStored[] = [];
        for (const jointId of jointIds) {
          const jointRec = records.find(rec => rec.id === jointId);
          if (!jointRec || jointRec.kind !== 'assemblyJoint') {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: missing or wrong-kind joint record '${jointId}'.`,
              hint: 'Each jointId in metadata.jointIds must reference an assemblyJoint record.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: joint '${jointId}' is missing parent or child part input.`,
              hint: 'Joint records must have a/b inputs referencing parent and child parts.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        // partial pose maps; the lowerer must emit structured ctx.diagnostics
        // when (a) a non-fixed joint has no pose value or (b) a pose
        // resolved to a non-finite number (NaN / +/-Infinity).
        for (const j of joints) {
          if (j.kind !== 'fixed' && numericPoses[j.name] === undefined) {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: joint '${j.name}' (${j.kind}) requires a pose value.`,
              hint: `invalid-args.solvedModel.missing-pose — joint ${j.name} requires a pose value.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
        }
        for (const [name, val] of Object.entries(numericPoses)) {
          const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
          if (!finite) {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: pose '${name}' is not finite (${JSON.stringify(val)}).`,
              hint: `kernel-failed.solvedModel.bad-pose — pose value for ${name} is not finite.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
        }

        // 4. Run body-tree forward kinematics. Throws KernelError on graph
        //    issues (multi-parent, cycles); the dispatcher's exception path
        //    surfaces these as structured ctx.diagnostics.
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
              ctx.diagnostics.push({
                target: ctx.target,
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
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
                ctx.diagnostics.push({
                  target: ctx.target,
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
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          // mateFk is pure — KernelErrors propagate out and surface via the
          // dispatcher's exception path as structured ctx.diagnostics, same as
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
                ctx.diagnostics.push({
                  target: ctx.target,
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
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `solvedAssembly: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
            hint: 'Ensure inputs and partIds stay in sync.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
          const material = lookupSourceMaterial(partRec, records);
          return {
            name: partName,
            shape: partShape as OcctBackend,
            worldTransform: T,
            ...(color !== undefined ? { color } : {}),
            ...(material !== undefined ? { material } : {}),
          };
        });
        const assemblyName =
          (r.metadata as { assemblyName?: string } | undefined)?.assemblyName ?? 'unnamed';
        const sceneBackend: SceneBackend = {
          target: ctx.target,
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
        return { shape: sceneBackend as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        const sceneInput = ctx.inputs.byKey.scene as unknown;
        if (!isSceneBackend(sceneInput)) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: input 'scene' is not a SceneBackend (upstream solvedAssembly / assemblyModel must lower to a SceneBackend).`,
            hint: 'Construct via Scene.toCompound() / Scene.toUnion() on a Scene returned by Assembly.model() / Assembly.solvedModel().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const meta = r.metadata as { op?: 'compound' | 'union' } | undefined;
        const op = meta?.op;
        if (op !== 'compound' && op !== 'union') {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: metadata.op must be 'compound' or 'union'; got ${JSON.stringify(op)}.`,
            hint: 'Use Scene.toCompound() or Scene.toUnion() rather than constructing the feature directly.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const sceneBackend = sceneInput as SceneBackend;
        if (sceneBackend.parts.length === 0) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: scene has no parts.`,
            hint: 'Call assembly.part(...) at least once before exporting the scene.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
        const face = resolveSurfaceFaceForRecord(ctx, r);
        if (!face) {
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const t = r.params.t.evaluated;
        try {
          shape = thickenFace(face, t);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.kernel-failed',
            featureId: r.id,
            severity: 'error',
            message: `surfaceThicken: OCCT failed: ${msg}`,
            hint: 'kernel-failed — try a smaller thickness, simplify the control net, or ensure the surface has no self-intersections.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'surfaceToShape': {
        // W1.3 NURBS: wrap the Replicad Face as a single-face TopoDS_Shell.
        const face = resolveSurfaceFaceForRecord(ctx, r);
        if (!face) {
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'surfaceSew': {
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          const built = buildSurfaceById(ctx, ref.surfaceId, r);
          if (!built) {
            // buildSurfaceById already pushed the specific diagnostic.
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          if (built.kind !== 'face') {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `surfaceSew: input ${key} (${ref.surfaceId}) is a multi-face shell; sew accepts single-face surfaces only.`,
              hint: 'invalid-args.surfaceSew.input — sew nurbsSurface / coonsPatch / trimmed faces, not skinned shells.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          faces.push(built.face);
        }

        const tolerance = r.params.tolerance.evaluated;
        const requireClosed = (r.metadata as { requireClosed?: boolean } | undefined)?.requireClosed === true;
        let sewResult: import('../../../kernel/backends/occt/surfaceSewLowerer').SurfaceSewResult;
        try {
          sewResult = lowerSurfaceSew(faces, { tolerance, requireClosed });
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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

        shape = sewResult.backend;
        break;
      }
      case 'referenceImage': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer, so this arm is
        // defense-in-depth for callers that invoke the lowerer directly.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'renderEnvironment': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer; this arm is
        // defense-in-depth for direct callers.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'dfmSpec': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer; this arm is
        // defense-in-depth for direct callers.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'feaStudy': {
        // Virtual record — no BREP output. The study is a DECLARATION; the
        // solver run happens in the FEA runner, which reads this record's
        // metadata and the shape it points at. Same shape as dfmSpec.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'drawingDatum':
      case 'drawingTolerance': {
        // Virtual records — no BREP output. GD&T declarations are read by the
        // svg-drawing exporter, which resolves their queries against the
        // exported geometry.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'cameraTarget': {
        // Virtual record — no BREP output. Same shape as renderEnvironment:
        // recomputeEngine gates on metadata.virtual === true and skips the
        // lowerer; this arm is defense-in-depth for direct callers.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'curve3d': {
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        try {
          const { edge } = lowerCurve3D(m);
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
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'variableSweep': {
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }

        // Resolve spine edge. The spine input is a FeatureRef.
        const spineId = m.spineRef.kind === 'feature' ? m.spineRef.id : undefined;
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
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
            try {
              const { edge } = lowerCurve3D(cm);
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
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }

        // Resolve each section's profile wire from the sketch in
        // `byKey.section_${i}`. The capture layer guarantees one input
        // per section in addVariableSweep().
        const lowered: VariableSweepSectionLowered[] = [];
        for (let i = 0; i < m.sections.length; i++) {
          const profileInput = ctx.inputs.byKey[`section_${i}`] as OcctBackend | undefined;
          if (!profileInput) {
            ctx.diagnostics.push({
              target: 'export-occt',
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `variableSweep: missing input 'section_${i}' — upstream sketch did not lower successfully.`,
              hint: 'Every section profile must be a Sketch that lowers cleanly — check upstream sketch ctx.diagnostics first.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
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
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          lowered.push({
            t: m.sections[i].t,
            profileWire,
            locationPnt: [0, 0, 0], // unused for t=0/t=1 — see lowerVariableSweep
          });
        }

        try {
          shape = lowerVariableSweep(spineEdge, lowered, {
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        break;
      }
      case 'embossText': {
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const res = await lowerEmbossText(r, parentBackend, ctx.allRecords, ctx.scriptDir);
        if (!res.ok) {
          ctx.diagnostics.push(...res.diagnostics);
          return { shape: parentBackend, diagnostics: ctx.diagnostics };
        }
        shape = res.backend;
        break;
      }
      case 'projectCurve': {
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
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const res = await lowerProjectCurve(r, parentBackend, ctx.allRecords);
        if (!res.ok) {
          ctx.diagnostics.push(...res.diagnostics);
          return { shape: parentBackend, diagnostics: ctx.diagnostics };
        }
        shape = res.backend;
        break;
      }
      default:
        return {
          shape: undefined as unknown as ShapeBackend,
          diagnostics: [
            {
              target: ctx.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `Feature kind '${r.kind}' is not supported.`,
              hint: 'Use a documented feature kind.',
            },
          ],
        };
    }

    return { shape: applyTransforms(ctx, shape, r), diagnostics: ctx.diagnostics };
  }
}
