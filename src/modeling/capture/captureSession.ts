import {
  createFeatureIdGenerator, createSurfaceIdGenerator,
  type FeatureIdGenerator, type SurfaceIdGenerator,
} from '../../shared/intent/featureId';
import type { FeatureRecord, ShapeTransform } from '../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind, FeatureRef, Param, PatternSpec, PlaneSpec, Vec3, Vec3Param } from '../../shared/intent/types';
import { isValidPlaneSpec } from '../../shared/intent/types';
import type {
  SurfaceRecord, SurfaceId, NurbsSurfaceData, CoonsPatchData,
} from '../../shared/intent/surfaceRecord';
import type { ReferenceImageMetadata, ReferenceImageScale } from '../../shared/intent/referenceImageRecord';
import type {
  RenderEnvironmentMetadata,
  RenderEnvironmentSpec,
} from '../../shared/intent/renderEnvironmentRecord';
import { isHdriPresetKey } from '../../shared/intent/renderEnvironmentRecord';
import type {
  CameraTargetMetadata,
  CameraTargetSpec,
} from '../../shared/intent/cameraTargetRecord';
import type {
  AnimationViewMetadata,
  AnimationViewSpec,
} from '../../shared/intent/animationViewRecord';
import type { Curve3DMetadata } from '../../shared/intent/curve3dRecord';
import type {
  EmbossTextMetadata, EmbossTextAlign, EmbossTextScaleMode,
} from '../../shared/intent/embossTextRecord';
import type {
  ProjectCurveMetadata, ProjectCurveSource, ProjectCurveScaleMode,
} from '../../shared/intent/projectCurveRecord';
import { Curve3DProxy } from './curveProxy';
import { lazyEvalCurve } from '../backends/occt/curve3dEval';
import type { VariableSweepMetadata, VariableSweepSection } from '../../shared/intent/variableSweepRecord';
import { imageDimensions } from './imageDimensions';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { Shape } from './proxy';
import { Sketch } from './sketch';
import { SurfaceProxy } from './surfaceProxy';
import type {
  AssemblyConnectorFrameStored,
  AssemblyConnectorRef,
  AssemblyPartOpts,
  AssemblyPartRef,
} from './assembly';
import { EDGE_QUERY_KEYS as EDGE_QUERY_KEYS_ARR } from '../../shared/intent/queryKeys';
import { ParamTable, type SerializedParamTable } from '../../shared/runtime/paramTable';
import type { SoftWarning } from '../../shared/runtime/softWarning';
import { collectParamRefs } from '../../shared/runtime/resolveParams';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { KernelError } from '../../shared/intent/kernelError';
import type { Connector } from '../mates/connector';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import type { MateType } from '../mates/mateTypes';

/**
 * Encoded mate / connector data attached to `solvedAssembly` metadata so the
 * OCCT lowerer can run mate-FK at recompute time. Connectors here have their
 * origins pre-resolved to numeric `vec3` (topology queries resolved upstream
 * in `Assembly.solvedModel` before this method runs). Mate poses are encoded
 * as `Param` (just like joint poses) so studio-driven param edits re-pose
 * the rendered scene reactively.
 *
 * - `connectorsByPartId` — keyed by part FeatureId; each entry holds the
 *   pre-resolved Connector list referenced by mates on this assembly.
 *   Parts with no mate connectors may be omitted.
 * - `mates` — every MateRecord declared on the assembly, with `pose`
 *   replaced by a `Param`-shaped encoding when present.
 */
export interface SolvedAssemblyMateMetadata {
  readonly connectorsByPartId: Record<FeatureId, readonly Connector[]>;
  readonly mates: readonly EncodedMateRecord[];
  readonly couplings?: readonly MateCouplingRecord[];
}

/** Mate record with `pose` encoded for the recompute pipeline. Mirrors
 *  `EncodedPose` on joints — scalar Params for revolute/prismatic/etc.,
 *  triple for ball.
 *
 *  Slice 2C — `limitsDeg`/`limitsMm` round-trip from the live `MateRecord`
 *  through the encoded metadata onto the `solvedAssembly` FeatureRecord so
 *  the Studio's JointsTab can draw slider limit marks against the same
 *  numbers the validator gates use. Drops gracefully on legacy records
 *  (the fields are optional). */
export interface EncodedMateRecord {
  readonly name: string;
  readonly a: string;
  readonly b: string;
  readonly type: MateType;
  readonly pose?:
    | { kind: 'scalar'; value: Param }
    | { kind: 'ball'; value: [Param, Param, Param] };
  readonly limitsDeg?: readonly [number, number];
  readonly limitsMm?: readonly [number, number];
}

export { validateFaceLabels } from './faceLabels';

/** Build an `inputs.face` FeatureRef from a FaceSelector. Mirrors the
 *  face-handling branches of `buildEdgeFeatureRef` but specialized to
 *  callers (hole/holes/cutout) that always want a face ref, never an
 *  edges ref. */
export function buildFaceInputRef(
  baseId: import('../../shared/intent/types').FeatureId,
  face: import('./proxy').FaceSelector | string,
): FeatureRef {
  // Q8 — Query DSL value (kc.q.face(...)). Detect duck-type-shape and
  // serialize as a queryDsl FaceRef so the lowerer dispatches through
  // the Q3 evaluator at consume time.
  if (isQueryValue(face)) {
    return {
      kind: 'face',
      featureId: baseId,
      ref: {
        kind: 'queryDsl',
        queryAst: face.ast,
        queryTarget: face.target,
        ...(face.lenient ? { lenient: true } : {}),
      },
    };
  }
  // `{ face: <something> }` wrapper form
  if (typeof face === 'object' && face !== null && 'face' in face) {
    const faceVal = (face as { face: unknown }).face;
    if (typeof faceVal === 'string') {
      if (CANONICAL_FACES.has(faceVal)) {
        return {
          kind: 'face',
          featureId: baseId,
          ref: { kind: 'canonical', face: faceVal as 'top' },
        };
      }
      return {
        kind: 'face',
        featureId: baseId,
        ref: { kind: 'label', name: faceVal },
      };
    }
    // Wrapped Query value: { face: kc.q.face(...) }.
    if (isQueryValue(faceVal)) {
      return {
        kind: 'face',
        featureId: baseId,
        ref: {
          kind: 'queryDsl',
          queryAst: faceVal.ast,
          queryTarget: faceVal.target,
          ...(faceVal.lenient ? { lenient: true } : {}),
        },
      };
    }
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'query', query: faceVal as import('../../kernel/backends/occt/edgeQueries').FaceQuery },
    };
  }
  // Bare FaceQuery object (no { face: ... } wrapper)
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'query', query: face as import('../../kernel/backends/occt/edgeQueries').FaceQuery },
  };
}

/** Q8 duck-type check: detect the Query DSL value (kc.q.face(...) etc).
 *  Reuses the same `_kind: 'kc.query'` runtime tag set by makeQuery, so a
 *  selector argument that already crossed a JSON boundary still matches. */
function isQueryValue(v: unknown): v is import('../../kernel/naming/query').Query<unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { _kind?: unknown })._kind === 'kc.query' &&
    typeof (v as { target?: unknown }).target === 'string' &&
    typeof (v as { ast?: unknown }).ast === 'object' &&
    (v as { ast: { op?: unknown } }).ast !== null &&
    typeof (v as { ast: { op?: unknown } }).ast.op === 'string'
  );
}

export interface FeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

/** Slice 2E: structural shape of the RecomputeEngine handle stored on a
 *  CaptureSession. Declared here (not imported) so this file stays clean of
 *  recompute/orchestration types per the architectural-boundary guard at
 *  `tests/unit/kernel/architectureBoundary.test.ts`. The real RecomputeEngine
 *  class satisfies this shape structurally; callers can cast back to it. */
export interface SessionRecomputeEngineHandle {
  onRelower(cb: (affectedIds: string[]) => void): () => void;
  emitRelower(affectedIds: readonly string[]): void;
}

/** Slice-3: input + result of `session.params.update`. See spec §E.6. */
export interface ParamUpdateEdit {
  name: string;
  value: number | boolean;
}

export interface ParamUpdateResult {
  /** The final shape after re-lower. */
  shape: ShapeBackend;
  /** Records re-lowered (their cached output became stale and was regenerated). */
  relowered: string[];
  /** Records skipped (their cached output reused; nothing they depend on changed). */
  skipped: string[];
  /** Soft warnings produced by this update call (gated-feature lineage refs etc.). */
  warnings: SoftWarning[];
}

export interface SerializedSession {
  schemaVersion?: number;
  params?: SerializedParamTable;
  records: readonly FeatureRecord[];
}

export class CaptureSession {
  private idGen: FeatureIdGenerator = createFeatureIdGenerator();
  private records: FeatureRecord[] = [];
  /** Slice-3: session-owned param table populated by `kcad.param()`/`kcad.params()`. */
  readonly paramTable: ParamTable = new ParamTable();
  /** Slice-3: append-only soft-warning log. Drained via `consumeWarnings()`. */
  readonly warnings: SoftWarning[] = [];
  /** Slice-3 Phase 4: current run's gated named features.
   *  Keyed by feature `metadata.name`; value is the param name that gated it. */
  readonly gatedFeatureNames: Map<string, string | undefined> = new Map();
  /** Slice-3: per-record cached lowered shape from the most recent build,
   *  populated by `proxy.ts` after `engine.run()` and reused by `params.update`
   *  to skip re-lowering records before the first affected one. */
  readonly cachedShapes: Map<string, ShapeBackend> = new Map();
  /** Per-feature triangle-mesh cache populated by `meshFeaturesPerFeature`.
   *  Reused on subsequent mesh requests when the feature's lowered shape is
   *  still in `cachedShapes` (i.e. it was skipped by `params.update`'s
   *  first-affected scan). Keyed by FeatureId; the value is the full
   *  `FeatureMesh` so non-assembly records can be re-emitted without calling
   *  `meshShape` again. Invalidated entry-by-entry on `params.update` for the
   *  records the engine actually re-lowered. Type is `unknown` to avoid
   *  pulling the `FeatureMesh` import into the captureSession boundary; the
   *  meshing layer re-casts at use. */
  readonly cachedFeatureMeshes: Map<string, unknown> = new Map();
  /** Per-assembly-part triangle-mesh cache. Outer key is the assembly's
   *  FeatureId (e.g. `solvedAssembly_1`), inner key is the part name (e.g.
   *  `drive sun gear`). Value carries the cached triangle data (`faces`,
   *  `volume?`, `edges?`); the fresh world transform is taken from the
   *  freshly-re-lowered SceneBackend each pass. Invalidated whole-assembly
   *  only when an upstream feature actually changed the part's local
   *  geometry (`params.update` re-lowers the assembly but per-part LOCAL
   *  shapes are unchanged when only mate poses moved). Type is `unknown` for
   *  the same boundary reason as `cachedFeatureMeshes`. */
  readonly cachedAssemblyPartMeshes: Map<string, Map<string, unknown>> = new Map();
  /** Slice 2E: per-session RecomputeEngine, attached by `buildModel` on the
   *  first run. Reused by `params.update` so `onRelower` subscribers added
   *  after the initial build still receive re-lower events.
   *
   *  Stored as a minimal structural type (not the real `RecomputeEngine`
   *  class) so this file stays free of recompute/orchestration types — the
   *  architectural-boundary guard at
   *  `tests/unit/kernel/architectureBoundary.test.ts` forbids that direction.
   *  Callers that need the full class API receive a structurally-compatible
   *  object and re-cast at the boundary. */
  private engineRef: SessionRecomputeEngineHandle | undefined;
  /** Slice 2E: read-only accessor. Returns `undefined` until `buildModel`
   *  attaches the per-session engine on the first run. */
  get engine(): SessionRecomputeEngineHandle | undefined {
    return this.engineRef;
  }
  /** Slice 2E: internal — `buildModel` calls this once per session to attach
   *  the engine. Subsequent `params.update` calls reuse the attached engine
   *  so `onRelower` subscriptions persist across updates. */
  setEngine(engine: SessionRecomputeEngineHandle): void {
    this.engineRef = engine;
  }
  /** v0.5: pre-lowered geometry for `lib.fromSTEP(...)` imports. The host-
   *  side import runs at script time; the lowerer pulls the OcctBackend
   *  from this map by feature id when it sees an `importedStep` record.
   *  Lives on the session (not the record) because OCCT shapes carry
   *  circular references that would trip metadata walkers. */
  readonly importedGeometry: Map<string, ShapeBackend> = new Map();

  /** Slice C: auto-emitted connectors keyed by feature/shape id. The
   *  bracket-side bolt-holes-N rule (in modeling/parts/holeAutoConnectors)
   *  registers connectors on the resulting hole feature here; the
   *  bundled-parts manifest loader registers the pre-shipped frames on the
   *  importedStep record. Untyped to avoid a cycle with modeling/parts. */
  readonly autoConnectors: Map<string, ReadonlyArray<unknown>> = new Map();

  /** Attach a set of auto-connectors to a feature/shape id. Subsequent calls
   *  on the same id replace any previous entry. */
  attachAutoConnectors(
    shapeId: string,
    connectors: ReadonlyArray<unknown>,
  ): void {
    this.autoConnectors.set(shapeId, connectors);
  }
  /** v0.6: absolute directory of the calling `.kcad.ts` script. Used by the
   *  OCCT text lowerer to resolve relative `fontPath(...)` arguments at
   *  lower time. Mirrors how `lib.fromSTEP(path)` threads scriptDir through
   *  the API context — but the lowerer pulls it here instead of via the API
   *  context (which doesn't reach lowering). */
  scriptDir?: string;
  /** v0.6: live `Assembly` instances created via `kcad.assembly(name)` during
   *  this session's script run. Tracked by name so the v0.6 MCP mutator tools
   *  (`add_connector`, `add_mate`) can look up the live Assembly object and
   *  call its capture-side methods (`partRef.connector(name, opts)`,
   *  `arm.mate(...)`) after `evaluate_script` has settled the session.
   *  Untyped `unknown` to avoid a TS cycle with `./assembly`; the MCP tools
   *  cast back to `Assembly` at the boundary. */
  readonly assemblies: Map<string, unknown> = new Map();

  /** W2.3 SDF: live `SdfField` closures the script bound by name via
   *  `sdfFields.set(name, field)`. Read by the `evaluate_sdf` MCP tool after
   *  the script re-runs in an isolated session. Untyped `unknown` to avoid
   *  a cycle with `../modules/sdf`; consumers cast back at the boundary. */
  readonly sdfFields: Map<string, unknown> = new Map();

  /** W1.3 NURBS surfaces: id generator + record list for `nurbsSurface()` /
   *  `surfaceFromCurves()`. Surfaces never enter `FeatureRecord` — they
   *  live here separately and are resolved into Replicad Faces at lower
   *  time by the OCCT lowerer's `surfaceCache`. */
  private surfaceIdGen: SurfaceIdGenerator = createSurfaceIdGenerator();
  private surfaceRecords: SurfaceRecord[] = [];

  /** Capture a new NURBS surface from an explicit control net + degree. */
  addNurbsSurface(data: NurbsSurfaceData): SurfaceProxy {
    const id = this.surfaceIdGen.next();
    this.surfaceRecords.push({ id, kind: 'nurbsSurface', params: {}, data });
    return new SurfaceProxy(id, this);
  }

  /** Capture a new surface skinned through 2+ sketch sections. */
  addSurfaceFromCurves(sectionIds: FeatureId[]): SurfaceProxy {
    const id = this.surfaceIdGen.next();
    this.surfaceRecords.push({
      id, kind: 'surfaceFromCurves', params: {},
      data: { kind: 'surfaceFromCurves', sectionIds },
    });
    return new SurfaceProxy(id, this);
  }

  /**
   * NURBS Slice C: capture a Coons-patch surface built from 4 boundary curves.
   * The 4 `curveIds` must reference `curve3d` feature records already on the
   * session, in walk order (bottom, right, top, left). Endpoint-coincidence
   * is verified within 1e-6 mm via the curves' `pointAt(0)` / `pointAt(1)`
   * (OCCT must be initialised, since the proxy evaluator lowers each curve
   * lazily on first sample).
   *
   * Validation diagnostics ride on the `SurfaceRecord.diagnostics` field
   * (mirrors the `addCurve3D` pattern of producing the record regardless of
   * validation outcome so agents can inspect and correct errors).
   */
  addSurfaceFromBoundary(args: {
    curveIds: [FeatureId, FeatureId, FeatureId, FeatureId];
    continuity: ['C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2'];
    sampling?: number;
  }): SurfaceProxy {
    const id = this.surfaceIdGen.next();
    const diagnostics: CompilerDiagnostic[] = [];

    // Validation 1: each curveId must resolve to a curve3d record on the session.
    const curveMetas: (Curve3DMetadata | undefined)[] = args.curveIds.map((cid) => {
      const rec = this.records.find((r) => r.id === cid);
      if (!rec || rec.kind !== 'curve3d') return undefined;
      const m = (rec.metadata as { curve3d?: unknown } | undefined)?.curve3d;
      return isCurve3DMetadataLite(m) ? (m as Curve3DMetadata) : undefined;
    });

    // Validation 2: corner-coincidence within 1e-6 mm using the curve evaluators.
    // We use lazy evaluation (which requires initOcct) so that the endpoint
    // points reflect the actual curve, not just the control polygon. If
    // the evaluators fail (e.g. OCCT not initialised at capture time), we
    // gracefully fall back to the first/last control-point pair — clamped
    // NURBS curves interpolate their endpoints, so this is exact for the
    // common case.
    const corners: ({ start: [number, number, number]; end: [number, number, number] } | undefined)[] =
      curveMetas.map((m, i) => {
        if (!m) return undefined;
        try {
          const ev = lazyEvalCurve(this, args.curveIds[i], m);
          return { start: ev.pointAt(0), end: ev.pointAt(1) };
        } catch {
          // Clamped uniform NURBS curves interpolate their endpoints.
          const cp = m.controlPoints;
          return {
            start: cp[0] as [number, number, number],
            end: cp[cp.length - 1] as [number, number, number],
          };
        }
      });

    if (corners.every((c): c is { start: [number, number, number]; end: [number, number, number] } => c !== undefined)) {
      const eps = 1e-6;
      const close = (a: [number, number, number], b: [number, number, number]): boolean =>
        Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps;
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        if (!close(corners[i].end, corners[next].start)) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.surface-from-boundary.corner-mismatch',
            severity: 'error',
            message:
              `surfaceFromBoundary: curve[${i}].end (${corners[i].end.join(',')}) does not match curve[${next}].start (${corners[next].start.join(',')}) within 1e-6 mm.`,
            hint: HINT_TEMPLATES['feature.surface-from-boundary.corner-mismatch'].template,
          });
        }
      }
    }

    const data: CoonsPatchData = {
      kind: 'coonsPatch',
      curveIds: args.curveIds,
      continuity: args.continuity,
      ...(args.sampling !== undefined ? { sampling: args.sampling } : {}),
    };
    const record: SurfaceRecord = {
      id,
      kind: 'coonsPatch',
      params: {},
      data,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };
    this.surfaceRecords.push(record);
    return new SurfaceProxy(id, this);
  }

  getSurfaceRecord(id: SurfaceId): SurfaceRecord | undefined {
    return this.surfaceRecords.find(s => s.id === id);
  }

  /**
   * Capture a reference-image overlay node. Validates format, path existence,
   * and plane. Pushes structured diagnostics to `metadata.diagnostics` instead
   * of throwing — the record is always produced so agents can inspect errors.
   *
   * Returns the assigned `FeatureId` (the caller in `api.ts` wraps it as a
   * `ReferenceImageHandle`).
   */
  addReferenceImage(args: {
    path: string;
    plane: PlaneSpec;
    anchor?: 'origin' | Vec3;
    scale?: ReferenceImageScale;
    opacity?: number;
    flipU?: boolean;
    flipV?: boolean;
  }): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    // ── 1. Validate format extension ─────────────────────────────────────────
    const ext = extname(args.path).toLowerCase();
    const validExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
    if (!validExts.has(ext)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.reference-image.format-unsupported',
        severity: 'error',
        message: `referenceImage: unsupported file format '${ext || '(no extension)'}'. Supported: .png, .jpg, .jpeg, .webp.`,
        hint: HINT_TEMPLATES['feature.reference-image.format-unsupported'].template,
      });
    }

    // ── 2. Resolve and validate path existence ───────────────────────────────
    const resolvedPath = resolveScriptRelativePath(this.scriptDir, args.path);
    let fileExists = false;
    if (validExts.has(ext)) {
      // Only check existence when format is valid (avoid spurious second error).
      fileExists = existsSync(resolvedPath);
      if (!fileExists) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.reference-image.path-not-found',
          severity: 'error',
          message: `referenceImage: file not found at '${resolvedPath}'.`,
          hint: HINT_TEMPLATES['feature.reference-image.path-not-found'].template,
        });
      }
    }

    // ── 3. Validate plane ────────────────────────────────────────────────────
    if (!isValidPlaneSpec(args.plane)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.reference-image.invalid-plane',
        severity: 'error',
        message: `referenceImage: invalid plane '${JSON.stringify(args.plane)}'. Must be 'xy', 'xz', 'yz', or { plane, offset? }.`,
        hint: HINT_TEMPLATES['feature.reference-image.invalid-plane'].template,
      });
    }

    // ── 4. Read pixel dimensions ─────────────────────────────────────────────
    let pixelWidth = 0;
    let pixelHeight = 0;
    if (fileExists) {
      const dims = imageDimensions(resolvedPath);
      pixelWidth = dims.width;
      pixelHeight = dims.height;
    }

    // ── 5. Validate scale ────────────────────────────────────────────────────
    const scale: ReferenceImageScale = args.scale ?? 'fit-bbox';
    if (typeof scale === 'number') {
      if (!Number.isFinite(scale) || scale <= 0 || scale > 10000) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.reference-image.scale-out-of-range',
          severity: 'warn',
          message: `referenceImage: scale ${scale} is out of range. Must be in (0, 10000] mm.`,
          hint: HINT_TEMPLATES['feature.reference-image.scale-out-of-range'].template,
        });
      }
    }

    // ── 6. Clamp opacity ─────────────────────────────────────────────────────
    const opacity = Math.max(0, Math.min(1, args.opacity ?? 0.5));

    // ── 7. Build metadata ────────────────────────────────────────────────────
    const metadata: ReferenceImageMetadata & { diagnostics?: CompilerDiagnostic[] } = {
      virtual: true,
      path: resolvedPath,
      plane: args.plane,
      anchor: args.anchor ?? 'origin',
      scale,
      opacity,
      flipU: args.flipU ?? false,
      flipV: args.flipV ?? false,
      pixelWidth,
      pixelHeight,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const r = this.register({
      kind: 'referenceImage',
      params: {},
      inputs: {},
      // ReferenceImageMetadata's typed fields fit FeatureMetadata's
      // [key: string]: unknown catch-all, but TS doesn't infer the index
      // signature from a structural-shape interface — cast through unknown.
      metadata: metadata as unknown as Record<string, unknown>,
    });

    return r.id;
  }

  /**
   * Capture a render-environment (HDRI/IBL) virtual feature. Validates that
   * exactly one of `preset` or `url` is given, that preset keys are known,
   * and that intensity is in (0, 100]. Multiple calls register multiple
   * records — the renderer applies the last one.
   */
  addRenderEnvironment(args: RenderEnvironmentSpec): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    const hasPreset = args.preset !== undefined;
    const hasUrl = args.url !== undefined;
    if (hasPreset && hasUrl) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.render-environment.conflicting-spec',
        severity: 'error',
        message: 'setRenderEnvironment: pass either { preset } or { url }, not both.',
        hint: HINT_TEMPLATES['feature.render-environment.conflicting-spec'].template,
      });
    } else if (!hasPreset && !hasUrl) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.render-environment.missing-spec',
        severity: 'error',
        message: 'setRenderEnvironment: pass { preset } or { url }.',
        hint: HINT_TEMPLATES['feature.render-environment.missing-spec'].template,
      });
    } else if (hasPreset && !isHdriPresetKey(args.preset)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.render-environment.unknown-preset',
        severity: 'error',
        message: `setRenderEnvironment: unknown preset '${String(args.preset)}'.`,
        hint: HINT_TEMPLATES['feature.render-environment.unknown-preset'].template,
      });
    }

    const rawIntensity = args.intensity ?? 1;
    const intensityValid = Number.isFinite(rawIntensity) && rawIntensity > 0 && rawIntensity <= 100;
    if (!intensityValid) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.render-environment.intensity-out-of-range',
        severity: 'warn',
        message: `setRenderEnvironment: intensity ${rawIntensity} is out of range (0, 100].`,
        hint: HINT_TEMPLATES['feature.render-environment.intensity-out-of-range'].template,
      });
    }
    const intensity = intensityValid ? rawIntensity : 1;
    const rotation = Number.isFinite(args.rotation) ? Number(args.rotation) : 0;

    const metadata: RenderEnvironmentMetadata & { diagnostics?: CompilerDiagnostic[] } = {
      virtual: true,
      ...(hasPreset && isHdriPresetKey(args.preset) ? { preset: args.preset } : {}),
      ...(hasUrl ? { url: args.url } : {}),
      intensity,
      rotation,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const r = this.register({
      kind: 'renderEnvironment',
      params: {},
      inputs: {},
      metadata: metadata as unknown as Record<string, unknown>,
    });
    return r.id;
  }

  /**
   * Capture a camera-target virtual feature. Validates that x, y, z (and the
   * optional distance) are finite numbers; on invalid input a diagnostic is
   * stashed on `metadata.diagnostics` and a default-safe record is still
   * produced (matching the addRenderEnvironment / addReferenceImage pattern).
   * Multiple calls register multiple records — the renderer applies the last
   * one.
   */
  addCameraTarget(args: CameraTargetSpec): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    const xValid = Number.isFinite(args.x);
    const yValid = Number.isFinite(args.y);
    const zValid = Number.isFinite(args.z);
    if (!xValid || !yValid || !zValid) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.camera-target.non-finite-target',
        severity: 'error',
        message: `setCameraTarget: x, y, z must be finite numbers; got (${args.x}, ${args.y}, ${args.z}).`,
        hint: HINT_TEMPLATES['feature.camera-target.non-finite-target'].template,
      });
    }

    let distance: number | undefined;
    if (args.distance !== undefined) {
      if (!Number.isFinite(args.distance) || args.distance <= 0) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.camera-target.invalid-distance',
          severity: 'warn',
          message: `setCameraTarget: distance ${args.distance} is not a positive finite number; ignoring override.`,
          hint: HINT_TEMPLATES['feature.camera-target.invalid-distance'].template,
        });
      } else {
        distance = args.distance;
      }
    }

    const target: [number, number, number] = [
      xValid ? args.x : 0,
      yValid ? args.y : 0,
      zValid ? args.z : 0,
    ];
    const metadata: CameraTargetMetadata & { diagnostics?: CompilerDiagnostic[] } = {
      virtual: true,
      target,
      ...(distance !== undefined ? { distance } : {}),
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const r = this.register({
      kind: 'cameraTarget',
      params: {},
      inputs: {},
      metadata: metadata as unknown as Record<string, unknown>,
    });
    return r.id;
  }

  /**
   * Capture an animation-view virtual feature. Validates that `param` names
   * a previously-declared `param()` (or defers the check to capture-script
   * time if not yet registered), that `from`/`to`/`durationMs` are finite,
   * and that `durationMs` + `fps` are positive. On invalid input a
   * diagnostic is stashed on `metadata.diagnostics` and a default-safe
   * record is still produced (matching the `addCameraTarget` pattern).
   * Multiple calls register multiple records — the capture script picks
   * the last one when more than one is declared.
   */
  addAnimationView(args: AnimationViewSpec): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    const paramOk = typeof args.param === 'string' && args.param.length > 0;
    if (!paramOk) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        severity: 'error',
        message: `animationView: 'param' must be a non-empty string; got ${JSON.stringify(args.param)}.`,
        hint: `invalid-args.animation-view.param-empty — name a param('...') declared earlier in the script.`,
      });
    }

    const fromOk = Number.isFinite(args.from);
    const toOk = Number.isFinite(args.to);
    if (!fromOk || !toOk) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        severity: 'error',
        message: `animationView: 'from' and 'to' must be finite numbers; got (${args.from}, ${args.to}).`,
        hint: `invalid-args.animation-view.non-finite-range — pass finite numeric bounds for the sweep.`,
      });
    }

    const durOk = Number.isFinite(args.durationMs) && args.durationMs > 0;
    if (!durOk) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        severity: 'error',
        message: `animationView: 'durationMs' must be a positive finite number; got ${args.durationMs}.`,
        hint: `invalid-args.animation-view.bad-duration — pass durationMs > 0 (e.g. 4000 for a 4-second sweep).`,
      });
    }

    let fps = 30;
    if (args.fps !== undefined) {
      if (!Number.isFinite(args.fps) || args.fps <= 0) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.invalid-args',
          severity: 'warn',
          message: `animationView: 'fps' ${args.fps} is not a positive finite number; defaulting to 30.`,
          hint: `invalid-args.animation-view.bad-fps — pass fps > 0 or omit for the 30 default.`,
        });
      } else {
        fps = args.fps;
      }
    }

    const metadata: AnimationViewMetadata & { diagnostics?: CompilerDiagnostic[] } = {
      virtual: true,
      param: paramOk ? args.param : '',
      from: fromOk ? args.from : 0,
      to: toOk ? args.to : 0,
      durationMs: durOk ? args.durationMs : 1000,
      fps,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const r = this.register({
      kind: 'animationView',
      params: {},
      inputs: {},
      metadata: metadata as unknown as Record<string, unknown>,
    });
    return r.id;
  }

  getSurfaceRecords(): readonly SurfaceRecord[] {
    return this.surfaceRecords;
  }

  /**
   * NURBS Slice B: capture a `curve3d` feature record.
   *
   * Validates the control net / weights / knots / closed flag against the
   * Slice B diagnostic codes. Following the `addReferenceImage` pattern,
   * validation diagnostics are stashed in `metadata.diagnostics` rather than
   * thrown — the record is always produced so agents can inspect and correct
   * errors incrementally.
   *
   * Returns a `Curve3DProxy` (peer to `Shape`/`Surface`). The proxy's
   * evaluation methods (`sample`, `pointAt`, `tangentAt`, `length`) lower
   * the curve through `lazyEvalCurve` on first use.
   */
  addCurve3D(args: { metadata: Curve3DMetadata }): Curve3DProxy {
    const m = args.metadata;
    const diagnostics: CompilerDiagnostic[] = [];

    // Validation 1: degenerate control net (controlPoints.length < degree + 1).
    if (m.controlPoints.length < m.degree + 1) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.curve3d.degenerate-controls',
        severity: 'error',
        message: `nurbsCurve: need at least ${m.degree + 1} control points for degree=${m.degree}; got ${m.controlPoints.length}.`,
        hint: HINT_TEMPLATES['feature.curve3d.degenerate-controls'].template,
      });
    }

    // Validation 2: weights length must match controlPoints length.
    if (m.weights !== undefined) {
      if (m.weights.length !== m.controlPoints.length) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.curve3d.weights-length-mismatch',
          severity: 'error',
          message: `nurbsCurve: weights.length (${m.weights.length}) does not match controlPoints.length (${m.controlPoints.length}).`,
          hint: HINT_TEMPLATES['feature.curve3d.weights-length-mismatch'].template,
        });
      } else if (!m.weights.every((w) => Number.isFinite(w) && w > 0)) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.curve3d.weights-non-positive',
          severity: 'error',
          message: `nurbsCurve: all weights must be finite and > 0; got ${JSON.stringify(m.weights)}.`,
          hint: HINT_TEMPLATES['feature.curve3d.weights-non-positive'].template,
        });
      }
    }

    // Validation 3: knot vector length.
    if (m.knots !== undefined) {
      const expected = m.controlPoints.length + m.degree + 1;
      if (m.knots.length !== expected) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.curve3d.knots-length-mismatch',
          severity: 'error',
          message: `nurbsCurve: knot vector length should be ${expected} (controlPoints.length + degree + 1); got ${m.knots.length}.`,
          hint: HINT_TEMPLATES['feature.curve3d.knots-length-mismatch'].template,
        });
      }
    }

    // Validation 4: closed=true but endpoints differ (info — OCCT closes
    // internally, but the user-visible control net is misleading).
    if (m.closed === true && m.controlPoints.length >= 2) {
      const first = m.controlPoints[0];
      const last = m.controlPoints[m.controlPoints.length - 1];
      const eps = 1e-6;
      if (
        Math.abs(first[0] - last[0]) > eps ||
        Math.abs(first[1] - last[1]) > eps ||
        Math.abs(first[2] - last[2]) > eps
      ) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.curve3d.closed-endpoints-mismatch',
          severity: 'warn',
          message: `nurbsCurve: closed=true but first (${first.join(',')}) and last (${last.join(',')}) control points differ.`,
          hint: HINT_TEMPLATES['feature.curve3d.closed-endpoints-mismatch'].template,
        });
      }
    }

    const metadata: Record<string, unknown> = {
      curve3d: m,
      // Mark virtual so the lowerer / mesher / serializer can skip this
      // record when iterating user-visible geometry. The OCCT edge still
      // lowers — it's just not a `Shape` and doesn't render as a mesh.
      virtual: true,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const record = this.register({
      kind: 'curve3d',
      params: {},
      inputs: {},
      metadata,
    });

    return new Curve3DProxy(record.id, m, this);
  }

  /**
   * NURBS Slice B: capture a `variableSweep` feature record.
   *
   * The spine is referenced by id (typically a `curve3d` feature, but the
   * lowerer also accepts a `Sketch` via its lifted wire). Each section
   * carries a normalized parameter `t ∈ [0, 1]` and the FeatureId of a
   * Sketch profile.
   *
   * Validates t-ordering and [0, 1] spanning. Validation diagnostics are
   * stashed in `metadata.diagnostics` (mirror addReferenceImage pattern).
   */
  addVariableSweep(args: {
    spineId: FeatureId;
    sections: { t: number; profileId: FeatureId }[];
    closed?: boolean;
    continuity?: 'C0' | 'C1' | 'C2';
  }): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    if (args.sections.length < 2) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.variable-sweep.sections-not-spanning',
        severity: 'error',
        message: `variableSweep: need at least 2 sections; got ${args.sections.length}.`,
        hint: HINT_TEMPLATES['feature.variable-sweep.sections-not-spanning'].template,
      });
    } else {
      // Strictly increasing t.
      for (let i = 1; i < args.sections.length; i++) {
        if (args.sections[i].t <= args.sections[i - 1].t) {
          diagnostics.push({
            target: 'export-occt',
            code: 'feature.variable-sweep.sections-out-of-order',
            severity: 'error',
            message: `variableSweep: sections must be strictly increasing in t; got t[${i}]=${args.sections[i].t} <= t[${i - 1}]=${args.sections[i - 1].t}.`,
            hint: HINT_TEMPLATES['feature.variable-sweep.sections-out-of-order'].template,
          });
          break;
        }
      }
      // Spanning [0, 1].
      const first = args.sections[0].t;
      const last = args.sections[args.sections.length - 1].t;
      if (Math.abs(first - 0) > 1e-9 || Math.abs(last - 1) > 1e-9) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.variable-sweep.sections-not-spanning',
          severity: 'error',
          message: `variableSweep: sections must span [0, 1] inclusive; got t[0]=${first}, t[last]=${last}.`,
          hint: HINT_TEMPLATES['feature.variable-sweep.sections-not-spanning'].template,
        });
      }
    }

    const inputs: Record<string, FeatureRef> = {
      spine: { kind: 'feature', id: args.spineId },
    };
    args.sections.forEach((s, i) => {
      inputs[`section_${i}`] = { kind: 'feature', id: s.profileId };
    });

    const sweepMeta: VariableSweepMetadata = {
      spineRef: { kind: 'feature', id: args.spineId },
      sections: args.sections.map(
        (s): VariableSweepSection => ({
          t: s.t,
          profileRef: { kind: 'feature', id: s.profileId },
        }),
      ),
      ...(args.closed !== undefined ? { closed: args.closed } : {}),
      continuity: args.continuity ?? 'C1',
    };

    const metadata: Record<string, unknown> = {
      variableSweep: sweepMeta,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const record = this.register({
      kind: 'variableSweep',
      params: {},
      inputs,
      metadata,
    });

    return record.id;
  }

  /**
   * W3: capture an `embossText` feature.
   *
   * Validates content, depth sign, and UV anchor range. Diagnostics are stashed
   * in `metadata.diagnostics` (mirror `addReferenceImage`/`addCurve3D`); the
   * record is always produced so the lowerer can surface the issues.
   */
  addEmbossText(
    parentFeatureId: FeatureId,
    args: {
      textContent: string;
      fontFamily?: string;
      size: Editable<number>;
      depth: Editable<number>;
      align?: EmbossTextAlign;
      anchorU?: Editable<number>;
      anchorV?: Editable<number>;
      rotation?: Editable<number>;
      scaleMode?: EmbossTextScaleMode;
      face: import('./proxy').FaceSelector | string;
    },
  ): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    // 1. Text content guard (mirrors sketch.text behaviour).
    if (typeof args.textContent !== 'string' || args.textContent.trim().length === 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'sketch.text.empty-content',
        severity: 'error',
        message: `embossText: textContent must be a non-empty string with at least one printable glyph; got ${JSON.stringify(args.textContent)}.`,
        hint: HINT_TEMPLATES['sketch.text.empty-content'].template,
      });
    }

    // 2. Depth must be non-zero (sign selects fuse vs cut).
    const depthParam = toParam(args.depth, 'mm');
    if (depthParam.evaluated === 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.emboss-text.depth-zero',
        severity: 'error',
        message: `embossText: depth must be non-zero (positive=emboss out, negative=engrave in); got 0.`,
        hint: HINT_TEMPLATES['feature.emboss-text.depth-zero'].template,
      });
    }

    // 3. UV anchors in [0, 1].
    const anchorUParam = toParam(args.anchorU ?? 0.5, 'unitless');
    const anchorVParam = toParam(args.anchorV ?? 0.5, 'unitless');
    const outOfRangeU = !(anchorUParam.evaluated >= 0 && anchorUParam.evaluated <= 1);
    const outOfRangeV = !(anchorVParam.evaluated >= 0 && anchorVParam.evaluated <= 1);
    if (outOfRangeU || outOfRangeV) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.face.invalid-uv-anchor',
        severity: 'error',
        message: `embossText: anchor must lie in [0, 1]; got anchorU=${anchorUParam.evaluated}, anchorV=${anchorVParam.evaluated}.`,
        hint: HINT_TEMPLATES['feature.face.invalid-uv-anchor'].template,
      });
    }

    const sizeParam = toParam(args.size, 'mm');
    const rotationParam = toParam(args.rotation ?? 0, 'deg');

    // Normalize face selector to FaceRef (mirror buildFaceInputRef path).
    const faceInputRef = buildFaceInputRef(parentFeatureId, args.face);
    const faceRef =
      faceInputRef.kind === 'face'
        ? faceInputRef.ref
        : { kind: 'canonical' as const, face: 'top' as const };

    const metadata: EmbossTextMetadata & { diagnostics?: CompilerDiagnostic[] } = {
      textContent: args.textContent,
      ...(args.fontFamily !== undefined ? { fontFamily: args.fontFamily } : {}),
      size: sizeParam,
      depth: depthParam,
      align: args.align ?? 'center',
      anchorU: anchorUParam,
      anchorV: anchorVParam,
      rotation: rotationParam,
      scaleMode: args.scaleMode ?? 'original',
      faceRef,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const r = this.register({
      kind: 'embossText',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: parentFeatureId },
        face: faceInputRef,
      },
      metadata: metadata as unknown as Record<string, unknown>,
    });
    return r.id;
  }

  /**
   * W3: capture a `projectCurve` feature.
   *
   * Closed-curve mode (default) wraps a 2D sketch onto a 3D face via
   * `drawing.sketchOnFace(face, scaleMode)`. `asEdge:true` is captured but
   * deferred at lower time (the bundled OCCT does not export
   * `BRepProj_Projection`).
   */
  addProjectCurve(
    parentFeatureId: FeatureId,
    args: {
      source: ProjectCurveSource;
      face: import('./proxy').FaceSelector | string;
      scaleMode?: ProjectCurveScaleMode;
      asEdge?: boolean;
    },
  ): FeatureId {
    const diagnostics: CompilerDiagnostic[] = [];

    if (args.source.kind === 'sketchCommands') {
      if (args.source.commands.length === 0) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.project-curve.curve-empty',
          severity: 'error',
          message: 'projectCurve: source.commands is empty; nothing to project.',
          hint: HINT_TEMPLATES['feature.project-curve.curve-empty'].template,
        });
      }
    } else if (args.source.kind === 'drawing') {
      // Validation deferred to lowerer (deserialization step).
    }

    const faceInputRef = buildFaceInputRef(parentFeatureId, args.face);
    const faceRef =
      faceInputRef.kind === 'face'
        ? faceInputRef.ref
        : { kind: 'canonical' as const, face: 'top' as const };

    const metadata: ProjectCurveMetadata & { diagnostics?: CompilerDiagnostic[] } = {
      source: args.source,
      scaleMode: args.scaleMode ?? 'original',
      asEdge: args.asEdge ?? false,
      faceRef,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };

    const r = this.register({
      kind: 'projectCurve',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: parentFeatureId },
        face: faceInputRef,
      },
      metadata: metadata as unknown as Record<string, unknown>,
    });
    return r.id;
  }

  register(spec: FeatureSpec): FeatureRecord {
    const id = this.idGen.next(spec.kind);
    const r: FeatureRecord = {
      id,
      kind: spec.kind,
      params: spec.params,
      inputs: spec.inputs,
      transforms: [],
      suppressed: false,
      metadata: spec.metadata,
    };
    // Slice-3: populate metadata.paramRefs (the dependency index Phase 3
    // uses to find the first-affected record on `params.update`). Walks
    // params + metadata for any Param-shaped object with `paramRef` set.
    const refs = new Set<string>();
    for (const refName of collectParamRefs(r.params)) refs.add(refName);
    if (r.metadata !== undefined) {
      for (const refName of collectParamRefs(r.metadata)) refs.add(refName);
    }
    if (refs.size > 0) {
      r.metadata = { ...(r.metadata ?? {}), paramRefs: Array.from(refs) };
    }
    this.records.push(r);
    return r;
  }

  createShape(spec: FeatureSpec): Shape {
    const r = this.register(spec);
    return new Shape(r.id, this);
  }

  createSketch(spec: FeatureSpec): Sketch {
    const r = this.register(spec);
    return new Sketch(r.id, this);
  }

  /** Build a `Sketch` wrapper around an already-registered feature id. Used
   *  by `Shape.projectCurve` (which registers a `projectCurve` record but
   *  needs to hand back a `Sketch` so the caller can chain `.extrude(d)`).
   *  Does not register a new record. */
  sketchFromId(id: FeatureId): Sketch {
    return new Sketch(id, this);
  }

  appendTransform(id: string, t: ShapeTransform): void {
    // O(n) lookup is deliberate v0.1 simplicity; revisit if profiling shows it.
    const r = this.records.find(x => x.id === id);
    if (!r) throw new Error(`Feature '${id}' not registered`);
    r.transforms.push(t);
    // Slice-5: Param-typed translate/rotateAxis transforms can carry ParamRefs.
    // Merge any new refs into metadata.paramRefs so `params.update`'s
    // first-affected scan invalidates this record when the named param edits.
    const newRefs = collectParamRefs(t);
    if (newRefs.size > 0) {
      const existing = (r.metadata as { paramRefs?: string[] } | undefined)?.paramRefs ?? [];
      const merged = new Set<string>(existing);
      for (const name of newRefs) merged.add(name);
      r.metadata = { ...(r.metadata ?? {}), paramRefs: Array.from(merged) };
    }
  }

  boolean(op: 'union' | 'difference' | 'intersection', base: Shape, cutters: Shape[]): Shape {
    // Validate all input shapes belong to this session.
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`boolean: base shape '${base.id}' is not from this CaptureSession`);
    }
    for (let i = 0; i < cutters.length; i++) {
      if (!this.records.some(r => r.id === cutters[i].id)) {
        throw new Error(`boolean: cutter shape '${cutters[i].id}' is not from this CaptureSession`);
      }
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    cutters.forEach((c, i) => {
      inputs[`cutter_${i}`] = { kind: 'feature', id: c.id };
    });
    const opLabel: Param = {
      expression: `'${op}'`, unit: 'unitless', evaluated: 0,
    };
    return this.createShape({
      kind: 'boolean',
      params: { op: opLabel },
      inputs,
    });
  }

  mirrorFeature(base: Shape, plane: PlaneSpec): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`mirror: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    return this.createShape({
      kind: 'mirror',
      params: {},
      inputs,
      metadata: { plane },
    });
  }

  patternFeature(base: Shape, pattern: PatternSpec): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`pattern: base shape '${base.id}' is not from this CaptureSession`);
    }
    return this.createShape({
      kind: 'pattern',
      params: {},
      inputs: {
        base: { kind: 'feature', id: base.id },
      },
      metadata: { pattern },
    });
  }

  assemblyPart(
    assemblyName: string,
    partName: string,
    shape: Shape,
    opts: {
      at?: Vec3Param;
      connectors?: Record<string, AssemblyConnectorFrameStored>;
      placedBy?: AssemblyPartOpts['connect'];
    } = {},
  ): FeatureRecord {
    if (!this.records.some(r => r.id === shape.id)) {
      throw new Error(`assembly.part: shape '${shape.id}' is not from this CaptureSession`);
    }
    return this.register({
      kind: 'assemblyPart',
      params: {},
      inputs: {
        shape: { kind: 'feature', id: shape.id },
      },
      metadata: {
        assemblyName,
        partName,
        ...(opts.at !== undefined ? { at: opts.at } : {}),
        ...(opts.connectors !== undefined ? { connectors: opts.connectors } : {}),
        ...(opts.placedBy !== undefined ? {
          placedBy: {
            connector: opts.placedBy.connector,
            to: {
              partId: opts.placedBy.to.partId,
              partName: opts.placedBy.to.partName,
              connector: opts.placedBy.to.connector,
            },
          },
        } : {}),
      },
    });
  }

  assemblyConnect(
    assemblyName: string,
    connectName: string,
    a: AssemblyConnectorRef,
    b: AssemblyConnectorRef,
  ): FeatureRecord {
    for (const connector of [a, b]) {
      const record = this.records.find(r => r.id === connector.partId);
      if (!record || record.kind !== 'assemblyPart') {
        throw new Error(`assembly.connect: part '${connector.partId}' is not an assembly part in this CaptureSession`);
      }
    }
    return this.register({
      kind: 'assemblyConnect',
      params: {},
      inputs: {
        a: { kind: 'feature', id: a.partId },
        b: { kind: 'feature', id: b.partId },
      },
      metadata: {
        assemblyName,
        connectName,
        kind: 'fixed',
        a: {
          partName: a.partName,
          connector: a.connector,
          origin: a.origin,
          worldOrigin: a.worldOrigin,
          ...(a.axis !== undefined ? { axis: a.axis } : {}),
        },
        b: {
          partName: b.partName,
          connector: b.connector,
          origin: b.origin,
          worldOrigin: b.worldOrigin,
          ...(b.axis !== undefined ? { axis: b.axis } : {}),
        },
      },
    });
  }

  assemblyJoint(
    assemblyName: string,
    jointName: string,
    jointKind: 'revolute' | 'prismatic' | 'fixed' | 'ball',
    a: AssemblyPartRef,
    b: AssemblyPartRef,
    opts: {
      axis?: Vec3;
      origin: Vec3;
      limitsDeg?: [number, number];
      limitsMm?: [number, number];
      ballLimitsDeg?: [[number, number], [number, number], [number, number]];
    },
  ): FeatureRecord {
    for (const part of [a, b]) {
      const record = this.records.find(r => r.id === part.id);
      if (!record || record.kind !== 'assemblyPart') {
        throw new Error(`assembly.${jointKind}: part '${part.id}' is not an assembly part in this CaptureSession`);
      }
    }
    return this.register({
      kind: 'assemblyJoint',
      params: {},
      inputs: {
        a: { kind: 'feature', id: a.id },
        b: { kind: 'feature', id: b.id },
      },
      metadata: {
        assemblyName,
        jointName,
        jointKind,
        ...(opts.axis !== undefined ? { axis: opts.axis } : {}),
        origin: opts.origin,
        ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
        ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
        ...(opts.ballLimitsDeg !== undefined ? { ballLimitsDeg: opts.ballLimitsDeg } : {}),
      },
    });
  }

  assemblyModel(
    assemblyName: string,
    parts: readonly AssemblyPartRef[],
    mateMetadata?: SolvedAssemblyMateMetadata,
  ): Shape {
    if (parts.length === 0) {
      throw new Error('assembly.model requires at least one part');
    }
    const inputs: Record<string, FeatureRef> = {};
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const record = this.records.find(r => r.id === part.id);
      if (!record || record.kind !== 'assemblyPart') {
        throw new Error(`assembly.model: part '${part.id}' is not an assembly part in this CaptureSession`);
      }
      inputs[`part_${i}`] = { kind: 'feature', id: part.id };
    }
    return this.createShape({
      kind: 'assemblyModel',
      params: {},
      inputs,
      metadata: {
        assemblyName,
        partIds: parts.map(part => part.id),
        ...(mateMetadata !== undefined && mateMetadata.mates.length > 0
          ? {
              mates: mateMetadata.mates,
              couplings: mateMetadata.couplings ?? [],
              connectorsByPartId: mateMetadata.connectorsByPartId,
            }
          : {}),
      },
    });
  }

  /**
   * Capture-time recording of `Assembly.solvedModel(poses)`. Mirrors
   * `assemblyModel` but adds joint inputs and pose metadata. Pose values
   * are wrapped via `toParam` so ParamRefs encode as `{ paramRef, evaluated:0 }`
   * — the lowerer (Task 4) resolves them at recompute time using the live
   * ParamTable, giving studio-driven param edits a reactive re-pose.
   *
   * Pose value shapes match `Poses` (assembly.ts):
   *   - revolute, prismatic: `Editable<number>` -> `{ kind: 'scalar', value: Param }`
   *   - ball: 3-tuple `Editable<number>` -> `{ kind: 'ball', value: [Param,Param,Param] }`
   *
   * Unit on the Param wrapper is cosmetic at v1: the lowerer reads
   * `evaluated` regardless. Currently always `'deg'`; revisit when prismatic
   * authoring surfaces a cleaner joint-kind branch.
   */
  solvedAssembly(
    assemblyName: string,
    parts: readonly AssemblyPartRef[],
    joints: readonly { id: FeatureId; name: string }[],
    poses: Record<string, Editable<number> | [Editable<number>, Editable<number>, Editable<number>]>,
    mateMetadata?: SolvedAssemblyMateMetadata,
  ): Shape {
    if (parts.length === 0) {
      throw new Error('assembly.solvedModel requires at least one part');
    }
    const inputs: Record<string, FeatureRef> = {};
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const record = this.records.find(r => r.id === part.id);
      if (!record || record.kind !== 'assemblyPart') {
        throw new Error(`assembly.solvedModel: part '${part.id}' is not an assembly part in this CaptureSession`);
      }
      inputs[`part_${i}`] = { kind: 'feature', id: part.id };
    }
    // Build joint-name -> kind map from the joint records so capture-time
    // pose validation can match each pose entry against its declared joint.
    const jointKindByName = new Map<string, 'revolute' | 'prismatic' | 'fixed' | 'ball'>();
    for (let j = 0; j < joints.length; j++) {
      const joint = joints[j];
      const record = this.records.find(r => r.id === joint.id);
      if (!record || record.kind !== 'assemblyJoint') {
        throw new Error(`assembly.solvedModel: joint '${joint.id}' is not an assembly joint in this CaptureSession`);
      }
      inputs[`joint_${j}`] = { kind: 'feature', id: joint.id };
      const m = record.metadata as { jointName?: string; jointKind?: 'revolute' | 'prismatic' | 'fixed' | 'ball' };
      if (m.jointName !== undefined && m.jointKind !== undefined) {
        jointKindByName.set(m.jointName, m.jointKind);
      }
    }
    const mateKindByName = new Map<string, MateType>();
    for (const mate of mateMetadata?.mates ?? []) {
      mateKindByName.set(mate.name, mate.type);
    }

    // Capture-time pose validation: catch unknown-joint and pose-shape
    // mismatches before encoding. Missing-pose / non-finite are deferred to
    // the lowerer per spec — capture allows partial / Editable poses, the
    // recompute pipeline emits structured diagnostics for the rest.
    for (const [name, val] of Object.entries(poses)) {
      const kind = jointKindByName.get(name);
      const mateKind = mateKindByName.get(name);
      if (kind === undefined && mateKind !== undefined) {
        if (mateKind === 'ball' && !Array.isArray(val)) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solvedModel: ball mate '${name}' requires [x, y, z] pose; got ${typeof val}.`,
            undefined,
            `invalid-args.solvedModel.pose-shape — mate ${name} is a ball mate; pose must be [x, y, z].`,
          );
        }
        if (mateKind !== 'ball' && Array.isArray(val)) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solvedModel: scalar mate '${name}' (${mateKind}) requires a number pose; got [x, y, z].`,
            undefined,
            `invalid-args.solvedModel.pose-shape — mate ${name} is a ${mateKind} mate; pose must be a single number.`,
          );
        }
        continue;
      }
      if (kind === undefined) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solvedModel: joint '${name}' not declared on assembly '${assemblyName}'.`,
          undefined,
          `invalid-args.solvedModel.unknown-joint — joint ${name} not declared.`,
        );
      }
      if (kind === 'ball' && !Array.isArray(val)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solvedModel: ball joint '${name}' requires [x, y, z] pose; got ${typeof val}.`,
          undefined,
          `invalid-args.solvedModel.pose-shape — joint ${name} is a ball joint; pose must be [x, y, z].`,
        );
      }
      if (kind !== 'ball' && Array.isArray(val)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solvedModel: scalar joint '${name}' (${kind}) requires a number pose; got [x, y, z].`,
          undefined,
          `invalid-args.solvedModel.pose-shape — joint ${name} is a ${kind} joint; pose must be a single number.`,
        );
      }
    }

    type EncodedPose =
      | { kind: 'scalar'; value: Param }
      | { kind: 'ball'; value: [Param, Param, Param] };
    const encodedPoses: Record<string, EncodedPose> = {};
    for (const [name, val] of Object.entries(poses)) {
      if (Array.isArray(val)) {
        encodedPoses[name] = {
          kind: 'ball',
          value: [
            toParam(val[0], 'deg'),
            toParam(val[1], 'deg'),
            toParam(val[2], 'deg'),
          ],
        };
      } else {
        encodedPoses[name] = { kind: 'scalar', value: toParam(val, 'deg') };
      }
    }

    return this.createShape({
      kind: 'solvedAssembly',
      params: {},
      inputs,
      metadata: {
        assemblyName,
        partIds: parts.map(part => part.id),
        jointIds: joints.map(j => j.id),
        poses: encodedPoses,
        // v0.6 T17 (mate-FK at lower-time): mate metadata flows here when the
        // assembly declares mates, so the lowerer can run `mateFk` and put the
        // mate-derived world transforms on the SceneBackend. Without this
        // metadata the lowerer falls back to v0.5 body-tree FK only and parts
        // mated via .connector/.mate sit at the LOCAL origin in the rendered
        // output. The `connectorsByPartId` map holds connectors whose origins
        // are already resolved to numeric `vec3` (topology queries lowered
        // upstream in `Assembly.solvedModel`); `mates[].pose` is encoded as
        // `Param` so reactive param edits re-pose without rerunning capture.
        ...(mateMetadata !== undefined && mateMetadata.mates.length > 0
          ? {
              mates: mateMetadata.mates,
              couplings: mateMetadata.couplings ?? [],
              connectorsByPartId: mateMetadata.connectorsByPartId,
            }
          : {}),
      },
    });
  }

  /**
   * Capture-time recording of `Scene.toCompound()` / `Scene.toUnion()`.
   *
   * Consumes the upstream `solvedAssembly` (or `assemblyModel`) feature's
   * SceneBackend output via `inputs.scene = { kind: 'feature', id: sceneFeatureId }`.
   * The lowerer reads each part's local-frame shape and worldTransform and
   * either:
   *   - `op: 'compound'` — wraps the per-part shapes in a TopoDS_Compound
   *     via replicad.makeCompound (lossless on per-part identity), or
   *   - `op: 'union'`    — boolean-fuses them into a single solid
   *     (lossy on color/name/metadata).
   *
   * The returned Shape behaves like any other capture-time Shape — chain
   * `.fillet()`, `.exportSTL()`, etc. on it.
   */
  assemblyExport(sceneFeatureId: FeatureId, op: 'compound' | 'union'): Shape {
    const sourceRecord = this.records.find(r => r.id === sceneFeatureId);
    if (!sourceRecord) {
      throw new Error(`assemblyExport: source scene feature '${sceneFeatureId}' is not from this CaptureSession`);
    }
    if (sourceRecord.kind !== 'solvedAssembly' && sourceRecord.kind !== 'assemblyModel') {
      throw new Error(`assemblyExport: source feature '${sceneFeatureId}' is kind '${sourceRecord.kind}'; expected 'solvedAssembly' or 'assemblyModel'.`);
    }
    const opLabel: Param = {
      expression: `'${op}'`, unit: 'unitless', evaluated: 0,
    };
    return this.createShape({
      kind: 'assemblyExport',
      params: { op: opLabel },
      inputs: {
        scene: { kind: 'feature', id: sceneFeatureId },
      },
      metadata: { op },
    });
  }

  edgeFeature(
    kind: 'fillet' | 'chamfer' | 'shell',
    base: Shape,
    valueParamName: 'radius' | 'distance' | 'thickness',
    value: Editable<number>,
    selector?: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
    opts?: { continuity?: import('../../shared/intent/filletContinuityRecord').FilletContinuity },
  ): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`${kind}: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };

    if (selector !== undefined) {
      const ref = buildEdgeFeatureRef(base.id, selector);
      if (ref.key === 'face') inputs.face = ref.value;
      if (ref.key === 'edges') inputs.edges = ref.value;
    }

    // Slice C Task 6: only `fillet` consumes continuity today; chamfer/shell ignore it.
    const metadata: import('../../shared/intent/featureRecord').FeatureMetadata | undefined =
      (kind === 'fillet' && opts?.continuity !== undefined)
        ? { continuity: opts.continuity }
        : undefined;

    return this.createShape({
      kind,
      params: { [valueParamName]: toParam(value, 'mm') },
      inputs,
      ...(metadata !== undefined ? { metadata } : {}),
    });
  }

  /**
   * Variable-radius / variable-distance edge feature (rc.11).
   * Each group's `edges` becomes a FeatureRef under `inputs.edge_group_${i}`;
   * the `radius` (or `distance`) is stored in `metadata.groups[i]`. The lowerer
   * resolves each group's edges via `pickEdges`-style dispatch and builds a
   * Replicad function-form RadiusConfig.
   */
  /** W2.2: capture a `kind: 'sheetMetalBend'` FeatureRecord with the same
   *  selector-handling as `.fillet()` / `.chamfer()`. The lowerer validates
   *  the bend root + edge linearity; this capture method does no edge
   *  resolution. */
  bendFeature(
    base: Shape,
    angleParam: Param,
    radiusParam: Param,
    selector: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
  ): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`bend: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    if (selector !== undefined) {
      const ref = buildEdgeFeatureRef(base.id, selector);
      if (ref.key === 'face') inputs.face = ref.value;
      if (ref.key === 'edges') inputs.edges = ref.value;
    }
    return this.createShape({
      kind: 'sheetMetalBend',
      params: { angle: angleParam, radius: radiusParam },
      inputs,
    });
  }

  variableEdgeFeature(
    kind: 'fillet' | 'chamfer',
    base: Shape,
    valueKey: 'radius' | 'distance',
    groups: Array<{
      edges: import('./proxy').EdgeSelector;
      radius?: Editable<number>;
      distance?: Editable<number>;
    }>,
  ): Shape {
    if (!this.records.some(r => r.id === base.id)) {
      throw new Error(`${kind}: base shape '${base.id}' is not from this CaptureSession`);
    }
    const inputs: Record<string, FeatureRef> = {
      base: { kind: 'feature', id: base.id },
    };
    const metadataGroups: Array<{ radius?: number; distance?: number }> = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const ref = buildEdgeFeatureRef(base.id, g.edges);
      // The buildEdgeFeatureRef helper returns either { key: 'face', value }
      // (for canonical/label/query face wrappers) or { key: 'edges', value }
      // (for direct edge selectors). For variable-radius, we always store
      // under `edge_group_${i}` — the lowerer reads ref.kind to dispatch.
      inputs[`edge_group_${i}`] = ref.value;
      const value = g[valueKey];
      metadataGroups.push({ [valueKey]: value });
    }
    return this.createShape({
      kind,
      params: {
        // Empty params block — lowerer reads metadata.groups for radii/distances.
      },
      inputs,
      metadata: {
        variable: true,
        groups: metadataGroups,
      },
    });
  }

  getRecords(): readonly FeatureRecord[] {
    return this.records;
  }

  exportSession(): SerializedSession & { schemaVersion: 3; params: SerializedParamTable } {
    return {
      schemaVersion: 3,
      params: this.paramTable.serialize(),
      records: cloneJson(this.records),
    };
  }

  static importSession(data: SerializedSession): CaptureSession {
    const session = new CaptureSession();
    const schemaVersion = data.schemaVersion ?? 1;
    session.records = cloneJson(Array.from(data.records ?? []));
    session.paramTable.replaceWith(
      schemaVersion >= 3 ? ParamTable.deserialize(data.params) : new ParamTable(),
    );

    if (schemaVersion >= 3) {
      for (const record of session.records) {
        const refs = new Set<string>();
        for (const name of collectParamRefs(record.params)) refs.add(name);
        if (record.metadata !== undefined) {
          for (const name of collectParamRefs(record.metadata)) refs.add(name);
        }
        for (const name of refs) {
          if (!session.paramTable.has(name)) {
            throw new KernelError(
              'feature.invalid-args',
              `importSession: unknown param ref '${name}' in record '${record.id}'.`,
              record.id,
              `invalid-args.session.unknown-param-ref — unknown param ref '${name}' in record '${record.id}'`,
            );
          }
        }
      }
    }

    return session;
  }

  reset(): void {
    this.records = [];
    this.idGen.reset();
    this.paramTable.clear();
    this.warnings.length = 0;
    this.gatedFeatureNames.clear();
    this.engineRef = undefined;
  }

  /** Slice-3: drain the warning log. Returns the accumulated warnings and
   *  clears the buffer. Used by tooling that wants a one-shot snapshot. */
  consumeWarnings(): SoftWarning[] {
    const out = this.warnings.slice();
    this.warnings.length = 0;
    return out;
  }

  /** Slice-3 namespace: edit-after-build operations.
   *  See spec §E.6, §F.1, §F.2. */
  readonly params = {
    list: (): import('../../shared/runtime/paramTable').ParamEntry[] => this.paramTable.list(),

    update: async (edits: ParamUpdateEdit[]): Promise<ParamUpdateResult> => this.runParamUpdate(edits),
  };

  /** Compatibility facade for `params.update`. Recompute orchestration lives
   *  in `src/kernel/buildModel.ts` so CLI, MCP, and direct session updates
   *  share the same cache/warning/tail-shape policy. */
  private async runParamUpdate(edits: ParamUpdateEdit[]): Promise<ParamUpdateResult> {
    const { updateModelParams } = await import('../buildModel');
    const records = this.getRecords();
    const shapes = new Map<string, ShapeBackend>();
    for (const [id, shape] of this.cachedShapes) shapes.set(id, shape);
    const tailId = records.length > 0 ? records[records.length - 1].id : undefined;
    const { result } = await updateModelParams({
      session: this,
      records,
      shapes,
      diagnostics: [],
      health: new Map(),
      warnings: [],
      tailId,
      tailShape: tailId ? this.cachedShapes.get(tailId) : undefined,
    }, edits);
    return result;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Lightweight structural check for Curve3DMetadata used by
 *  `addSurfaceFromBoundary` — avoids importing the full type-guard while still
 *  catching missing-controls / missing-degree without throwing. */
function isCurve3DMetadataLite(v: unknown): v is Curve3DMetadata {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as { controlPoints?: unknown; degree?: unknown };
  if (!Array.isArray(m.controlPoints) || m.controlPoints.length === 0) return false;
  if (typeof m.degree !== 'number' || !Number.isInteger(m.degree) || m.degree < 1) return false;
  return true;
}

const CANONICAL_FACES = new Set(['top', 'bottom', 'left', 'right', 'front', 'back']);

const EDGE_QUERY_KEYS = new Set<string>(EDGE_QUERY_KEYS_ARR);

/**
 * Translate the user-facing EdgeSelector (or face wrapper) into either an
 * `inputs.face` or `inputs.edges` FeatureRef. The lowerer (Task 3) dispatches
 * on the resulting ref kind.
 *
 * Dispatch order:
 *   1. { face: <canonical> } → FaceRef.canonical (existing path; back-compat)
 *   2. { face: <other-string> } → FaceRef.label (resolved at lowering by Task 4)
 *   3. { face: <FaceQuery object> } → FaceRef.query
 *   4. EdgeSegment (object with `id` AND `midpoint`) → EdgeRef.segment
 *   5. EdgeSegment[] (array) → EdgeRef.segments
 *   6. Otherwise (object with EdgeQuery keys) → EdgeRef.query
 */
function buildEdgeFeatureRef(
  baseId: string,
  selector: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
): { key: 'face' | 'edges'; value: FeatureRef } {
  // Q8 — Query DSL value (kc.q.edge(...) / kc.q.face(...)). Dispatch by
  // target kind so the lowerer sees the right slot key (edges for edge
  // queries, face for face queries).
  if (isQueryValue(selector)) {
    const key: 'face' | 'edges' = selector.target === 'face' ? 'face' : 'edges';
    return {
      key,
      value: {
        kind: key === 'face' ? 'face' : 'edge',
        featureId: baseId,
        ref: {
          kind: 'queryDsl',
          queryAst: selector.ast,
          queryTarget: selector.target,
          ...(selector.lenient ? { lenient: true } : {}),
        },
      },
    };
  }
  // Case 1-3: { face: ... } wrapper. We detect this by: object with `face`
  // property and NOT having the EdgeSegment full-schema markers.
  if (typeof selector === 'object' && selector !== null && 'face' in selector &&
      !('id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector)) {
    const faceVal = (selector as { face: unknown }).face;
    // Q8 — { face: kc.q.face(...) } wrapper form on an edge feature.
    if (isQueryValue(faceVal)) {
      return {
        key: 'face',
        value: {
          kind: 'face',
          featureId: baseId,
          ref: {
            kind: 'queryDsl',
            queryAst: faceVal.ast,
            queryTarget: faceVal.target,
            ...(faceVal.lenient ? { lenient: true } : {}),
          },
        },
      };
    }
    if (typeof faceVal === 'string') {
      if (CANONICAL_FACES.has(faceVal)) {
        return {
          key: 'face',
          value: {
            kind: 'face',
            featureId: baseId,
            ref: { kind: 'canonical', face: faceVal as 'top' },
          },
        };
      }
      // Non-canonical string → label
      return {
        key: 'face',
        value: {
          kind: 'face',
          featureId: baseId,
          ref: { kind: 'label', name: faceVal },
        },
      };
    }
    // Object form → FaceQuery
    return {
      key: 'face',
      value: {
        kind: 'face',
        featureId: baseId,
        ref: { kind: 'query', query: faceVal as import('../../kernel/backends/occt/edgeQueries').FaceQuery },
      },
    };
  }
  // Case 4: EdgeSegment (object with id + midpoint + direction + curveType — full schema)
  if (typeof selector === 'object' && selector !== null &&
      'id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector) {
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segment', segmentId: (selector as { id: string }).id },
      },
    };
  }
  // Case 5: EdgeSegment[]
  if (Array.isArray(selector)) {
    const segmentIds = selector.map(s => s.id);
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segments', segmentIds },
      },
    };
  }
  // Case 6: EdgeQuery — verify all keys are in the whitelist. If any keys are
  // unknown we still build a query ref so the lowerer can diagnose with the
  // `feature.invalid-args` code; that keeps the error path on
  // the lowering side where diagnostics are aggregated.
  if (typeof selector === 'object' && selector !== null) {
    const keys = Object.keys(selector);
    if (keys.length > 0 && keys.every(k => EDGE_QUERY_KEYS.has(k))) {
      return {
        key: 'edges',
        value: {
          kind: 'edge',
          featureId: baseId,
          ref: { kind: 'query', query: selector as import('../../kernel/backends/occt/edgeQueries').EdgeQuery },
        },
      };
    }
    // Unknown shape — store as a query so the lowerer can diagnose
    // `feature.invalid-args` against it.
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'query', query: selector as import('../../kernel/backends/occt/edgeQueries').EdgeQuery },
      },
    };
  }
  // Empty or non-object selector — fall through to the existing default.
  return {
    key: 'edges',
    value: {
      kind: 'edge',
      featureId: baseId,
      ref: { kind: 'query', query: selector as unknown as import('../../kernel/backends/occt/edgeQueries').EdgeQuery },
    },
  };
}
