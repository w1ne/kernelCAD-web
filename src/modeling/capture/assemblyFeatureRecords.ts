// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId, FeatureKind, FeatureRef, Param, Vec3, Vec3Param } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';

export interface AssemblyFeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

export interface SolvedAssemblyMateMetadata {
  readonly connectorsByPartId: Record<FeatureId, readonly EncodedConnectorRecord[]>;
  readonly mates: readonly EncodedMateRecord[];
  readonly couplings?: readonly MateCouplingRecord[];
}

export interface EncodedConnectorRecord {
  readonly name: string;
  readonly type: string;
  readonly origin?: unknown;
  readonly axis?: unknown;
  readonly normal?: unknown;
  readonly jointClearanceRadius?: number;
}

export type EncodedMateType =
  | 'fastened'
  | 'revolute'
  | 'prismatic'
  | 'cylindrical'
  | 'planar'
  | 'ball'
  | 'pin_slot';

export interface EncodedMateRecord {
  readonly name: string;
  readonly a: string;
  readonly b: string;
  readonly type: EncodedMateType;
  readonly pose?:
    | { kind: 'scalar'; value: Param }
    | { kind: 'ball'; value: [Param, Param, Param] };
  readonly limitsDeg?: readonly [number, number];
  readonly limitsMm?: readonly [number, number];
}

export interface MateCouplingRecord {
  readonly driven: string;
  readonly source: string;
  readonly ratio: number;
  readonly offset?: number;
}

export interface AssemblyConnectorFrameStoredLike {
  origin: Vec3Param;
  axis?: Vec3Param;
}

export interface AssemblyConnectorRefLike {
  assemblyName: string;
  partId: FeatureId;
  partName: string;
  connector: string;
  origin: Vec3Param;
  worldOrigin: Vec3Param;
  axis?: Vec3Param;
}

export interface AssemblyPartRefLike {
  id: FeatureId;
  name: string;
}

export interface AssemblyPartCaptureOpts {
  at?: Vec3Param;
  connectors?: Record<string, AssemblyConnectorFrameStoredLike>;
  placedBy?: {
    connector: string;
    to: {
      partId: FeatureId;
      partName: string;
      connector: string;
    };
  };
}

export type AssemblyJointKind = 'revolute' | 'prismatic' | 'fixed' | 'ball';

export interface AssemblyJointCaptureOpts {
  axis?: Vec3;
  origin: Vec3;
  limitsDeg?: [number, number];
  limitsMm?: [number, number];
  ballLimitsDeg?: [[number, number], [number, number], [number, number]];
}

export interface SolvedAssemblyJointRef {
  id: FeatureId;
  name: string;
  kind?: AssemblyJointKind;
}

export type SolvedAssemblyPoseInput = Record<
  string,
  Editable<number> | [Editable<number>, Editable<number>, Editable<number>]
>;

type EncodedPose =
  | { kind: 'scalar'; value: Param }
  | { kind: 'ball'; value: [Param, Param, Param] };

export function buildAssemblyPartFeatureSpec(
  assemblyName: string,
  partName: string,
  shapeId: FeatureId,
  opts: AssemblyPartCaptureOpts = {},
): AssemblyFeatureSpec {
  return {
    kind: 'assemblyPart',
    params: {},
    inputs: {
      shape: { kind: 'feature', id: shapeId },
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
  };
}

export function buildAssemblyConnectFeatureSpec(
  assemblyName: string,
  connectName: string,
  a: AssemblyConnectorRefLike,
  b: AssemblyConnectorRefLike,
): AssemblyFeatureSpec {
  return {
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
  };
}

export function buildAssemblyJointFeatureSpec(
  assemblyName: string,
  jointName: string,
  jointKind: AssemblyJointKind,
  a: AssemblyPartRefLike,
  b: AssemblyPartRefLike,
  opts: AssemblyJointCaptureOpts,
): AssemblyFeatureSpec {
  return {
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
  };
}

export function buildAssemblyModelFeatureSpec(
  assemblyName: string,
  parts: readonly AssemblyPartRefLike[],
  mateMetadata?: SolvedAssemblyMateMetadata,
): AssemblyFeatureSpec {
  if (parts.length === 0) {
    throw new Error('assembly.model requires at least one part');
  }

  const inputs: Record<string, FeatureRef> = {};
  parts.forEach((part, i) => {
    inputs[`part_${i}`] = { kind: 'feature', id: part.id };
  });

  return {
    kind: 'assemblyModel',
    params: {},
    inputs,
    metadata: {
      assemblyName,
      partIds: parts.map(part => part.id),
      ...mateMetadataPayload(mateMetadata),
    },
  };
}

export function buildSolvedAssemblyFeatureSpec(args: {
  assemblyName: string;
  parts: readonly AssemblyPartRefLike[];
  joints: readonly SolvedAssemblyJointRef[];
  poses: SolvedAssemblyPoseInput;
  mateMetadata?: SolvedAssemblyMateMetadata;
}): AssemblyFeatureSpec {
  if (args.parts.length === 0) {
    throw new Error('assembly.solvedModel requires at least one part');
  }

  validateSolvedAssemblyPoses(args.assemblyName, args.joints, args.poses, args.mateMetadata);

  const inputs: Record<string, FeatureRef> = {};
  args.parts.forEach((part, i) => {
    inputs[`part_${i}`] = { kind: 'feature', id: part.id };
  });
  args.joints.forEach((joint, i) => {
    inputs[`joint_${i}`] = { kind: 'feature', id: joint.id };
  });

  return {
    kind: 'solvedAssembly',
    params: {},
    inputs,
    metadata: {
      assemblyName: args.assemblyName,
      partIds: args.parts.map(part => part.id),
      jointIds: args.joints.map(joint => joint.id),
      poses: encodeSolvedAssemblyPoses(args.poses),
      ...mateMetadataPayload(args.mateMetadata),
    },
  };
}

export function buildAssemblyExportFeatureSpec(
  sceneFeatureId: FeatureId,
  op: 'compound' | 'union',
): AssemblyFeatureSpec {
  const opLabel: Param = {
    expression: `'${op}'`, unit: 'unitless', evaluated: 0,
  };
  return {
    kind: 'assemblyExport',
    params: { op: opLabel },
    inputs: {
      scene: { kind: 'feature', id: sceneFeatureId },
    },
    metadata: { op },
  };
}

function validateSolvedAssemblyPoses(
  assemblyName: string,
  joints: readonly SolvedAssemblyJointRef[],
  poses: SolvedAssemblyPoseInput,
  mateMetadata?: SolvedAssemblyMateMetadata,
): void {
  const jointKindByName = new Map<string, AssemblyJointKind>();
  for (const joint of joints) {
    if (joint.kind !== undefined) {
      jointKindByName.set(joint.name, joint.kind);
    }
  }

  const mateKindByName = new Map<string, EncodedMateType>();
  for (const mate of mateMetadata?.mates ?? []) {
    mateKindByName.set(mate.name, mate.type);
  }

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
}

function encodeSolvedAssemblyPoses(poses: SolvedAssemblyPoseInput): Record<string, EncodedPose> {
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
  return encodedPoses;
}

function mateMetadataPayload(mateMetadata?: SolvedAssemblyMateMetadata): Record<string, unknown> {
  if (mateMetadata === undefined || mateMetadata.mates.length === 0) return {};
  return {
    mates: mateMetadata.mates,
    couplings: mateMetadata.couplings ?? [],
    connectorsByPartId: mateMetadata.connectorsByPartId,
  };
}
