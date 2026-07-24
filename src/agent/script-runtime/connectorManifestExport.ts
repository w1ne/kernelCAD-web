// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Scene } from '../../modeling/validation/scene';
import type { Connector } from '../../modeling/mates/connector';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { Param, Vec3 } from '../../shared/intent/types';
import {
  validateConnectorManifest,
  type ConnectorEntry,
  type ConnectorManifest,
} from '../../shared/parts/connectorManifestSchema';
import { Transform } from '../../shared/runtime/se3';

interface AssemblyModelMetadata {
  assemblyName: string;
  partIds: readonly string[];
  mates: readonly unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isResolvedParam(value: unknown): value is Param {
  return isRecord(value)
    && typeof value.expression === 'string'
    && typeof value.unit === 'string'
    && typeof value.evaluated === 'number'
    && Number.isFinite(value.evaluated);
}

function mutableVec3(vector: readonly [number, number, number]): Vec3 {
  return [vector[0], vector[1], vector[2]];
}

function onlyRecordById(
  records: readonly FeatureRecord[],
  id: string,
  label: string,
): FeatureRecord {
  const matches = records.filter((record) => record.id === id);
  if (matches.length !== 1) {
    throw new Error(
      `connector-manifest export found an ambiguous or missing ${label} record '${id}' (found ${matches.length}).`,
    );
  }
  return matches[0];
}

function readAssemblyModelMetadata(record: FeatureRecord): AssemblyModelMetadata {
  if (!isRecord(record.metadata)) {
    throw new Error('connector-manifest export assemblyModel source is missing metadata.');
  }
  const assemblyName = record.metadata.assemblyName;
  if (typeof assemblyName !== 'string' || assemblyName.length === 0) {
    throw new Error('connector-manifest export assemblyModel source is missing assemblyName.');
  }
  const partIds = record.metadata.partIds;
  if (!Array.isArray(partIds) || partIds.length === 0 || partIds.some((id) => typeof id !== 'string')) {
    throw new Error('connector-manifest export assemblyModel source has invalid partIds.');
  }
  if (new Set(partIds).size !== partIds.length) {
    throw new Error('connector-manifest export assemblyModel source has ambiguous partIds.');
  }
  const mates = record.metadata.mates;
  if (mates !== undefined && !Array.isArray(mates)) {
    throw new Error('connector-manifest export assemblyModel source has invalid mates metadata.');
  }
  return { assemblyName, partIds, mates: mates ?? [] };
}

function assertAssemblyPartInputs(
  source: FeatureRecord,
  partIds: readonly string[],
): void {
  const partInputKeys = Object.keys(source.inputs).filter((key) => /^part_\d+$/.test(key));
  if (partInputKeys.length !== partIds.length) {
    throw new Error(
      'connector-manifest export assemblyModel input count does not agree with metadata.partIds.',
    );
  }
  for (const [index, partId] of partIds.entries()) {
    const input = source.inputs[`part_${index}`];
    if (input?.kind !== 'feature' || input.id !== partId) {
      throw new Error(
        `connector-manifest export assemblyModel input part_${index} does not agree with metadata.partIds.`,
      );
    }
  }
}

function readAssemblyPartName(
  record: FeatureRecord,
  expectedAssemblyName: string,
): string {
  if (record.kind !== 'assemblyPart' || !isRecord(record.metadata)) {
    throw new Error(`connector-manifest export expected an assemblyPart record '${record.id}'.`);
  }
  if (record.metadata.assemblyName !== expectedAssemblyName) {
    throw new Error(
      `connector-manifest export assemblyPart '${record.id}' does not belong to source assembly '${expectedAssemblyName}'.`,
    );
  }
  const partName = record.metadata.partName;
  if (typeof partName !== 'string' || partName.length === 0) {
    throw new Error(`connector-manifest export assemblyPart '${record.id}' is missing partName.`);
  }
  return partName;
}

function readAssemblyPartAt(record: FeatureRecord): Vec3 {
  if (!isRecord(record.metadata) || !isRecord(record.metadata.at)) {
    throw new Error(`connector-manifest export assemblyPart '${record.id}' is missing resolved at placement.`);
  }
  const { x, y, z } = record.metadata.at;
  if (!isResolvedParam(x) || !isResolvedParam(y) || !isResolvedParam(z)) {
    throw new Error(`connector-manifest export assemblyPart '${record.id}' has invalid resolved at placement.`);
  }
  return [x.evaluated, y.evaluated, z.evaluated];
}

function sourceAssemblyHasJoints(
  sourceAssemblyName: string,
  sourcePartIds: ReadonlySet<string>,
  records: readonly FeatureRecord[],
): boolean {
  return records.some((record) => {
    if (record.kind !== 'assemblyJoint') return false;
    if (!isRecord(record.metadata) || record.metadata.assemblyName !== sourceAssemblyName) {
      return false;
    }
    const a = record.inputs.a;
    const b = record.inputs.b;
    return (a?.kind === 'feature' && sourcePartIds.has(a.id))
      || (b?.kind === 'feature' && sourcePartIds.has(b.id));
  });
}

function assertUniquePartNames(names: readonly string[], label: string): void {
  if (new Set(names).size !== names.length) {
    throw new Error(`connector-manifest export ${label} has ambiguous duplicate part names.`);
  }
}

function connectorToManifestEntry(
  connector: Connector,
  transform: Transform,
): ConnectorEntry {
  if (connector.type !== 'frame' && connector.type !== 'axis') {
    throw new Error(
      `connector-manifest export supports only frame or axis connectors; '${connector.name}' is '${connector.type}'.`,
    );
  }
  if (connector.origin.kind !== 'vec3') {
    throw new Error(
      `connector-manifest export requires a numeric Vec3 origin for connector '${connector.name}'.`,
    );
  }
  const origin = mutableVec3(transform.point(connector.origin.value));
  if (connector.type === 'frame') {
    return {
      name: connector.name,
      type: 'frame',
      origin,
      normal: mutableVec3(transform.axisDir(connector.normal ?? [0, 0, 1])),
    };
  }
  return {
    name: connector.name,
    type: 'axis',
    origin,
    axis: mutableVec3(transform.axisDir(connector.axis ?? [0, 0, 1])),
  };
}

/**
 * Convert the numeric, source-scoped connectors of a mate-free static
 * assembly Scene into a portable manifest. The assembly part's `at` placement
 * is baked into the lowered part shape, while SceneBackend.worldTransform is
 * applied later by STEP export, so the manifest uses their exact composition.
 */
export function sceneToConnectorManifest(
  scene: Scene,
  lowered: SceneBackend,
  resolvedRecords: readonly FeatureRecord[],
  identity: { partId: string; family: string },
): ConnectorManifest {
  const sourceId = scene.__sourceFeatureId();
  if (sourceId === undefined) {
    throw new Error('connector-manifest export requires a Scene with an assemblyModel source feature.');
  }
  const source = onlyRecordById(resolvedRecords, sourceId, 'source feature');
  if (source.kind !== 'assemblyModel') {
    throw new Error(
      `connector-manifest export requires an assemblyModel source feature; received '${source.kind}'.`,
    );
  }
  const metadata = readAssemblyModelMetadata(source);
  if ((scene.mates?.length ?? 0) > 0 || metadata.mates.length > 0) {
    throw new Error('connector-manifest export requires a mate-free, joint-free assembly.');
  }
  const sourcePartIds = new Set(metadata.partIds);
  if (sourceAssemblyHasJoints(metadata.assemblyName, sourcePartIds, resolvedRecords)) {
    throw new Error('connector-manifest export requires a mate-free, joint-free assembly.');
  }
  assertAssemblyPartInputs(source, metadata.partIds);

  if (
    scene.parts.length !== metadata.partIds.length ||
    lowered.parts.length !== metadata.partIds.length
  ) {
    throw new Error('connector-manifest export requires source, Scene, and lowered part counts to agree.');
  }
  if (scene.assemblyName !== metadata.assemblyName || lowered.assemblyName !== metadata.assemblyName) {
    throw new Error('connector-manifest export source, Scene, and lowered assembly names must agree.');
  }
  assertUniquePartNames(scene.parts.map((part) => part.name), 'Scene');
  assertUniquePartNames(lowered.parts.map((part) => part.name), 'lowered SceneBackend');

  const connectors: ConnectorEntry[] = [];
  const connectorNames = new Set<string>();
  for (const [index, partId] of metadata.partIds.entries()) {
    const scenePart = scene.parts[index];
    const backendPart = lowered.parts[index];
    const assemblyPart = onlyRecordById(resolvedRecords, partId, 'assemblyPart');
    const partName = readAssemblyPartName(assemblyPart, metadata.assemblyName);
    if (scenePart.name !== partName || backendPart.name !== partName) {
      throw new Error(
        `connector-manifest export Scene and lowered part name agreement failed at index ${index}.`,
      );
    }
    const at = readAssemblyPartAt(assemblyPart);
    const transform = backendPart.worldTransform.compose(
      Transform.translation(at[0], at[1], at[2]),
    );
    for (const connector of scenePart.connectors ?? []) {
      if (connectorNames.has(connector.name)) {
        throw new Error(`connector-manifest export has duplicate connector name '${connector.name}'.`);
      }
      connectorNames.add(connector.name);
      connectors.push(connectorToManifestEntry(connector, transform));
    }
  }

  const manifest: ConnectorManifest = {
    schemaVersion: 1,
    partId: identity.partId,
    family: identity.family,
    connectors,
  };
  validateConnectorManifest(manifest);
  return manifest;
}
