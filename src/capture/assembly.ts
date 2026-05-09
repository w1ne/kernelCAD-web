import { KernelError } from '../intent/kernelError';
import type { EditableVec3, FeatureId, Param, Unit, Vec3, Vec3Param } from '../intent/types';
import { formatScalarForError, isValidEditableVec3, isValidVec3 } from '../intent/types';
import { toVec3Param } from '../runtime/editableHelpers';
import { paramExprToDebugString, type ParamRefExpr } from '../runtime/paramRef';
import { Transform, type Vec3 as Se3Vec3 } from '../runtime/se3';
import type { CaptureSession } from './captureSession';
import { Shape } from './proxy';

export interface AssemblyPartRef {
  id: FeatureId;
  name: string;
  assemblyName: string;
  at: Vec3Param;
  connectors: Record<string, AssemblyConnectorFrameStored>;
  connector(name: string): AssemblyConnectorRef;
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
interface AssemblyJointStored {
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
interface AssemblyPartStored extends AssemblyPartRef {
  readonly originalShape: Shape;
  readonly connectParentId?: FeatureId;
}

export class Assembly {
  readonly name: string;
  private readonly session: CaptureSession;
  private readonly parts: AssemblyPartStored[] = [];
  private readonly joints: AssemblyJointStored[] = [];

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
    const part = makePartRef(this.name, record.id, name, at, connectors);
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
  solve(poses: Record<string, number | [number, number, number]>): SolvedKinematics {
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

    // 2. Validate pose value shapes per joint kind.
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
        if (!Array.isArray(v) || v.length !== 3 || v.some(x => typeof x !== 'number' || !Number.isFinite(x))) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solve ball joint '${j.name}' pose must be [eulerXDeg, eulerYDeg, eulerZDeg]; got ${formatScalarForError(v)}.`,
            undefined,
            'invalid-args.solve.ball-pose — pass three finite numbers as the XYZ Euler triple.',
          );
        }
      } else {
        // revolute or prismatic — single number.
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solve ${j.kind} joint '${j.name}' pose must be a finite number; got ${formatScalarForError(v)}.`,
            undefined,
            'invalid-args.solve.bad-pose — pass a finite number.',
          );
        }
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

    // 4. Build the parent-joint index: each part has at most one parent joint.
    const parentJointByPart = new Map<FeatureId, AssemblyJointStored>();
    for (const j of this.joints) {
      if (parentJointByPart.has(j.childPartId)) {
        const prior = parentJointByPart.get(j.childPartId)!;
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: a part has two parent joints ('${prior.name}' and '${j.name}'); body-tree requires at most one.`,
          undefined,
          'invalid-args.solve.multi-parent — restructure with a single parent joint per part, or use fixed joints in a chain.',
        );
      }
      parentJointByPart.set(j.childPartId, j);
    }

    // 5. Cycle detection via DFS through joint-parent links.
    const visited = new Set<FeatureId>();
    const stack = new Set<FeatureId>();
    const dfs = (partId: FeatureId): void => {
      if (visited.has(partId)) return;
      if (stack.has(partId)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: cycle detected in joint graph at part '${partId}'.`,
          undefined,
          'invalid-args.solve.cycle — joint parents must form a tree (no cycles).',
        );
      }
      stack.add(partId);
      const parentJ = parentJointByPart.get(partId);
      if (parentJ) dfs(parentJ.parentPartId);
      stack.delete(partId);
      visited.add(partId);
    };
    for (const part of this.parts) dfs(part.id);

    // 6. Topological sort: roots first, then walk down to leaves via parent-joint links.
    const topoOrder: AssemblyPartStored[] = [];
    const seen = new Set<FeatureId>();
    const visit = (part: AssemblyPartStored): void => {
      if (seen.has(part.id)) return;
      seen.add(part.id);
      const parentJ = parentJointByPart.get(part.id);
      if (parentJ) {
        const parentPart = this.parts.find(p => p.id === parentJ.parentPartId);
        if (parentPart) visit(parentPart);
      }
      topoOrder.push(part);
    };
    for (const part of this.parts) visit(part);

    // 7. Forward kinematics: walk in topo order, computing world transform per part.
    const worldT = new Map<FeatureId, Transform>();
    for (const part of topoOrder) {
      const parentJ = parentJointByPart.get(part.id);
      if (!parentJ) {
        // Root part — no parent joint, identity transform.
        worldT.set(part.id, Transform.identity());
        continue;
      }
      const parentT = worldT.get(parentJ.parentPartId);
      if (!parentT) {
        // Should be impossible if topo sort is correct.
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: internal error — parent part '${parentJ.parentPartId}' of joint '${parentJ.name}' has no computed transform.`,
          undefined,
          'invalid-args.solve.internal — please file a bug.',
        );
      }

      let jointLocalT: Transform;
      switch (parentJ.kind) {
        case 'revolute': {
          const deg = (poses[parentJ.name] as number | undefined) ?? 0;
          const ax = parentJ.axis as Se3Vec3;
          jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2])
            .compose(Transform.rotationAxisAngleDeg(ax, deg));
          break;
        }
        case 'prismatic': {
          const stroke = (poses[parentJ.name] as number | undefined) ?? 0;
          const ax = parentJ.axis as Se3Vec3;
          const len = Math.hypot(ax[0], ax[1], ax[2]) || 1;
          const dx = (ax[0] / len) * stroke;
          const dy = (ax[1] / len) * stroke;
          const dz = (ax[2] / len) * stroke;
          jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2])
            .compose(Transform.translation(dx, dy, dz));
          break;
        }
        case 'fixed': {
          jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2]);
          break;
        }
        case 'ball': {
          const euler = (poses[parentJ.name] as [number, number, number] | undefined) ?? [0, 0, 0];
          jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2])
            .compose(Transform.eulerXYZDeg(euler[0], euler[1], euler[2]));
          break;
        }
      }
      worldT.set(part.id, parentT.compose(jointLocalT));
    }

    // 8. Apply per-part transform to the original shape (mutates the Shape's
    //    transform stack via existing translate + rotate ShapeTransform pipes).
    for (const part of this.parts) {
      const T = worldT.get(part.id)!;
      part.originalShape.transform(T);
    }

    // 9. Build SolvedKinematics handle.
    return new SolvedKinematics(this.parts, this.joints, worldT, poses);
  }

  /**
   * Sugar: same as `solve(poses).toShape()`. Returns the unioned posed Shape
   * directly — for the simple "give me the renderable scene root" path.
   */
  solvedModel(poses: Record<string, number | [number, number, number]>): Shape {
    return this.solve(poses).toShape();
  }

  model(): Shape {
    if (this.parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.model requires at least one part.',
        undefined,
        'Call assembly.part(name, shape, opts?) before assembly.model().',
      );
    }
    return this.session.assemblyModel(this.name, this.parts);
  }
}

export function makeAssembly(name: string | undefined, session: CaptureSession): Assembly {
  return new Assembly(name?.trim() || 'assembly', session);
}

/**
 * Read-only handle returned by Assembly.solve(poses). Exposes per-part
 * world transforms, per-joint pose values, body iteration, and a
 * to-Shape sugar for rendering.
 */
export class SolvedKinematics {
  private readonly partsByName: Map<string, AssemblyPartStored>;
  private readonly worldT: Map<FeatureId, Transform>;
  private readonly poses: Record<string, number | [number, number, number]>;
  private readonly joints: readonly AssemblyJointStored[];

  constructor(
    parts: readonly AssemblyPartStored[],
    joints: readonly AssemblyJointStored[],
    worldT: Map<FeatureId, Transform>,
    poses: Record<string, number | [number, number, number]>,
  ) {
    this.partsByName = new Map(parts.map(p => [p.name, p]));
    this.worldT = worldT;
    this.poses = poses;
    this.joints = joints;
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
   * Render: union all posed parts into a single Shape. Same effect as
   * Assembly.solvedModel(poses).
   */
  toShape(): Shape {
    const parts = Array.from(this.partsByName.values());
    if (parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'SolvedKinematics.toShape: assembly has no parts.',
        undefined,
        'Call assembly.part(...) before assembly.solve(...).',
      );
    }
    let model: Shape = parts[0].originalShape;
    for (let i = 1; i < parts.length; i++) {
      model = model.union(parts[i].originalShape);
    }
    return model;
  }
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
): AssemblyPartRef {
  return {
    id,
    name,
    assemblyName,
    at,
    connectors,
    connector(connectorName: string): AssemblyConnectorRef {
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
    },
  };
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
