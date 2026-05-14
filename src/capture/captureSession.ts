import { createFeatureIdGenerator, type FeatureIdGenerator } from '../intent/featureId';
import type { FeatureRecord, ShapeTransform } from '../intent/featureRecord';
import type { FeatureId, FeatureKind, FeatureRef, Param, PatternSpec, PlaneSpec, Vec3, Vec3Param } from '../intent/types';
import { Shape } from './proxy';
import { Sketch } from './sketch';
import type {
  AssemblyConnectorFrameStored,
  AssemblyConnectorRef,
  AssemblyPartOpts,
  AssemblyPartRef,
} from './assembly';
import { EDGE_QUERY_KEYS as EDGE_QUERY_KEYS_ARR } from '../intent/queryKeys';
import { ParamTable, type SerializedParamTable } from '../runtime/paramTable';
import type { SoftWarning } from '../runtime/softWarning';
import { collectParamRefs } from '../runtime/resolveParams';
import { toParam } from '../runtime/editableHelpers';
import type { Editable } from '../runtime/paramRef';
import type { ShapeBackend } from '../backends/backend';
import { KernelError } from '../intent/kernelError';
import type { Connector } from '../lib/mates/connector';
import type { MateCouplingRecord } from '../lib/mates/coupledPoses';
import type { MateType } from '../lib/mates/mateTypes';

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
 *  triple for ball. */
export interface EncodedMateRecord {
  readonly name: string;
  readonly a: string;
  readonly b: string;
  readonly type: MateType;
  readonly pose?:
    | { kind: 'scalar'; value: Param }
    | { kind: 'ball'; value: [Param, Param, Param] };
}

export { validateFaceLabels } from './faceLabels';

/** Build an `inputs.face` FeatureRef from a FaceSelector. Mirrors the
 *  face-handling branches of `buildEdgeFeatureRef` but specialized to
 *  callers (hole/holes/cutout) that always want a face ref, never an
 *  edges ref. */
export function buildFaceInputRef(
  baseId: import('../intent/types').FeatureId,
  face: import('./proxy').FaceSelector | string,
): FeatureRef {
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
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'query', query: faceVal as import('../backends/occt/edgeQueries').FaceQuery },
    };
  }
  // Bare FaceQuery object (no { face: ... } wrapper)
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'query', query: face as import('../backends/occt/edgeQueries').FaceQuery },
  };
}

export interface FeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
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
  /** v0.5: pre-lowered geometry for `lib.fromSTEP(...)` imports. The host-
   *  side import runs at script time; the lowerer pulls the OcctBackend
   *  from this map by feature id when it sees an `importedStep` record.
   *  Lives on the session (not the record) because OCCT shapes carry
   *  circular references that would trip metadata walkers. */
  readonly importedGeometry: Map<string, ShapeBackend> = new Map();
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

  assemblyModel(assemblyName: string, parts: readonly AssemblyPartRef[]): Shape {
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

    return this.createShape({
      kind,
      params: { [valueParamName]: toParam(value, 'mm') },
      inputs,
    });
  }

  /**
   * Variable-radius / variable-distance edge feature (rc.11).
   * Each group's `edges` becomes a FeatureRef under `inputs.edge_group_${i}`;
   * the `radius` (or `distance`) is stored in `metadata.groups[i]`. The lowerer
   * resolves each group's edges via `pickEdges`-style dispatch and builds a
   * Replicad function-form RadiusConfig.
   */
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
    list: (): import('../runtime/paramTable').ParamEntry[] => this.paramTable.list(),

    update: async (edits: ParamUpdateEdit[]): Promise<ParamUpdateResult> => this.runParamUpdate(edits),
  };

  /** Compatibility facade for `params.update`. Recompute orchestration lives
   *  in `src/kernel/buildModel.ts` so CLI, MCP, and direct session updates
   *  share the same cache/warning/tail-shape policy. */
  private async runParamUpdate(edits: ParamUpdateEdit[]): Promise<ParamUpdateResult> {
    const { updateModelParams } = await import('../kernel/buildModel');
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
  // Case 1-3: { face: ... } wrapper. We detect this by: object with `face`
  // property and NOT having the EdgeSegment full-schema markers.
  if (typeof selector === 'object' && selector !== null && 'face' in selector &&
      !('id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector)) {
    const faceVal = (selector as { face: unknown }).face;
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
        ref: { kind: 'query', query: faceVal as import('../backends/occt/edgeQueries').FaceQuery },
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
          ref: { kind: 'query', query: selector as import('../backends/occt/edgeQueries').EdgeQuery },
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
        ref: { kind: 'query', query: selector as import('../backends/occt/edgeQueries').EdgeQuery },
      },
    };
  }
  // Empty or non-object selector — fall through to the existing default.
  return {
    key: 'edges',
    value: {
      kind: 'edge',
      featureId: baseId,
      ref: { kind: 'query', query: selector as unknown as import('../backends/occt/edgeQueries').EdgeQuery },
    },
  };
}
