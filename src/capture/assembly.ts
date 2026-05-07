import { KernelError } from '../intent/kernelError';
import type { FeatureId, Vec3 } from '../intent/types';
import { formatScalarForError, isValidVec3 } from '../intent/types';
import type { CaptureSession } from './captureSession';
import { Shape } from './proxy';

export interface AssemblyPartRef {
  id: FeatureId;
  name: string;
  assemblyName: string;
  at: Vec3;
  connectors: Record<string, AssemblyConnectorFrame>;
  connector(name: string): AssemblyConnectorRef;
}

export interface AssemblyJointRef {
  id: FeatureId;
  name: string;
  kind: 'revolute';
}

export interface AssemblyPartOpts {
  at?: Vec3;
  connectors?: Record<string, AssemblyConnectorFrame>;
  connect?: {
    connector: string;
    to: AssemblyConnectorRef;
    name?: string;
  };
}

export interface AssemblyConnectorFrame {
  origin: Vec3;
  axis?: Vec3;
}

export interface AssemblyConnectorRef {
  assemblyName: string;
  partId: FeatureId;
  partName: string;
  connector: string;
  origin: Vec3;
  worldOrigin: Vec3;
  axis?: Vec3;
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

export class Assembly {
  readonly name: string;
  private readonly session: CaptureSession;
  private readonly parts: AssemblyPartRef[] = [];

  constructor(name: string, session: CaptureSession) {
    this.name = name;
    this.session = session;
  }

  part(name: string, shape: Shape, opts: AssemblyPartOpts = {}): AssemblyPartRef {
    if (opts.at !== undefined && !isValidVec3(opts.at)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly part placement must be a finite Vec3; got ${formatScalarForError(opts.at)}.`,
        shape.id,
        'Pass at: [x, y, z], or omit it.',
      );
    }
    const connectors = normalizeConnectors(name, shape.id, opts.connectors);
    const at = resolvePartPlacement(this.name, name, shape.id, opts.at, connectors, opts.connect);
    const record = this.session.assemblyPart(this.name, name, shape, { at, connectors, placedBy: opts.connect });
    const part = makePartRef(this.name, record.id, name, at, connectors);
    this.parts.push(part);
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
        'Pass origin: [x, y, z].',
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
    const record = this.session.assemblyJoint(this.name, name, 'revolute', a, b, opts);
    return { id: record.id, name, kind: 'revolute' };
  }

  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef {
    validateConnectorAssembly(this.name, a);
    validateConnectorAssembly(this.name, b);
    const record = this.session.assemblyConnect(this.name, name, a, b);
    return { id: record.id, name, kind: 'fixed' };
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
): Record<string, AssemblyConnectorFrame> {
  const normalized: Record<string, AssemblyConnectorFrame> = {};
  for (const [name, frame] of Object.entries(connectors ?? {})) {
    if (!isValidVec3(frame.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' origin must be a finite Vec3; got ${formatScalarForError(frame.origin)}.`,
        featureId,
        'Pass connector frames as { origin: [x, y, z], axis?: [x, y, z] }.',
      );
    }
    if (frame.axis !== undefined && !isValidVec3(frame.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' axis must be a finite Vec3; got ${formatScalarForError(frame.axis)}.`,
        featureId,
        'Pass connector axis as [x, y, z], or omit it.',
      );
    }
    normalized[name] = frame.axis === undefined
      ? { origin: frame.origin }
      : { origin: frame.origin, axis: frame.axis };
  }
  return normalized;
}

function resolvePartPlacement(
  assemblyName: string,
  partName: string,
  featureId: FeatureId,
  explicitAt: Vec3 | undefined,
  connectors: Record<string, AssemblyConnectorFrame>,
  connect: AssemblyPartOpts['connect'],
): Vec3 {
  if (!connect) return explicitAt ?? [0, 0, 0];
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
  return [
    connect.to.worldOrigin[0] - local.origin[0],
    connect.to.worldOrigin[1] - local.origin[1],
    connect.to.worldOrigin[2] - local.origin[2],
  ];
}

function makePartRef(
  assemblyName: string,
  id: FeatureId,
  name: string,
  at: Vec3,
  connectors: Record<string, AssemblyConnectorFrame>,
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
      return {
        assemblyName,
        partId: id,
        partName: name,
        connector: connectorName,
        origin: frame.origin,
        worldOrigin: [
          at[0] + frame.origin[0],
          at[1] + frame.origin[1],
          at[2] + frame.origin[2],
        ],
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
