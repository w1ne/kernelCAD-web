// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Browser-safe connector-manifest schema and validation. Keep Node file I/O in
// connectorManifest.ts so catalog metadata may validate manifests at runtime.

import { assertTopoRefSafeName } from '../naming/topoRefName';

export type ConnectorType = 'frame' | 'axis';

export interface ConnectorFrameEntry {
  name: string;
  type: 'frame';
  origin: [number, number, number];
  normal: [number, number, number];
}

export interface ConnectorAxisEntry {
  name: string;
  type: 'axis';
  origin: [number, number, number];
  axis: [number, number, number];
}

export type ConnectorEntry = ConnectorFrameEntry | ConnectorAxisEntry;

export interface ConnectorManifest {
  schemaVersion: 1;
  partId: string;
  family: string;
  connectors: ConnectorEntry[];
  license?: string;
  attribution?: string | null;
  generatedAt?: string;
}

/** A connector manifest explicitly bound to the geometry it describes. */
export interface HashBoundConnectorManifest extends ConnectorManifest {
  geometrySha256: string;
}

/** The catalog identity a hash-bound connector manifest must agree with. */
export interface ConnectorManifestBinding {
  partId: string;
  family: string;
  geometrySha256: string;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateVector3(value: unknown, label: string): asserts value is [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((component) => typeof component === 'number' && Number.isFinite(component))
  ) {
    throw new Error(`manifest: ${label} must be a finite three-vector`);
  }
}

function validateNonZeroVector(value: [number, number, number], label: string): void {
  if (value[0] === 0 && value[1] === 0 && value[2] === 0) {
    throw new Error(`manifest: ${label} must not be a zero vector`);
  }
}

function validateExactConnectorFields(
  entry: Record<string, unknown>,
  allowedFields: readonly string[],
  label: string,
): void {
  for (const field of allowedFields) {
    if (!Object.hasOwn(entry, field)) {
      throw new Error(`manifest: ${label} requires field '${field}'`);
    }
  }
  for (const field of Reflect.ownKeys(entry)) {
    if (typeof field !== 'string' || !allowedFields.includes(field)) {
      throw new Error(`manifest: ${label} has unexpected field '${String(field)}'`);
    }
  }
}

/** Validate local v1 connector data independently of any geometry binding. */
export function validateConnectorManifest(value: unknown): asserts value is ConnectorManifest {
  if (!isRecord(value)) throw new Error('manifest: not an object');
  if (value.schemaVersion !== 1) {
    throw new Error(
      `manifest: schemaVersion must be 1, got ${String(value.schemaVersion)}`,
    );
  }
  if (typeof value.partId !== 'string' || value.partId.length === 0) {
    throw new Error('manifest: partId required');
  }
  if (typeof value.family !== 'string' || value.family.length === 0) {
    throw new Error('manifest: family required');
  }
  if (value.license !== undefined && typeof value.license !== 'string') {
    throw new Error('manifest: license must be a string when provided');
  }
  if (
    value.attribution !== undefined &&
    value.attribution !== null &&
    typeof value.attribution !== 'string'
  ) {
    throw new Error('manifest: attribution must be a string or null when provided');
  }
  if (value.generatedAt !== undefined && typeof value.generatedAt !== 'string') {
    throw new Error('manifest: generatedAt must be a string when provided');
  }
  if (!Array.isArray(value.connectors)) {
    throw new Error('manifest: connectors must be an array');
  }

  const names = new Set<string>();
  for (const connector of value.connectors) {
    if (!isRecord(connector)) {
      throw new Error('manifest: connector must be an object');
    }
    if (!Object.hasOwn(connector, 'name') || typeof connector.name !== 'string') {
      throw new Error('manifest: connector name required');
    }
    // Throws KernelError if the name would conflict with the @kc[...] grammar.
    assertTopoRefSafeName(connector.name, 'connector-name', value.partId);
    if (names.has(connector.name)) {
      throw new Error(`manifest: duplicate connector name '${connector.name}'`);
    }
    names.add(connector.name);

    if (!Object.hasOwn(connector, 'type')) {
      throw new Error(`manifest: connector ${connector.name} type required`);
    }
    if (connector.type === 'frame') {
      validateExactConnectorFields(
        connector,
        ['name', 'type', 'origin', 'normal'],
        `frame connector ${connector.name}`,
      );
      validateVector3(connector.origin, `connector ${connector.name} origin`);
      validateVector3(connector.normal, `connector ${connector.name} normal`);
      validateNonZeroVector(connector.normal, `connector ${connector.name} normal`);
      continue;
    }
    if (connector.type === 'axis') {
      validateExactConnectorFields(
        connector,
        ['name', 'type', 'origin', 'axis'],
        `axis connector ${connector.name}`,
      );
      validateVector3(connector.origin, `connector ${connector.name} origin`);
      validateVector3(connector.axis, `connector ${connector.name} axis`);
      validateNonZeroVector(connector.axis, `connector ${connector.name} axis`);
      continue;
    }
    throw new Error(
      `manifest: connector ${connector.name} type must be 'frame' or 'axis'`,
    );
  }
}

/**
 * Validate an authored connector manifest before it crosses a catalog boundary.
 * The binding prevents connector data from one geometry revision being applied
 * silently to another part or family.
 */
export function validateHashBoundConnectorManifest(
  manifest: unknown,
  expected: ConnectorManifestBinding,
): asserts manifest is HashBoundConnectorManifest {
  validateConnectorManifest(manifest);
  const candidate = manifest as unknown as Record<string, unknown>;
  if (
    typeof candidate.geometrySha256 !== 'string' ||
    !SHA256_HEX.test(candidate.geometrySha256)
  ) {
    throw new Error('manifest: geometrySha256 must be a lowercase SHA-256 hex digest');
  }
  if (!isRecord(expected)) {
    throw new Error('manifest: expected catalog identity must be an object');
  }
  if (typeof expected.partId !== 'string' || expected.partId.length === 0) {
    throw new Error('manifest: expected partId required');
  }
  if (typeof expected.family !== 'string' || expected.family.length === 0) {
    throw new Error('manifest: expected family required');
  }
  if (
    typeof expected.geometrySha256 !== 'string' ||
    !SHA256_HEX.test(expected.geometrySha256)
  ) {
    throw new Error('manifest: expected geometrySha256 must be a lowercase SHA-256 hex digest');
  }
  if (manifest.partId !== expected.partId) {
    throw new Error('manifest: partId does not match the expected catalog record');
  }
  if (manifest.family !== expected.family) {
    throw new Error('manifest: family does not match the expected catalog record');
  }
  if (candidate.geometrySha256 !== expected.geometrySha256) {
    throw new Error('manifest: geometrySha256 does not match the expected geometry');
  }
}
