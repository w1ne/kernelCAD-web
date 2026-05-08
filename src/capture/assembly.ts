import { KernelError } from '../intent/kernelError';
import type { EditableVec3, FeatureId, Param, Unit, Vec3Param } from '../intent/types';
import { formatScalarForError, isValidEditableVec3 } from '../intent/types';
import { toVec3Param } from '../runtime/editableHelpers';
import {
  isParamRef,
  makeParamRef,
  paramExprToDebugString,
  wrapParamRefExpr,
  type Editable,
  type ParamRefExpr,
} from '../runtime/paramRef';
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
  kind: 'revolute';
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
  axis: EditableVec3;
  origin: EditableVec3;
  limitsDeg?: [number, number];
}

/** Internal storage shape for parts. Extends the public AssemblyPartRef
 *  with references that solve() needs:
 *  - originalShape: the Shape captured by box()/etc., before any assembly
 *    placement. solve() rebuilds the model by translating + rotating each
 *    original shape, so it needs this reference.
 *  - atParam: the zero-pose at-translation (Vec3Param). solve() applies
 *    this as the first transform, then layers joint rotations on top.
 *  - connectParentId: when a part was placed via `connect: { to }`, the
 *    parent part's id. Used by partJointChain to walk through fixed
 *    connect-relationships when looking for ancestor joints (e.g. the
 *    tool placeholder is connected to the wrist; its joint ancestry is
 *    inherited from wrist's chain).
 */
interface AssemblyPartStored extends AssemblyPartRef {
  readonly originalShape: Shape;
  readonly atParam: Vec3Param;
  readonly connectParentId?: FeatureId;
}

/** Internal storage for joints. solve() walks these by childPartId. */
interface AssemblyJointStored {
  readonly name: string;
  readonly parentPartId: FeatureId;
  readonly childPartId: FeatureId;
  readonly axis: Vec3Param;
  readonly origin: Vec3Param;
  readonly limitsDeg?: [number, number];
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
      atParam: at,
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
    if (!isValidEditableVec3(opts.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`,
        undefined,
        'Pass axis: [x, y, z]; coords may be number or ParamRef.',
      );
    }
    if (!isValidEditableVec3(opts.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `revolute joint origin must be a finite Vec3; got ${formatScalarForError(opts.origin)}.`,
        undefined,
        'Pass origin: [x, y, z]; coords may be number or ParamRef.',
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
    const stored: { axis: Vec3Param; origin: Vec3Param; limitsDeg?: [number, number] } = {
      axis: toVec3Param(opts.axis, 'unitless'),
      origin: toVec3Param(opts.origin, 'mm'),
      ...(opts.limitsDeg !== undefined ? { limitsDeg: opts.limitsDeg } : {}),
    };
    const record = this.session.assemblyJoint(this.name, name, 'revolute', a, b, stored);
    this.joints.push({
      name,
      parentPartId: a.id,
      childPartId: b.id,
      axis: stored.axis,
      origin: stored.origin,
      ...(stored.limitsDeg !== undefined ? { limitsDeg: stored.limitsDeg } : {}),
    });
    return { id: record.id, name, kind: 'revolute' };
  }

  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
    validateConnectorAssembly(this.name, a);
    validateConnectorAssembly(this.name, b);
    const record = this.session.assemblyConnect(this.name, name, a, b);
    return { id: record.id, name, kind: 'fixed' };
  }

  /**
   * Build a posed model. Each part's geometry is rotated by the supplied pose
   * angles about every ancestor joint in its kinematic chain (inner-to-outer
   * composition).
   *
   * @param poses Map of joint name → rotation in degrees about the joint's
   *   axis. Editable<number>: a ParamRef makes the pose reactive to
   *   setParamValue. Joints not listed default to 0 (kinematic-zero).
   *   Unknown joint names raise feature.invalid-args.
   *
   * @returns Shape — the union of every part with its kinematic-zero
   *   placement plus the cumulative joint rotations applied.
   */
  solve(poses: Record<string, Editable<number>>): Shape {
    // Validate joint names.
    for (const name of Object.keys(poses)) {
      if (!this.joints.find(j => j.name === name)) {
        const known = this.joints.map(j => j.name);
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve: unknown joint '${name}'. Defined joints: ${known.length === 0 ? '(none)' : known.join(', ')}.`,
          undefined,
          'invalid-args.solve.unknown-joint — pass only joint names declared via assembly.revolute(...).',
        );
      }
    }

    // Validate pose values: finite numbers or ParamRef<number>.
    for (const [name, val] of Object.entries(poses)) {
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) {
          throw new KernelError(
            'feature.invalid-args',
            `assembly.solve pose '${name}' must be a finite number; got ${formatScalarForError(val)}.`,
            undefined,
            'invalid-args.solve.bad-pose — pass a finite number or ParamRef<number>.',
          );
        }
      } else if (!isParamRef(val)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.solve pose '${name}' must be a number or ParamRef<number>; got ${formatScalarForError(val)}.`,
          undefined,
          'invalid-args.solve.bad-pose — pass a finite number or ParamRef<number>.',
        );
      }
    }

    // Empty assembly is an authoring error.
    if (this.parts.length === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'assembly.solve requires at least one part.',
        undefined,
        'Call assembly.part(name, shape, opts?) before assembly.solve(poses).',
      );
    }

    // Build the posed model.
    let model: Shape | undefined;
    for (const part of this.parts) {
      // Start from the bare original shape.
      let posed = part.originalShape;

      // Apply zero-pose at-translation. Reads atParam scalar values; the
      // Vec3Param's .x/.y/.z are Param objects whose evaluated field is the
      // current numeric value (paramRef carries the symbolic AST for live
      // re-resolution). Shape.translate accepts Editable<number>; we pass
      // the param's evaluated number for the literal case OR the bound
      // param name when the param is symbolic.
      posed = posed.translate(
        paramToEditable(part.atParam.x),
        paramToEditable(part.atParam.y),
        paramToEditable(part.atParam.z),
      );

      // Apply joint rotations from inner to outer.
      for (const joint of this.partJointChain(part.id)) {
        const poseDeg = poses[joint.name] ?? 0;
        posed = posed.rotate(
          [
            paramToEditable(joint.axis.x),
            paramToEditable(joint.axis.y),
            paramToEditable(joint.axis.z),
          ],
          poseDeg,
          [
            paramToEditable(joint.origin.x),
            paramToEditable(joint.origin.y),
            paramToEditable(joint.origin.z),
          ],
        );
      }

      model = model === undefined ? posed : model.union(posed);
    }
    return model!;
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

  /** Walk the part's joint ancestry. Returns ancestor joints in inner-to-outer
   *  order: the joint directly above this part first, its parent's joint
   *  second, etc. Walks through `connectParentId` for parts placed via
   *  `connect: { to }` so a fixed-attached part inherits the kinematic chain
   *  of the part it's attached to. Cycle-guarded for defense in depth. */
  private partJointChain(partId: FeatureId): AssemblyJointStored[] {
    const chain: AssemblyJointStored[] = [];
    let cur: FeatureId | undefined = partId;
    const visited = new Set<FeatureId>();
    while (cur !== undefined && !visited.has(cur)) {
      visited.add(cur);
      const joint = this.joints.find(j => j.childPartId === cur);
      if (joint) {
        chain.push(joint);
        cur = joint.parentPartId;
        continue;
      }
      // No joint above this part. Walk through the connect-parent chain
      // to inherit ancestor joints (e.g. tool placeholder uses connect:
      // to wrist, inherits wrist's joint chain).
      const part = this.parts.find(p => p.id === cur);
      cur = part?.connectParentId;
    }
    return chain;
  }
}

export function makeAssembly(name: string | undefined, session: CaptureSession): Assembly {
  return new Assembly(name?.trim() || 'assembly', session);
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

/** Convert a stored `Param` back into an `Editable<number>` so it can be
 *  passed to chain methods like `Shape.translate` / `Shape.rotate`. Preserves
 *  symbolic reactivity: a leaf `paramRef: 'x'` round-trips to
 *  `makeParamRef('x', 'number')`; a composed AST `paramRef: ParamRefExpr`
 *  round-trips via `wrapParamRefExpr`; a literal Param (no `paramRef`)
 *  returns its `evaluated` numeric value. */
function paramToEditable(p: Param): Editable<number> {
  if (p.paramRef === undefined) return p.evaluated;
  if (typeof p.paramRef === 'string') return makeParamRef(p.paramRef, 'number');
  return wrapParamRefExpr(p.paramRef);
}
