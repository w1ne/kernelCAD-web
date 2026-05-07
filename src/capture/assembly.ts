import { KernelError } from '../intent/kernelError';
import type { FeatureId, Vec3 } from '../intent/types';
import { formatScalarForError, isValidVec3 } from '../intent/types';
import type { CaptureSession } from './captureSession';
import { Shape } from './proxy';

export interface AssemblyPartRef {
  id: FeatureId;
  name: string;
}

export interface AssemblyJointRef {
  id: FeatureId;
  name: string;
  kind: 'revolute';
}

export interface AssemblyPartOpts {
  at?: Vec3;
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
    const record = this.session.assemblyPart(this.name, name, shape, opts);
    const part = { id: record.id, name };
    this.parts.push(part);
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
