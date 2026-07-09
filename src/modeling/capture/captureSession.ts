// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
  createFeatureIdGenerator, createSurfaceIdGenerator,
  type FeatureIdGenerator, type SurfaceIdGenerator,
} from '../../shared/intent/featureId';
import type { FeatureRecord, ShapeTransform } from '../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind, FeatureRef, Param, PatternSpec, PlaneSpec, Vec3, Vec3Param } from '../../shared/intent/types';
import type {
  SurfaceRecord, SurfaceId, NurbsSurfaceData, SurfaceTrimData,
} from '../../shared/intent/surfaceRecord';
import type { RenderEnvironmentSpec } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetSpec } from '../../shared/intent/cameraTargetRecord';
import type { AnimationViewSpec } from '../../shared/intent/animationViewRecord';
import type { DfmSpec } from '../../shared/intent/dfmSpecRecord';
import { Curve3DProxy } from './curveProxy';
import { lazyEvalCurve } from '../backends/occt/curve3dEval';
import { Shape } from './proxy';
import { Sketch } from './sketch';
import { SurfaceProxy } from './surfaceProxy';
import type {
  AssemblyConnectorFrameStored,
  AssemblyConnectorRef,
  AssemblyPartOpts,
  AssemblyPartRef,
} from './assembly';
import { ParamTable, type SerializedParamTable } from '../../shared/runtime/paramTable';
import type { SoftWarning } from '../../shared/runtime/softWarning';
import { collectParamRefs } from '../../shared/runtime/resolveParams';
import type { Editable } from '../../shared/runtime/paramRef';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { KernelError } from '../../shared/intent/kernelError';
import {
  buildAnimationViewFeatureSpec,
  buildCameraTargetFeatureSpec,
  buildReferenceImageFeatureSpec,
  buildRenderEnvironmentFeatureSpec,
  type ReferenceImageCaptureArgs,
} from './virtualFeatureRecords';
import {
  buildCurve3DFeatureSpec,
  buildDfmSpecFeatureSpec,
  buildEmbossTextFeatureSpec,
  buildProjectCurveFeatureSpec,
  type Curve3DCaptureArgs,
  type EmbossTextCaptureArgs,
  type ProjectCurveCaptureArgs,
} from './authoringFeatureRecords';
import {
  buildCoonsPatchSurfaceRecord,
  buildVariableSweepFeatureSpec,
  isCurve3DMetadataLite,
  type SurfaceFromBoundaryCaptureArgs,
  type VariableSweepCaptureArgs,
} from './surfaceSweepRecords';
import {
  createAssemblyConnectCaptureSpec,
  createAssemblyExportCaptureSpec,
  createAssemblyJointCaptureSpec,
  createAssemblyModelCaptureSpec,
  createAssemblyPartCaptureSpec,
  createSolvedAssemblyCaptureSpec,
} from './assemblyCaptureValidation';
import {
  type SolvedAssemblyMateMetadata,
} from './assemblyFeatureRecords';
import {
  createBendFeatureCaptureSpec,
  createDraftFeatureCaptureSpec,
  createScalarEdgeFeatureCaptureSpec,
  createVariableEdgeFeatureCaptureSpec,
} from './shapeOperationCaptureValidation';
import {
  buildFaceInputRef,
  type ShapeOperationEdgeSelector,
  type ShapeOperationFaceSelector,
} from './shapeOperationFeatureRecords';

export type { EncodedMateRecord, SolvedAssemblyMateMetadata } from './assemblyFeatureRecords';

export { validateFaceLabels } from './faceLabels';
export { buildFaceInputRef } from './shapeOperationFeatureRecords';

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
  addSurfaceFromBoundary(args: SurfaceFromBoundaryCaptureArgs): SurfaceProxy {
    const id = this.surfaceIdGen.next();
    const record = buildCoonsPatchSurfaceRecord(id, args, {
      getCurveMetadata: (curveId) => {
        const rec = this.records.find((r) => r.id === curveId);
        if (!rec || rec.kind !== 'curve3d') return undefined;
        const metadata = (rec.metadata as { curve3d?: unknown } | undefined)?.curve3d;
        return isCurve3DMetadataLite(metadata) ? metadata : undefined;
      },
      evaluateCurveEndpoints: (curveId, metadata) => {
        const ev = lazyEvalCurve(this, curveId, metadata);
        return { start: ev.pointAt(0), end: ev.pointAt(1) };
      },
    });
    this.surfaceRecords.push(record);
    return new SurfaceProxy(id, this);
  }

  getSurfaceRecord(id: SurfaceId): SurfaceRecord | undefined {
    return this.surfaceRecords.find(s => s.id === id);
  }

  /** Capture a surface trim or split record. Returns a new SurfaceProxy whose
   *  lowerer (Task 3) runs BRepAlgoAPI_Section against `byRef` at build time. */
  addSurfaceTrim(surfaceId: SurfaceId, byRef: SurfaceTrimData['byRef'], op: 'trim' | 'split', piece?: 0 | 1): SurfaceProxy {
    const id = this.surfaceIdGen.next();
    const data: SurfaceTrimData = {
      kind: 'surfaceTrim',
      surfaceId,
      byRef,
      op,
      ...(piece !== undefined ? { piece } : {}),
    };
    this.surfaceRecords.push({ id, kind: 'surfaceTrim', params: {}, data });
    return new SurfaceProxy(id, this);
  }

  /**
   * Capture a reference-image overlay node. Validates format, path existence,
   * and plane. Pushes structured diagnostics to `metadata.diagnostics` instead
   * of throwing — the record is always produced so agents can inspect errors.
   *
   * Returns the assigned `FeatureId` (the caller in `api.ts` wraps it as a
   * `ReferenceImageHandle`).
   */
  addReferenceImage(args: ReferenceImageCaptureArgs): FeatureId {
    const r = this.register(buildReferenceImageFeatureSpec(args, this.scriptDir));
    return r.id;
  }

  /**
   * Capture a render-environment (HDRI/IBL) virtual feature. Validates that
   * exactly one of `preset` or `url` is given, that preset keys are known,
   * and that intensity is in (0, 100]. Multiple calls register multiple
   * records — the renderer applies the last one.
   */
  addRenderEnvironment(args: RenderEnvironmentSpec): FeatureId {
    const r = this.register(buildRenderEnvironmentFeatureSpec(args));
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
    const r = this.register(buildCameraTargetFeatureSpec(args));
    return r.id;
  }

  /**
   * Capture an animation-view virtual feature (legacy sweep form OR the
   * keyframe-track form; see `AnimationViewSpec`). Metadata is ALWAYS stored
   * in the normalized track shape (`AnimationViewMetadata`).
   *
   * Validation mechanics:
   *   - New `animation.*` error conditions THROW `KernelError` — the
   *     `addDfmSpec` precedent. Stashed virtual-record diagnostics never
   *     reach evaluate (recomputeEngine marks virtual records healthy and
   *     skips them), so a malformed animation timeline would otherwise
   *     silently produce a broken or empty capture.
   *       - `animation.param.unknown` — a track (or the legacy `param`)
   *         names a param not declared by a prior `param()` call, or one
   *         declared with a non-numeric type (tracks interpolate numbers).
   *       - `animation.track.duplicate-param` — two tracks target the same
   *         param.
   *       - `animation.keys.invalid` — empty tracks array, empty key list,
   *         non-finite atMs/value, negative atMs, duplicate atMs within a
   *         track, or unknown ease.
   *   - Warns are stashed on `metadata.diagnostics` with a default-safe
   *     record still produced (the `addCameraTarget` pattern):
   *       - `animation.value.clamped` — a key value outside the param's
   *         declared min/max range is clamped to the range.
   *       - `animation.view.shadowed` — an earlier animationView record is
   *         shadowed by this one (last-wins).
   *       - invalid `fps` defaults to 30 (`feature.invalid-args` warn).
   *   - The LEGACY sweep form keeps its historic stash-on-metadata behavior
   *     for malformed param / from / to / durationMs (`feature.invalid-args`
   *     error diagnostics + default-safe record).
   *
   * Multiple calls register multiple records — the capture script picks
   * the last one when more than one is declared.
   */
  addAnimationView(args: AnimationViewSpec): FeatureId {
    const shadowedIds = this.records.filter((r) => r.kind === 'animationView').map((r) => r.id);
    const r = this.register(buildAnimationViewFeatureSpec(args, {
      paramTable: this.paramTable,
      shadowedIds,
    }));
    return r.id;
  }

  /**
   * Capture a dfmSpec (print-prep gate declaration) virtual feature.
   *
   * Validation THROWS `KernelError` — a deliberate deviation from the
   * addRenderEnvironment / addCameraTarget stash-on-metadata pattern:
   * stashed virtual-record `metadata.diagnostics` never reach evaluate
   * (recomputeEngine marks virtual records healthy and skips them), so a
   * malformed dfmSpec would silently disable the enforcement gate it
   * declares. Failing the build is the agent-friendly behavior here.
   *
   * Multiple calls register multiple records; the check engine applies the
   * last one (same convention as setRenderEnvironment).
   */
  addDfmSpec(args: DfmSpec): FeatureId {
    const r = this.register(buildDfmSpecFeatureSpec(args));
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
  addCurve3D(args: Curve3DCaptureArgs): Curve3DProxy {
    const record = this.register(buildCurve3DFeatureSpec(args));
    return new Curve3DProxy(record.id, args.metadata, this);
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
  addVariableSweep(args: VariableSweepCaptureArgs): FeatureId {
    const record = this.register(buildVariableSweepFeatureSpec(args));
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
    args: EmbossTextCaptureArgs & { face: import('./proxy').FaceSelector | string },
  ): FeatureId {
    const faceInputRef = buildFaceInputRef(parentFeatureId, args.face);
    const r = this.register(buildEmbossTextFeatureSpec(parentFeatureId, args, faceInputRef));
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
    args: ProjectCurveCaptureArgs & { face: import('./proxy').FaceSelector | string },
  ): FeatureId {
    const faceInputRef = buildFaceInputRef(parentFeatureId, args.face);
    const r = this.register(buildProjectCurveFeatureSpec(parentFeatureId, args, faceInputRef));
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
    return this.register(createAssemblyPartCaptureSpec(this.records, assemblyName, partName, shape.id, opts));
  }

  assemblyConnect(
    assemblyName: string,
    connectName: string,
    a: AssemblyConnectorRef,
    b: AssemblyConnectorRef,
  ): FeatureRecord {
    return this.register(createAssemblyConnectCaptureSpec(this.records, assemblyName, connectName, a, b));
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
    return this.register(createAssemblyJointCaptureSpec(this.records, assemblyName, jointName, jointKind, a, b, opts));
  }

  assemblyModel(
    assemblyName: string,
    parts: readonly AssemblyPartRef[],
    mateMetadata?: SolvedAssemblyMateMetadata,
  ): Shape {
    return this.createShape(createAssemblyModelCaptureSpec(this.records, assemblyName, parts, mateMetadata));
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
    return this.createShape(createSolvedAssemblyCaptureSpec({
      records: this.records,
      assemblyName,
      parts,
      joints,
      poses,
      mateMetadata,
    }));
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
    return this.createShape(createAssemblyExportCaptureSpec(this.records, sceneFeatureId, op));
  }

  edgeFeature(
    kind: 'fillet' | 'chamfer' | 'shell',
    base: Shape,
    valueParamName: 'radius' | 'distance' | 'thickness',
    value: Editable<number>,
    selector?: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
    opts?: { continuity?: import('../../shared/intent/filletContinuityRecord').FilletContinuity },
  ): Shape {
    return this.createShape(createScalarEdgeFeatureCaptureSpec(
      this.records,
      kind,
      base.id,
      valueParamName,
      value,
      selector as ShapeOperationEdgeSelector,
      opts,
    ));
  }

  /**
   * Variable-radius / variable-distance edge feature (rc.11).
   * Each group's `edges` becomes a FeatureRef under `inputs.edge_group_${i}`;
   * the `radius` (or `distance`) is stored in `metadata.groups[i]`. The lowerer
   * resolves each group's edges via `pickEdges`-style dispatch and builds a
   * Replicad function-form RadiusConfig.
   */
  /** W2.2: capture a sheet-metal bend FeatureRecord with the same
   *  selector-handling as `.fillet()` / `.chamfer()`. The lowerer validates
   *  the bend root + edge linearity; this capture method does no edge
   *  resolution. */
  bendFeature(
    base: Shape,
    angleParam: Param,
    radiusParam: Param,
    selector: import('./proxy').EdgeSelector | { face: import('./proxy').FaceSelector | string },
  ): Shape {
    return this.createShape(createBendFeatureCaptureSpec(
      this.records,
      base.id,
      angleParam,
      radiusParam,
      selector as ShapeOperationEdgeSelector,
    ));
  }

  /**
   * Slice E Task 6: capture a `kind: 'draft'` FeatureRecord.
   * The shape-operation record builder owns selector serialization and
   * metadata defaults; this method only enforces session ownership.
   */
  draftFeature(
    base: Shape,
    angleDeg: Editable<number>,
    opts: {
      face: import('./proxy').FaceSelector | string;
      neutralPlane?: string;
      pullDir?: [number, number, number];
    },
  ): Shape {
    return this.createShape(createDraftFeatureCaptureSpec(
      this.records,
      base.id,
      angleDeg,
      opts as {
        face: ShapeOperationFaceSelector | string;
        neutralPlane?: string;
        pullDir?: [number, number, number];
      },
    ));
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
    return this.createShape(createVariableEdgeFeatureCaptureSpec(
      this.records,
      kind,
      base.id,
      valueKey,
      groups as Array<{
        edges: ShapeOperationEdgeSelector;
        radius?: Editable<number>;
        distance?: Editable<number>;
      }>,
    ));
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
