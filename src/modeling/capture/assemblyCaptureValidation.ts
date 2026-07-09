// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId } from '../../shared/intent/types';
import {
  buildAssemblyConnectFeatureSpec,
  buildAssemblyExportFeatureSpec,
  buildAssemblyJointFeatureSpec,
  buildAssemblyModelFeatureSpec,
  buildAssemblyPartFeatureSpec,
  buildSolvedAssemblyFeatureSpec,
  type AssemblyConnectorRefLike,
  type AssemblyFeatureSpec,
  type AssemblyJointCaptureOpts,
  type AssemblyJointKind,
  type AssemblyPartCaptureOpts,
  type AssemblyPartRefLike,
  type SolvedAssemblyJointRef,
  type SolvedAssemblyMateMetadata,
  type SolvedAssemblyPoseInput,
} from './assemblyFeatureRecords';

export function createAssemblyPartCaptureSpec(
  records: readonly FeatureRecord[],
  assemblyName: string,
  partName: string,
  shapeId: FeatureId,
  opts: AssemblyPartCaptureOpts = {},
): AssemblyFeatureSpec {
  if (!records.some(r => r.id === shapeId)) {
    throw new Error(`assembly.part: shape '${shapeId}' is not from this CaptureSession`);
  }
  return buildAssemblyPartFeatureSpec(assemblyName, partName, shapeId, opts);
}

export function createAssemblyConnectCaptureSpec(
  records: readonly FeatureRecord[],
  assemblyName: string,
  connectName: string,
  a: AssemblyConnectorRefLike,
  b: AssemblyConnectorRefLike,
): AssemblyFeatureSpec {
  for (const connector of [a, b]) {
    requireRecordKind(
      records,
      connector.partId,
      'assemblyPart',
      `assembly.connect: part '${connector.partId}' is not an assembly part in this CaptureSession`,
    );
  }
  return buildAssemblyConnectFeatureSpec(assemblyName, connectName, a, b);
}

export function createAssemblyJointCaptureSpec(
  records: readonly FeatureRecord[],
  assemblyName: string,
  jointName: string,
  jointKind: AssemblyJointKind,
  a: AssemblyPartRefLike,
  b: AssemblyPartRefLike,
  opts: AssemblyJointCaptureOpts,
): AssemblyFeatureSpec {
  for (const part of [a, b]) {
    requireRecordKind(
      records,
      part.id,
      'assemblyPart',
      `assembly.${jointKind}: part '${part.id}' is not an assembly part in this CaptureSession`,
    );
  }
  return buildAssemblyJointFeatureSpec(assemblyName, jointName, jointKind, a, b, opts);
}

export function createAssemblyModelCaptureSpec(
  records: readonly FeatureRecord[],
  assemblyName: string,
  parts: readonly AssemblyPartRefLike[],
  mateMetadata?: SolvedAssemblyMateMetadata,
): AssemblyFeatureSpec {
  for (const part of parts) {
    requireRecordKind(
      records,
      part.id,
      'assemblyPart',
      `assembly.model: part '${part.id}' is not an assembly part in this CaptureSession`,
    );
  }
  return buildAssemblyModelFeatureSpec(assemblyName, parts, mateMetadata);
}

export function createSolvedAssemblyCaptureSpec(args: {
  records: readonly FeatureRecord[];
  assemblyName: string;
  parts: readonly AssemblyPartRefLike[];
  joints: readonly { id: FeatureId; name: string }[];
  poses: SolvedAssemblyPoseInput;
  mateMetadata?: SolvedAssemblyMateMetadata;
}): AssemblyFeatureSpec {
  if (args.parts.length === 0) {
    throw new Error('assembly.solvedModel requires at least one part');
  }
  for (const part of args.parts) {
    requireRecordKind(
      args.records,
      part.id,
      'assemblyPart',
      `assembly.solvedModel: part '${part.id}' is not an assembly part in this CaptureSession`,
    );
  }

  const solvedJoints: SolvedAssemblyJointRef[] = [];
  for (const joint of args.joints) {
    const record = requireRecordKind(
      args.records,
      joint.id,
      'assemblyJoint',
      `assembly.solvedModel: joint '${joint.id}' is not an assembly joint in this CaptureSession`,
    );
    const metadata = record.metadata as { jointName?: string; jointKind?: AssemblyJointKind };
    solvedJoints.push({
      id: joint.id,
      name: metadata.jointName ?? joint.name,
      kind: metadata.jointName !== undefined ? metadata.jointKind : undefined,
    });
  }

  return buildSolvedAssemblyFeatureSpec({
    assemblyName: args.assemblyName,
    parts: args.parts,
    joints: solvedJoints,
    poses: args.poses,
    mateMetadata: args.mateMetadata,
  });
}

export function createAssemblyExportCaptureSpec(
  records: readonly FeatureRecord[],
  sceneFeatureId: FeatureId,
  op: 'compound' | 'union',
): AssemblyFeatureSpec {
  const sourceRecord = records.find(r => r.id === sceneFeatureId);
  if (!sourceRecord) {
    throw new Error(`assemblyExport: source scene feature '${sceneFeatureId}' is not from this CaptureSession`);
  }
  if (sourceRecord.kind !== 'solvedAssembly' && sourceRecord.kind !== 'assemblyModel') {
    throw new Error(`assemblyExport: source feature '${sceneFeatureId}' is kind '${sourceRecord.kind}'; expected 'solvedAssembly' or 'assemblyModel'.`);
  }
  return buildAssemblyExportFeatureSpec(sceneFeatureId, op);
}

function requireRecordKind<K extends FeatureRecord['kind']>(
  records: readonly FeatureRecord[],
  id: FeatureId,
  kind: K,
  message: string,
): FeatureRecord & { kind: K } {
  const record = records.find(r => r.id === id);
  if (!record || record.kind !== kind) {
    throw new Error(message);
  }
  return record as FeatureRecord & { kind: K };
}
