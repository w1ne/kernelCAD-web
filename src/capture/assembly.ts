import { lookupSourceColor } from '../backends/occt/lookupSourceColor';
import { KernelError } from '../intent/kernelError';
import { Scene, type ScenePart } from '../intent/scene';
import type { EditableVec3, FeatureId, Param, Unit, Vec3, Vec3Param } from '../intent/types';
import { formatScalarForError, isValidEditableVec3, isValidVec3 } from '../intent/types';
import {
  makeConnector,
  type Connector,
  type ConnectorOrigin,
  type ConnectorType,
} from '../lib/mates/connector';
import { parseConnectorRef, type MatePose, type MateRecord } from '../lib/mates/mate';
import { isCompatiblePair, type MateType } from '../lib/mates/mateTypes';
import { solveMates } from '../lib/mates/solver';
import { validateAssemblyWithMates, type ValidatorDiagnostic } from '../lib/mates/validator';
import { currentValue, toVec3Param } from '../runtime/editableHelpers';
import { isParamRef, paramExprToDebugString, type Editable, type ParamRefExpr } from '../runtime/paramRef';
import { Transform } from '../runtime/se3';
import type { CaptureSession } from './captureSession';
import { forwardKinematics, type NumericPoses } from './forwardKinematics';
import { Shape } from './proxy';

/**
 * Public pose surface for `Assembly.solve(poses)` and (Tasks 3-5)
 * `Assembly.solvedModel(poses)`. Per-joint values may be number literals
 * or ParamRefs (or, for ball joints, a per-axis tuple mixing both).
 *
 * - revolute, prismatic: `Editable<number>` (degrees / mm)
 * - ball: `[Editable<number>, Editable<number>, Editable<number>]`
 *   (XYZ Euler degrees, extrinsic — same as the numeric path)
 * - fixed: NO pose accepted (validated; throws if listed)
 *
 * For `solve` the ParamRefs are resolved at call time (snapshot
 * semantics — same role as `.boundingBox()` / `.measureArea()`).
 * `solvedModel` captures the symbolic refs so studio-driven param edits
 * re-pose the rendered scene reactively (Tasks 3-5).
 */
export type EditableScalarPose = Editable<number>;
export type EditableBallPose = [Editable<number>, Editable<number>, Editable<number>];
export type PoseValue = EditableScalarPose | EditableBallPose;
export type Poses = Record<string, PoseValue>;

/**
 * Options for the v0.6 mate-style `partRef.connector(name, opts)` chain
 * method. Distinct from `AssemblyConnectorFrame` (the legacy v0.5 kinematic
 * connector shape used by `assembly.part({ connectors })` + `opts.connect`):
 * carries a `type` tag (frame/axis/planar/ball) and a structured
 * `ConnectorOrigin` that may be either a numeric Vec3 or a topology query.
 * Resolved into the `ScenePart.connectors[]` returned by `Assembly.model()` /
 * `Assembly.solvedModel()`.
 */
export interface AssemblyConnectorOpts {
  type: ConnectorType;
  origin: ConnectorOrigin;
  axis?: Vec3;
  normal?: Vec3;
}

export interface AssemblyPartRef {
  id: FeatureId;
  name: string;
  assemblyName: string;
  at: Vec3Param;
  connectors: Record<string, AssemblyConnectorFrameStored>;
  /** Mate-style connectors registered via the 2-arg `connector(name, opts)`
   *  chain (v0.6 Task 4). Mutated in place by the chain method so the array
   *  is shared with the assembly's stored record and visible to
   *  `Assembly.model()` / `Assembly.solvedModel()`. */
  mateConnectors: Connector[];
  /** Look up a v0.5 kinematic connector by name (declared via
   *  `assembly.part(..., { connectors })`) — returns an `AssemblyConnectorRef`
   *  for use in `opts.connect`. */
  connector(name: string): AssemblyConnectorRef;
  /** Register a v0.6 mate-style connector on this part and return the
   *  part-ref for chaining. Throws `assembly.connector.duplicate-name` if a
   *  connector with the same name is already registered on this part. */
  connector(name: string, opts: AssemblyConnectorOpts): AssemblyPartRef;
}

export interface AssemblyJointRef {
  id: FeatureId;
  name: string;
  kind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
}

export interface AssemblyPartOpts {
  at?: EditableVec3;
  connectors?: Record<string, AssemblyConnectorFrame>;
  connect?: {
    connector: string;
    to: AssemblyConnectorRef;
    name?: string;
  };
}

/** Script-facing input: each coord may be a number or ParamRef<number>. */
export interface AssemblyConnectorFrame {
  origin: EditableVec3;
  axis?: EditableVec3;
}

/** Intent-side normalized shape after toVec3Param. */
export interface AssemblyConnectorFrameStored {
  origin: Vec3Param;
  axis?: Vec3Param;
}

export interface AssemblyConnectorRef {
  assemblyName: string;
  partId: FeatureId;
  partName: string;
  connector: string;
  origin: Vec3Param;
  worldOrigin: Vec3Param;
  axis?: Vec3Param;
}

export interface AssemblyConnectRef {
  id: FeatureId;
  name: string;
  kind: 'fixed';
}

export interface RevoluteJointOpts {
  axis: Vec3;
  origin: Vec3;
  limitsDeg?: [number, number];
}

export interface PrismaticJointOpts {
  axis: Vec3;
  origin: Vec3;
  limitsMm?: [number, number];
}

export interface FixedJointOpts {
  origin?: Vec3;
}

export interface BallJointOpts {
  origin: Vec3;
  limitsDeg?: [[number, number], [number, number], [number, number]];
}

/**
 * Internal joint storage. Discriminated by `kind`. solve() walks these
 * by childPartId to find the parent joint of a part, and by parentPartId
 * to find children.
 */
export interface AssemblyJointStored {
  readonly id: FeatureId;
  readonly name: string;
  readonly kind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
  readonly parentPartId: FeatureId;
  readonly childPartId: FeatureId;
  readonly axis?: Vec3;                             // revolute, prismatic
  readonly origin: Vec3;                            // all (default [0,0,0] for fixed)
  readonly limitsDeg?: [number, number];            // revolute
  readonly limitsMm?: [number, number];             // prismatic
  readonly ballLimitsDeg?: [[number, number], [number, number], [number, number]]; // ball
}

/**
 * Internal part storage. Extends the public AssemblyPartRef with refs
 * solve() needs:
 * - originalShape: the Shape captured by box() etc., for solve() to
 *   transform via Shape.transform(t).
 * - connectParentId: when a part was placed via `connect: { to }`, the
 *   parent part's id. Used by solve() to walk through fixed connect
 *   chains for joint inheritance.
 *
 * `at` (zero-pose translation) already lives on AssemblyPartRef.
 */
export interface AssemblyPartStored extends AssemblyPartRef {
  readonly originalShape: Shape;
  readonly connectParentId?: FeatureId;
}

export class Assembly {
  readonly name: string;
  private readonly session: CaptureSession;
  private readonly parts: AssemblyPartStored[] = [];
  private readonly joints: AssemblyJointStored[] = [];
  /** v0.6 Task 5: mate records declared via `arm.mate(name, aRef, bRef, type)`.
   *  Surfaced on `Scene.mates` returned by `model()` / `solvedModel()`. */
  private readonly mates: MateRecord[] = [];

  constructor(name: string, session: CaptureSession) {
    this.name = name;
    this.session = session;
  }

  part(name: string, shape: Shape, opts: AssemblyPartOpts = {}): AssemblyPartRef {
    if (opts.at !== undefined && !isValidEditableVec3(opts.at)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly part placement must be a finite Vec3; got ${formatScalarForError(opts.at)}.`,
        shape.id,
        'Pass at: [x, y, z], or omit it; coords may be number or ParamRef.',
      );
    }
    const connectors = normalizeConnectors(name, shape.id, opts.connectors);
    const at = resolvePartPlacement(this.name, name, shape.id, opts.at, connectors, opts.connect);
    const record = this.session.assemblyPart(this.name, name, shape, { at, connectors, placedBy: opts.connect });
    // Shared mutable array: the part-ref's `.connector(name, opts)` chain
    // method pushes into this array, and the `AssemblyPartStored` record
    // below references the same array via spread (arrays are by-reference),
    // so `makeScene` sees additions made after `part(...)` returns.
    const mateConnectors: Connector[] = [];
    const part = makePartRef(this.name, record.id, name, at, connectors, mateConnectors);
    const stored: AssemblyPartStored = {
      ...part,
      originalShape: shape,
      ...(opts.connect !== undefined ? { connectParentId: opts.connect.to.partId } : {}),
    };
    this.parts.push(stored);
    if (opts.connect) {
      this.session.assemblyConnect(
        this.name,
        opts.connect.name ?? `${opts.connect.to.partName}.${opts.connect.to.connector}-${name}.${opts.connect.connector}`,
        opts.connect.to,
        part.connector(opts.connect.connector),
      );
    }
    return part;
  }

  revolute(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: RevoluteJointOpts): AssemblyJointRef {
    if (!isValidVec3(opts.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`,
        undefined,
        'Pass axis: [x, y, z].',
      );
    }
    if (!isValidVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z] in the parent part local frame.',
      );
    }
    if (opts.limitsDeg !== undefined && !isValidJointLimits(opts.limitsDeg)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint limitsDeg must be [minDeg, maxDeg] finite numbers with min < max; got ${formatScalarForError(opts.limitsDeg)}.`,
        undefined,
        'Pass limitsDeg: [minDeg, maxDeg], or omit it.',
      );
    }
    const record = this.session.assemblyJoint(this.name, name, 'revolute', a, b, {
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
    });
    this.joints.push({
      id: record.id,
      name,
      kind: 'revolute',
      parentPartId: a.id,
      childPartId: b.id,
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
    });
    return { id: record.id, name, kind: 'revolute' };
  }

  prismatic(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: PrismaticJointOpts): AssemblyJointRef {
    if (!isValidVec3(opts.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `prismatic joint axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`,
        undefined,
        'Pass axis: [x, y, z].',
      );
    }
    if (!isValidVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `prismatic joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z] in the parent part local frame.',
      );
    }
    if (opts.limitsMm !== undefined && !isValidJointLimits(opts.limitsMm)) {
      throw new KernelError(
        'feature.invalid-args',
        `prismatic joint limitsMm must be [minMm, maxMm] finite numbers with min < max; got ${formatScalarForError(opts.limitsMm)}.`,
        undefined,
        'Pass limitsMm: [minMm, maxMm], or omit it.',
      );
    }
    const record = this.session.assemblyJoint(this.name, name, 'prismatic', a, b, {
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
    });
    this.joints.push({
      id: record.id,
      name,
      kind: 'prismatic',
      parentPartId: a.id,
      childPartId: b.id,
      axis: opts.axis,
      origin: opts.origin,
      ...(opts.limitsMm !== undefined ? { limitsMm: opts.limitsMm } : {}),
    });
    return { id: record.id, name, kind: 'prismatic' };
  }

  fixed(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: FixedJointOpts = {}): AssemblyJointRef {
    const origin: Vec3 = opts.origin ?? [0, 0, 0];
    if (!isValidVec3(origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `fixed joint origin must be a finite Vec3 or omitted; got ${formatScalarForError(origin)}.`,
        undefined,
        'Pass origin: [x, y, z] or omit it.',
      );
    }
    const record = this.session.assemblyJoint(this.name, name, 'fixed', a, b, { origin });
    this.joints.push({
      id: record.id,
      name,
      kind: 'fixed',
      parentPartId: a.id,
      childPartId: b.id,
      origin,
    });
    return { id: record.id, name, kind: 'fixed' };
  }

  ball(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: BallJointOpts): AssemblyJointRef {
    if (!isValidVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `ball joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z] in the parent part local frame.',
      );
    }
    if (opts.limitsDeg !== undefined) {
      for (let i = 0; i < 3; i++) {
        const pair = opts.limitsDeg[i];
        if (!isValidJointLimits(pair)) {
          throw new KernelError(
            'feature.invalid-args',
            `ball joint limitsDeg[${i}] must be [minDeg, maxDeg] finite numbers with min < max; got ${formatScalarForError(pair)}.`,
            undefined,
            'Pass limitsDeg: [[xMin,xMax], [yMin,yMax], [zMin,zMax]] in XYZ Euler order, or omit it.',
          );
        }
      }
    }
    const record = this.session.assemblyJoint(this.name, name, 'ball', a, b, {
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { ballLimitsDeg: opts.limitsDeg } : {}),
    });
    this.joints.push({
      id: record.id,
      name,
      kind: 'ball',
      parentPartId: a.id,
      childPartId: b.id,
      origin: opts.origin,
      ...(opts.limitsDeg !== undefined ? { ballLimitsDeg: opts.limitsDeg } : {}),
    });
    return { id: record.id, name, kind: 'ball' };
  }

  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
    validateConnectorAssembly(this.name, a);
    validateConnectorAssembly(this.name, b);
    const record = this.session.assemblyConnect(this.name, name, a, b);
    return { id: record.id, name, kind: 'fixed' };
  }

  /**
   * Record a typed mate between two named connectors. Refs are
   * `"<partName>.<connectorName>"` strings naming v0.6 mate-style connectors
   * declared via `partRef.connector(name, opts)`. Compatibility between the
   * mate type and the two connector types is validated at capture time
   * (build123d-style early error), so authoring scripts surface bad pairs
   * immediately instead of at solve / lower time.
   *
   * Optional `opts.pose` articulates the mate's joint frame at solve time.
   * Per-type shape:
   *   - revolute / prismatic / cylindrical / pin_slot: `Editable<number>`
   *     (degrees / mm; cylindrical & pin_slot treat the scalar as rotation
   *     degrees and zero the secondary translation — v0.6 single-DOF surface).
   *   - ball: `[Editable<number>, Editable<number>, Editable<number>]` (XYZ
   *     Euler degrees, extrinsic — same shape as the v0.5 ball-joint pose).
   *   - fastened / planar: pose is rejected at capture time (zero
   *     articulation DOF on the v0.6 surface).
   *
   * Errors:
   *   - ref malformed (no dot, empty side)   → assembly.mate.connector-not-found
   *   - unknown part name                    → assembly.mate.connector-not-found
   *   - unknown connector on the part        → assembly.mate.connector-not-found
   *   - mate / connector-pair mismatch       → assembly.mate.type-mismatch
   *   - pose on fastened / planar            → assembly.mate-pose-on-zero-dof-mate
   *
   * The mate record itself is surfaced on `Scene.mates` returned by
   * `Assembly.model()` / `Assembly.solvedModel()`. Pose-driven articulation
   * is honored by the v0.6 Pattern A FK in `solveMates(arm, poses?)` and
   * piped into `Scene.parts[].worldTransform` by `Assembly.solvedModel`.
   */
  mate(
    name: string,
    aRef: string,
    bRef: string,
    type: MateType,
    opts?: { pose?: MatePose },
  ): this {
    const a = this.resolveMateConnector(aRef);
    const b = this.resolveMateConnector(bRef);
    if (!isCompatiblePair(type, a.connector.type, b.connector.type)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.type-mismatch: mate '${name}' type '${type}' is not compatible with the connector pair (${aRef}:${a.connector.type}, ${bRef}:${b.connector.type}).`,
        undefined,
        `invalid-args.assembly.mate-type-mismatch — '${type}' mates require a specific connector-type pair; see the mate-type compatibility table in mateTypes.ts.`,
      );
    }
    if (opts?.pose !== undefined && (type === 'fastened' || type === 'planar')) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.pose-on-zero-dof-mate: mate '${name}' is type '${type}' and accepts no pose; remove opts.pose.`,
        undefined,
        `invalid-args.assembly.mate-pose-on-zero-dof-mate — '${type}' mates have no articulation DOF; drop opts.pose or change the mate type.`,
      );
    }
    this.mates.push({
      name,
      a: aRef,
      b: bRef,
      type,
      ...(opts?.pose !== undefined ? { pose: opts.pose } : {}),
    });
    return this;
  }

  /** Resolve `"<partName>.<connectorName>"` to its part + connector. Throws
   *  `assembly.mate.connector-not-found` on malformed ref, unknown part, or
   *  unknown connector. Internal — keeps the diagnostic hint colocated with
   *  `mate()` so callers don't need to interpret the `parseConnectorRef`
   *  Error subclass. */
  private resolveMateConnector(ref: string): { part: AssemblyPartStored; connector: Connector } {
    let parsed: { partName: string; connectorName: string };
    try {
      parsed = parseConnectorRef(ref);
    } catch {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.connector-not-found: '${ref}' is not a 'partName.connectorName' reference.`,
        undefined,
        `invalid-args.assembly.mate-connector-not-found — pass refs of the form '<partName>.<connectorName>' where both names are declared on this assembly.`,
      );
    }
    const part = this.parts.find((p) => p.name === parsed.partName);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.connector-not-found: part '${parsed.partName}' (from ref '${ref}') is not declared on assembly '${this.name}'.`,
        undefined,
        `invalid-args.assembly.mate-connector-not-found — declare the part via arm.part('${parsed.partName}', ...) before referencing it in a mate.`,
      );
    }
    const connector = part.mateConnectors.find((c) => c.name === parsed.connectorName);
    if (!connector) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.connector-not-found: connector '${parsed.connectorName}' is not declared on part '${parsed.partName}' (ref '${ref}').`,
        part.id,
        `invalid-args.assembly.mate-connector-not-found — register the connector via partRef.connector('${parsed.connectorName}', { type, origin, ... }) before referencing it in a mate.`,
      );
    }
    return { part, connector };
  }

  /**
   * Internal accessor — read-only view of the registered parts for the v0.6
   * mate solver (`src/lib/mates/solver.ts`). Underscore-prefixed: not part of
   * the agent-facing surface. Mirrors `Scene.__sourceFeatureId` convention.
   */
  __parts(): readonly AssemblyPartStored[] {
    return this.parts;
  }

  /**
   * Internal accessor — read-only view of declared mate records for the v0.6
   * mate solver. Surfaces the same `MateRecord[]` already exposed via
   * `Scene.mates`, but without forcing a `makeScene` round-trip. Not public.
   */
  __mates(): readonly MateRecord[] {
    return this.mates;
  }

  /**
   * Internal accessor — read-only view of declared v0.5 joints for the v0.6
   * mate-aware validator (`./lib/mates/validator.ts:validateAssemblyWithMates`).
   * Mirrors `__parts()` / `__mates()`. Not public; agents that need joint
   * metadata should read it off `Scene` via `model()` / `solvedModel()`.
   */
  __joints(): readonly AssemblyJointStored[] {
    return this.joints;
  }

  /**
   * Internal accessor — returns the underlying `CaptureSession` so the v0.6
   * mate-aware validator can call the existing v0.5 `validateAssembly(input)`
   * with the session's `FeatureRecord[]` (filtered by this assembly's name).
   * Not public; the agent-facing surface is `Assembly.model()` /
   * `Assembly.solvedModel()`, both of which already close over the session.
   */
  __session(): CaptureSession {
    return this.session;
  }

  /**
   * Build a SolvedKinematics for the supplied joint poses. Walks the
   * body-tree (parts as nodes, joints as edges) computing per-part world
   * transforms via SE(3) composition. Each part has at most one parent
   * joint; multi-joint chains compose correctly because outer-joint
   * rotations are baked into the parent's worldT before the inner joint
   * applies.
   *
   * Pose value type per joint kind:
   *   - revolute, prismatic: number (degrees / mm)
   *   - ball: [number, number, number] (XYZ Euler degrees, extrinsic)
   *   - fixed: NO pose accepted (throws if listed in poses)
   *
   * Joints not listed in poses default to 0 / [0,0,0]. Unknown joint names
   * raise feature.invalid-args. Validation runs before any FK math:
   *   - Pose values are finite + correct shape per joint kind.
   *   - Each part has at most one parent joint (no diamond / closed-chain).
   *   - Joint graph is acyclic (DFS detect).
   *
   * Side effect: applies the per-part SE(3) transform to each part's
   * `originalShape` via `Shape.transform(t)`. Calling solve() twice on the
   * same Assembly compounds transforms; build a fresh assembly per query.
   */
  solve(poses: Poses): SolvedKinematics {
    // 1. Validate joint names supplied in poses.
    for (const name of Object.keys(poses)) {
      if (!this.joints.find(j => j.name === name)) {
        const known = this.joints.map(j => j.name);
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: unknown joint '${name}'. Defined joints: ${known.length === 0 ? '(none)' : known.join(', ')}.`,
          undefined,
          'invalid-args.solve.unknown-joint — pass only joint names declared via assembly.revolute/prismatic/fixed/ball.',
        );
      }
    }

    // 2. Validate pose value shapes per joint kind, then resolve any ParamRef
    //    coords to concrete numbers using the session's current ParamTable
    //    (snapshot semantics — see header on `Poses`). Validation runs against
    //    the resolved numeric pose so non-finite ParamRef values surface the
    //    same hint as bad numeric poses.
    const numericPoses: NumericPoses = {};
    for (const j of this.joints) {
      const v = poses[j.name];
      if (v === undefined) continue;
      if (j.kind === 'fixed') {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: joint '${j.name}' is fixed and accepts no pose; remove it from poses.`,
          undefined,
          'invalid-args.solve.fixed-pose — fixed joints have no DOF.',
        );
      }
      if (j.kind === 'ball') {
        if (!Array.isArray(v) || v.length !== 3) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solve ball joint '${j.name}' pose must be [eulerXDeg, eulerYDeg, eulerZDeg]; got ${formatScalarForError(v)}.`,
            undefined,
            'invalid-args.solve.ball-pose — pass three finite numbers as the XYZ Euler triple.',
          );
        }
        const triple: [number, number, number] = [
          resolveScalarPose(v[0], j.name, j.kind, this.session),
          resolveScalarPose(v[1], j.name, j.kind, this.session),
          resolveScalarPose(v[2], j.name, j.kind, this.session),
        ];
        numericPoses[j.name] = triple;
      } else {
        // revolute or prismatic — single Editable<number>.
        if (Array.isArray(v)) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solve ${j.kind} joint '${j.name}' pose must be a finite number; got ${formatScalarForError(v)}.`,
            undefined,
            'invalid-args.solve.bad-pose — pass a finite number.',
          );
        }
        numericPoses[j.name] = resolveScalarPose(v, j.name, j.kind, this.session);
      }
    }

    // 3. Empty assembly is an authoring error.
    if (this.parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.solve requires at least one part.',
        undefined,
        'Call assembly.part(name, shape, opts?) before assembly.solve(poses).',
      );
    }

    // 4. Forward kinematics: pure body-tree FK (graph validation + SE(3) walk).
    //    Lives in forwardKinematics.ts so the lowerer can reach it without
    //    going through Assembly state.
    const worldT = forwardKinematics(this.parts, this.joints, numericPoses);

    // 5. Apply per-part transform to the original shape (mutates the Shape's
    //    transform stack via existing translate + rotate ShapeTransform pipes).
    for (const part of this.parts) {
      const T = worldT.get(part.id)!;
      part.originalShape.transform(T);
    }

    // 6. Build SolvedKinematics handle. Hand it the already-resolved numeric
    //    pose record so the snapshot can never accidentally re-resolve.
    return new SolvedKinematics(this.name, this.parts, this.joints, worldT, numericPoses, this.session);
  }

  /**
   * Records a `solvedAssembly` FeatureRecord that captures the parts,
   * joints, and per-joint poses (with ParamRefs preserved). The lowerer
   * resolves the poses against the live ParamTable at recompute time,
   * walks `forwardKinematics`, and emits a `SceneBackend` that carries
   * each part's local-frame shape, world transform, and color attribution
   * so studio-driven param edits re-pose the rendered scene reactively
   * without re-running the script.
   *
   * Returns a `Promise<Scene>` (multi-body view, frozen). The Promise
   * wraps the v0.6 mate-aware validator pass — the `opts.validate` gate
   * runs `validateAssemblyWithMates(this)` and either attaches
   * diagnostics to `scene.warnings` (`'warn'`, default), throws on the
   * first error-severity diagnostic (`'error'`), or skips validation
   * (`'off'`). The default flips to `'error'` when
   * `KERNELCAD_VALIDATE_DEFAULT=error` is set in the environment (T10
   * wires this from `kernelcad evaluate`).
   *
   * Capture-time pose validation (unknown joint, ball-vs-scalar pose
   * shape) throws SYNCHRONOUSLY from this method — the validator gate
   * runs only after the upstream `solvedAssembly` feature has been
   * recorded, so callers using `expect(() => arm.solvedModel(...)).toThrow`
   * for pose errors keep working without rewriting to `.rejects.toThrow`.
   *
   * Use `Scene.toCompound()` for a TopoDS_Compound (lossless) or
   * `Scene.toUnion()` for an explicit boolean fuse (lossy).
   */
  solvedModel(
    poses: Poses,
    opts?: { validate?: 'warn' | 'error' | 'off' },
  ): Promise<Scene> {
    if (this.parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.solvedModel requires at least one part.',
        undefined,
        'Call assembly.part(name, shape, opts?) before assembly.solvedModel(poses).',
      );
    }
    // Synchronous phase — must throw (not reject) so existing
    // `expect(() => arm.solvedModel(badPoses)).toThrow(...)` capture-time
    // tests continue to pass without conversion. `session.solvedAssembly`
    // is the source of `invalid-args.solvedModel.{unknown-joint,pose-shape}`.
    const sceneShape = this.session.solvedAssembly(this.name, this.parts, this.joints, poses);

    // Mode resolution: explicit opts win; otherwise read the env override
    // (T10 sets this from `kernelcad evaluate`). Default for everything else
    // is `'warn'` — never breaking, never silent.
    const envDefault = process.env.KERNELCAD_VALIDATE_DEFAULT === 'error' ? 'error' : 'warn';
    const mode: 'warn' | 'error' | 'off' = opts?.validate ?? envDefault;

    // Compute mate-driven per-part world transforms first. This is the v0.6
    // Pattern A FK output — when mates are declared the solver's transforms
    // win on the capture-time Scene (parts authored in LOCAL frames).
    // `solveMates` is a no-op when no mates are declared (empty map);
    // skipping the call avoids paying for a tree walk on v0.5 assemblies.
    const mateTransformsPromise: Promise<ReadonlyMap<string, Transform> | undefined> =
      this.mates.length > 0
        ? solveMates(this).then((r) => r.poses)
        : Promise.resolve(undefined);

    if (mode === 'off') {
      // No validation, empty warnings — Scene still gets mate-driven
      // worldTransforms so the user-visible placement matches the mate
      // graph even with validation disabled.
      return mateTransformsPromise.then((mateT) =>
        this.makeScene(sceneShape, [], mateT),
      );
    }

    return Promise.all([validateAssemblyWithMates(this), mateTransformsPromise]).then(
      ([result, mateT]) => {
        if (mode === 'error') {
          const errDiag = result.diagnostics.find((d) => d.severity === 'error');
          // Status-driven fallback: `over-constrained` / `did-not-converge`
          // always carry an error-severity diagnostic per validator.ts, so the
          // `errDiag` lookup catches them; the explicit status check below is
          // a belt-and-suspenders guarantee for the spec wording.
          if (errDiag) {
            throw new KernelError(
              'feature.invalid-args',
              errDiag.message,
              undefined,
              errDiag.hint,
            );
          }
          if (result.status === 'over-constrained' || result.status === 'did-not-converge') {
            throw new KernelError(
              'feature.invalid-args',
              `assembly.solvedModel: validator reported status '${result.status}' for assembly '${this.name}'.`,
              undefined,
              `invalid-args.assembly.${result.status} — inspect arm via validateAssemblyWithMates(arm) for the per-mate diagnostic chain.`,
            );
          }
          // error mode: warnings/info silently dropped per T9 spec.
          return this.makeScene(sceneShape, [], mateT);
        }
        // warn mode: attach all diagnostics (error/warning/info) to scene.warnings.
        return this.makeScene(sceneShape, result.diagnostics, mateT);
      },
    );
  }

  /**
   * Records an `assemblyModel` FeatureRecord (kinematic-zero, no FK) and
   * returns a `Scene` whose per-part `worldTransform` is the identity. Use
   * for assemblies whose layout is set entirely by `assembly.part({ at })`
   * / connectors and have no joints.
   */
  model(): Scene {
    if (this.parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.model requires at least one part.',
        undefined,
        'Call assembly.part(name, shape, opts?) before assembly.model().',
      );
    }
    const sceneShape = this.session.assemblyModel(this.name, this.parts);
    return this.makeScene(sceneShape);
  }

  /**
   * Build the capture-time `Scene` returned by `model()` / `solvedModel()`.
   *
   * Per-part data is the assembly's authoring-time view: `name` from
   * `assembly.part(name, ...)`, `shape` from each part's `originalShape`,
   * and `worldTransform` from the v0.6 mate solver when mates are declared
   * (Pattern A FK over `solveMates(arm, poses)`) or identity otherwise.
   * Identity is a no-op fall-back for v0.5 callers and for kinematic-zero
   * `model()` calls — the lowerer-side body-tree FK on `solvedAssembly`
   * still applies for v0.5 `arm.revolute/.fixed/.prismatic/.ball` joints.
   *
   * Precedence: when a part has BOTH an authoring `.translate(...)` chain
   * AND lives in a mate graph, the solver-assigned `worldTransform` wins on
   * the capture-time Scene. Authors mating parts should therefore declare
   * them in LOCAL frames (Fusion / OnShape / build123d convention).
   *
   * The Scene's `exportFn` closes over the upstream `solvedAssembly` /
   * `assemblyModel` feature id; calling `Scene.toCompound()` /
   * `Scene.toUnion()` records a downstream `assemblyExport` feature whose
   * lowerer reads the SceneBackend output.
   *
   * `bboxFn` is intentionally a "lower the model first" stub: AABBs over
   * transformed parts are recompute-time data; expose them via a future
   * `RecomputeResult.scene.bbox` (Task 9) rather than synchronously
   * lowering inside `Scene.bbox`.
   */
  private makeScene(
    sceneShape: Shape,
    warnings: readonly ValidatorDiagnostic[] = [],
    matePartTransforms?: ReadonlyMap<string, Transform>,
  ): Scene {
    const sceneFeatureId = sceneShape.id;
    const session = this.session;
    const sceneParts: ScenePart[] = this.parts.map((p) => ({
      name: p.name,
      shape: p.originalShape,
      worldTransform: matePartTransforms?.get(p.name) ?? Transform.identity(),
      ...(p.mateConnectors.length > 0 ? { connectors: [...p.mateConnectors] } : {}),
    }));
    return new Scene(
      this.name,
      sceneParts,
      () => {
        throw new KernelError(
          'feature.invalid-args',
          `Scene.bbox: capture-time AABB is not yet wired (Task 9). Lower the model and read the bounds from the recompute result, or call Scene.toCompound().boundingBox().`,
          sceneFeatureId,
          'invalid-args.scene.bbox-not-available — capture-time Scene bbox is computed during recompute; Task 9 surfaces it.',
        );
      },
      (op) => session.assemblyExport(sceneFeatureId, op),
      sceneFeatureId,
      this.mates.length > 0 ? [...this.mates] : undefined,
      warnings,
    );
  }
}

export function makeAssembly(name: string | undefined, session: CaptureSession): Assembly {
  const arm = new Assembly(name?.trim() || 'assembly', session);
  // v0.6: register on the session so MCP tools (`add_connector`, `add_mate`,
  // `list_mates`, `validate_assembly`, `solve_mates`) can look up the live
  // Assembly after `evaluate_script` settles. Multiple `kcad.assembly(name)`
  // calls with the same name in one script alias to the last instance — the
  // capture-side throws if duplicate part / connector names appear within an
  // Assembly anyway, so the alias is unambiguous in practice.
  session.assemblies.set(arm.name, arm);
  return arm;
}

/**
 * Read-only handle returned by Assembly.solve(poses). Exposes per-part
 * world transforms, per-joint pose values, body iteration, the canonical
 * Scene snapshot via `.toScene()`, and a deprecated `.toShape()` alias for
 * legacy single-Shape consumers.
 */
export class SolvedKinematics {
  private readonly assemblyName: string;
  private readonly partsByName: Map<string, AssemblyPartStored>;
  private readonly worldT: Map<FeatureId, Transform>;
  private readonly poses: Record<string, number | [number, number, number]>;
  private readonly joints: readonly AssemblyJointStored[];
  private readonly session: CaptureSession;

  /**
   * Process-scoped warn-once flag for the deprecated `.toShape()` alias.
   * The warning channel for this slice is `console.warn` (the milestone-C
   * `DiagnosticCode` catalogue is closed at 24 entries, so a dedicated
   * `feature.deprecated` code is out of scope; the hint string format is
   * preserved verbatim so a future migration to a structured session
   * diagnostic is a one-line change). See
   * `tests/unit/assemblies/solvedKinematicsToScene.test.ts`.
   */
  private static toShapeWarned = false;

  /** Test hook: reset the process-scoped warn-once flag. NOT public API. */
  static __resetDeprecationWarnedForTest(): void {
    SolvedKinematics.toShapeWarned = false;
  }

  constructor(
    assemblyName: string,
    parts: readonly AssemblyPartStored[],
    joints: readonly AssemblyJointStored[],
    worldT: Map<FeatureId, Transform>,
    poses: Record<string, number | [number, number, number]>,
    session: CaptureSession,
  ) {
    this.assemblyName = assemblyName;
    this.partsByName = new Map(parts.map(p => [p.name, p]));
    this.worldT = worldT;
    this.poses = poses;
    this.joints = joints;
    this.session = session;
    Object.freeze(this);
  }

  /**
   * World-space SE(3) transform of the named part. Read-only handle;
   * use with Shape.transform(t) to attach geometry to this part's frame.
   */
  transform(partName: string): Transform {
    const part = this.partsByName.get(partName);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `SolvedKinematics.transform: unknown part '${partName}'.`,
        undefined,
        'invalid-args.solved.unknown-part — pass a part name registered via assembly.part(...).',
      );
    }
    return this.worldT.get(part.id)!;
  }

  /**
   * Pose value supplied for the named joint (defaults: 0 for revolute /
   * prismatic, [0,0,0] for ball, 0 for fixed since fixed has no pose).
   */
  value(jointName: string): number | [number, number, number] {
    const joint = this.joints.find(j => j.name === jointName);
    if (!joint) {
      throw new KernelError(
        'feature.invalid-args',
        `SolvedKinematics.value: unknown joint '${jointName}'.`,
        undefined,
        'invalid-args.solved.unknown-joint — pass a joint name registered via revolute/prismatic/fixed/ball.',
      );
    }
    if (joint.kind === 'ball') {
      return (this.poses[jointName] as [number, number, number] | undefined) ?? [0, 0, 0];
    }
    if (joint.kind === 'fixed') return 0;
    return (this.poses[jointName] as number | undefined) ?? 0;
  }

  /**
   * Iterate (partName, worldTransform) for every part in the assembly.
   * Useful for batch attach or analysis loops.
   */
  *bodies(): IterableIterator<{ name: string; transform: Transform }> {
    for (const [name, part] of this.partsByName) {
      yield { name, transform: this.worldT.get(part.id)! };
    }
  }

  /**
   * Multi-body view of the FK snapshot. Mirrors `Assembly.solvedModel(poses)`'s
   * return shape — a frozen `Scene` whose ordered `parts` match
   * `assembly.part(name, ...)` declaration order, with each part's
   * `worldTransform` set to the FK-resolved SE(3) and `color` walked from
   * the source-shape upstream chain.
   *
   * Unlike the reactive `solvedModel(poses)` Scene, this Scene is a snapshot:
   * the FK is already baked into each part's source `Shape` (see
   * `Assembly.solve`), so `Scene.toUnion()` chains `Shape.union()` on the
   * mutated source shapes directly and does NOT record a fresh
   * `solvedAssembly` / `assemblyExport` feature pair. `Scene.toCompound()`
   * is intentionally unsupported on snapshot Scenes — call
   * `Assembly.solvedModel(poses).toCompound()` for a TopoDS_Compound that
   * preserves per-part identity through the lowerer.
   */
  toScene(): Scene {
    if (this.partsByName.size === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'SolvedKinematics.toScene: assembly has no parts.',
        undefined,
        'Call assembly.part(...) before assembly.solve(...).',
      );
    }
    const records = this.session.getRecords();
    const sceneParts: ScenePart[] = [];
    for (const part of this.partsByName.values()) {
      const partRecord = records.find(r => r.id === part.id);
      const color = partRecord ? lookupSourceColor(partRecord, records) : undefined;
      sceneParts.push({
        name: part.name,
        shape: part.originalShape,
        worldTransform: this.worldT.get(part.id) ?? Transform.identity(),
        ...(color !== undefined ? { color } : {}),
        ...(part.mateConnectors.length > 0 ? { connectors: [...part.mateConnectors] } : {}),
      });
    }
    const assemblyName = this.assemblyName;
    return new Scene(
      assemblyName,
      sceneParts,
      () => {
        throw new KernelError(
          'feature.invalid-args',
          `Scene.bbox: snapshot Scene from SolvedKinematics has no capture-time AABB. Compute the bbox from each part's shape.boundingBox() with worldTransform applied, or call Scene.toUnion().boundingBox().`,
          undefined,
          'invalid-args.scene.bbox-not-available — capture-time Scene bbox is computed during recompute; for the snapshot Scene, use per-part bboxes or .toUnion().boundingBox().',
        );
      },
      (op) => {
        if (op === 'union') {
          const partsArr = Array.from(this.partsByName.values());
          let model: Shape = partsArr[0].originalShape;
          for (let i = 1; i < partsArr.length; i++) {
            model = model.union(partsArr[i].originalShape);
          }
          return model;
        }
        // op === 'compound'.
        throw new KernelError(
          'feature.invalid-args',
          `Scene.toCompound: snapshot Scene from SolvedKinematics does not support compound export (per-part identity is not preserved through the snapshot). Call Assembly.solvedModel(poses).toCompound() instead.`,
          undefined,
          'invalid-args.scene.compound-not-supported-on-snapshot — call Assembly.solvedModel(poses).toCompound() for a Scene whose lowerer preserves per-part identity.',
        );
      },
    );
  }

  /**
   * @deprecated v0.5.0 — call `.toScene().toUnion()` instead. Emits a
   * warn-once `deprecated.solvedKinematics.toShape` advisory on the first
   * call per process and delegates to `.toScene().toUnion()`. Removal in
   * v0.6.0 (CHANGELOG entry under v0.5.0).
   */
  toShape(): Shape {
    if (!SolvedKinematics.toShapeWarned) {
      SolvedKinematics.toShapeWarned = true;
      console.warn(
        'SolvedKinematics.toShape() is deprecated; call .toScene().toUnion() instead. ' +
          'hint: deprecated.solvedKinematics.toShape — call .toScene().toUnion() instead.',
      );
    }
    return this.toScene().toUnion();
  }
}

/**
 * Resolve an `Editable<number>` pose coord against the session's ParamTable
 * to a concrete finite number. Used by `Assembly.solve` for snapshot
 * resolution. Wraps `currentValue` (the existing capture-time resolver) so
 * the diagnostic surface uses solve-specific hints.
 *
 * Errors:
 *   - non-number / non-ParamRef     → invalid-args.solve.bad-pose
 *   - non-finite numeric            → invalid-args.solve.bad-pose
 *   - unknown ParamRef name         → propagated from ParamTable.get
 *     (existing `invalid-args.param.unknown-name`).
 */
function resolveScalarPose(
  value: Editable<number>,
  jointName: string,
  jointKind: AssemblyJointStored['kind'],
  session: CaptureSession,
): number {
  if (!isParamRef(value) && typeof value !== 'number') {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.solve ${jointKind} joint '${jointName}' pose must be a finite number or ParamRef<number>; got ${formatScalarForError(value)}.`,
      undefined,
      'invalid-args.solve.bad-pose — pass a finite number or a ParamRef from kcad.param().',
    );
  }
  const resolved = currentValue(value as Editable<number>, session.paramTable);
  if (typeof resolved !== 'number' || !Number.isFinite(resolved)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.solve ${jointKind} joint '${jointName}' pose must be a finite number; got ${formatScalarForError(resolved)}.`,
      undefined,
      'invalid-args.solve.bad-pose — pass a finite number.',
    );
  }
  return resolved;
}

function isValidJointLimits(value: [number, number]): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    value[0] < value[1]
  );
}

function normalizeConnectors(
  partName: string,
  featureId: FeatureId,
  connectors: Record<string, AssemblyConnectorFrame> | undefined,
): Record<string, AssemblyConnectorFrameStored> {
  const normalized: Record<string, AssemblyConnectorFrameStored> = {};
  for (const [name, frame] of Object.entries(connectors ?? {})) {
    if (!isValidEditableVec3(frame.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' origin must be a finite Vec3 (numbers or ParamRef<number>); got ${formatScalarForError(frame.origin)}.`,
        featureId,
        'Pass connector frames as { origin: [x, y, z], axis?: [x, y, z] }; coords may be number or ParamRef.',
      );
    }
    if (frame.axis !== undefined && !isValidEditableVec3(frame.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' axis must be a finite Vec3; got ${formatScalarForError(frame.axis)}.`,
        featureId,
        'Pass connector axis as [x, y, z], or omit it; coords may be number or ParamRef.',
      );
    }
    normalized[name] = frame.axis === undefined
      ? { origin: toVec3Param(frame.origin, 'mm') }
      : { origin: toVec3Param(frame.origin, 'mm'), axis: toVec3Param(frame.axis, 'unitless') };
  }
  return normalized;
}

function paramToExpr(p: Param): ParamRefExpr {
  if (p.paramRef === undefined) {
    return { kind: 'lit', value: p.evaluated };
  }
  if (typeof p.paramRef === 'string') {
    return { kind: 'param', name: p.paramRef };
  }
  return p.paramRef;
}

function paramFromExpr(expr: ParamRefExpr, unit: Unit, evaluatedSnapshot: number): Param {
  return {
    expression: `{$paramExpr:${paramExprToDebugString(expr)}}`,
    unit,
    evaluated: evaluatedSnapshot,
    paramRef: expr,
  };
}

function addParams(a: Param, b: Param): Param {
  if (a.paramRef === undefined && b.paramRef === undefined) {
    return {
      expression: `(${a.expression} + ${b.expression})`,
      unit: a.unit,
      evaluated: a.evaluated + b.evaluated,
    };
  }
  return paramFromExpr(
    { kind: 'binop', op: '+', left: paramToExpr(a), right: paramToExpr(b) },
    a.unit,
    a.evaluated + b.evaluated,
  );
}

function subtractParams(a: Param, b: Param): Param {
  if (a.paramRef === undefined && b.paramRef === undefined) {
    return {
      expression: `(${a.expression} - ${b.expression})`,
      unit: a.unit,
      evaluated: a.evaluated - b.evaluated,
    };
  }
  return paramFromExpr(
    { kind: 'binop', op: '-', left: paramToExpr(a), right: paramToExpr(b) },
    a.unit,
    a.evaluated - b.evaluated,
  );
}

function resolvePartPlacement(
  assemblyName: string,
  partName: string,
  featureId: FeatureId,
  explicitAt: EditableVec3 | undefined,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  connect: AssemblyPartOpts['connect'],
): Vec3Param {
  if (!connect) {
    return toVec3Param(explicitAt ?? [0, 0, 0], 'mm');
  }
  const local = connectors[connect.connector];
  if (!local) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connector '${connect.connector}' is not defined on part '${partName}'.`,
      featureId,
      'Declare the connector in opts.connectors before using opts.connect.connector.',
    );
  }
  if (connect.to.assemblyName === undefined || connect.to.partId === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connect target is not a valid connector reference.`,
      featureId,
      'Pass a connector returned by part.connector(name).',
    );
  }
  if (connect.to.assemblyName !== assemblyName) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connect target '${connect.to.partName}.${connect.to.connector}' belongs to assembly '${connect.to.assemblyName}', not '${assemblyName}'.`,
      featureId,
      'Only connect parts within the same assembly.',
    );
  }
  if (explicitAt !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part cannot combine explicit at with connector placement.`,
      featureId,
      'Use either at: [x, y, z] or connect: { connector, to }, not both.',
    );
  }
  return {
    x: subtractParams(connect.to.worldOrigin.x, local.origin.x),
    y: subtractParams(connect.to.worldOrigin.y, local.origin.y),
    z: subtractParams(connect.to.worldOrigin.z, local.origin.z),
  };
}

function makePartRef(
  assemblyName: string,
  id: FeatureId,
  name: string,
  at: Vec3Param,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  mateConnectors: Connector[],
): AssemblyPartRef {
  // Overload: `connector(name)` returns the v0.5 kinematic AssemblyConnectorRef;
  // `connector(name, opts)` registers a v0.6 mate-style Connector and returns
  // the part-ref for chaining. Defined as a standalone function so the
  // overloaded union return type can be narrowed by `opts !== undefined`.
  const connector = (
    connectorName: string,
    opts?: AssemblyConnectorOpts,
  ): AssemblyConnectorRef | AssemblyPartRef => {
    if (opts !== undefined) {
      if (mateConnectors.some((c) => c.name === connectorName)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.connector.duplicate-name: part '${name}' already has a connector named '${connectorName}'.`,
          id,
          `invalid-args.assembly.connector-duplicate-name — rename one of the connectors on '${name}'.`,
        );
      }
      mateConnectors.push(
        makeConnector({
          name: connectorName,
          type: opts.type,
          origin: opts.origin,
          axis: opts.axis,
          normal: opts.normal,
        }),
      );
      return ref;
    }
    const frame = connectors[connectorName];
    if (!frame) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${connectorName}' is not defined on part '${name}'.`,
        id,
        'Use one of the connector names declared in assembly.part(..., { connectors }).',
      );
    }
    const worldOrigin: Vec3Param = {
      x: addParams(at.x, frame.origin.x),
      y: addParams(at.y, frame.origin.y),
      z: addParams(at.z, frame.origin.z),
    };
    return {
      assemblyName,
      partId: id,
      partName: name,
      connector: connectorName,
      origin: frame.origin,
      worldOrigin,
      ...(frame.axis !== undefined ? { axis: frame.axis } : {}),
    };
  };
  const ref: AssemblyPartRef = {
    id,
    name,
    assemblyName,
    at,
    connectors,
    mateConnectors,
    connector: connector as AssemblyPartRef['connector'],
  };
  return ref;
}

function validateConnectorAssembly(assemblyName: string, connector: AssemblyConnectorRef): void {
  if (connector.assemblyName !== assemblyName) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly connector '${connector.partName}.${connector.connector}' belongs to assembly '${connector.assemblyName}', not '${assemblyName}'.`,
      connector.partId,
      'Only connect parts within the same assembly.',
    );
  }
}
