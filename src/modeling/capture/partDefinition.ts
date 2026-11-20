// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Runtime side of a part file's configurations. `configurations()` checks
// every named set against a copy of the parameter table. `definePart()`
// freezes the returned solid and its numeric connector frames on the session
// that evaluated the file. Neither call reaches the filesystem.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import { FEATURE_NAME_REGEX } from '../../shared/intent/featureName';
import { currentValue } from '../../shared/runtime/editableHelpers';
import { isParamRef, type ParamRef } from '../../shared/runtime/paramRef';
import { ParamTable, type ParamValue } from '../../shared/runtime/paramTable';
import type { CaptureSession } from './captureSession';
import type { ConfigurationSet, ConfigValue } from './partConfiguration';
import { Shape } from './proxy';

const CONFIG_EXAMPLE = "configurations({ compact: { length: 80, width: 50 } })";
const DEFINE_EXAMPLE = "definePart({ shape, connectors: { foot: { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] }, normal: [0, 0, -1] } } })";
const CONNECTOR_TYPES = new Set(['frame', 'axis', 'planar', 'ball']);

export interface ResolvedPartConnector {
  readonly name: string;
  readonly type: 'frame' | 'axis' | 'planar' | 'ball';
  readonly origin: [number, number, number];
  readonly normal?: [number, number, number];
  readonly axis?: [number, number, number];
}

interface DefinedPart {
  readonly shape: Shape;
  readonly connectors: readonly ResolvedPartConnector[];
}

const definedParts = new WeakMap<CaptureSession, DefinedPart>();
const declaredConfigurations = new WeakSet<CaptureSession>();

function failConfig(path: string, got: unknown, requires: string, hintSlug: string): never {
  invalidArgs({
    api: 'configurations(sets)',
    path,
    got,
    showType: true,
    requires,
    example: CONFIG_EXAMPLE,
    hintSlug,
  });
}

function failDefine(path: string, got: unknown, requires: string, hintSlug: string): never {
  invalidArgs({
    api: 'definePart({ shape, connectors })',
    path,
    got,
    showType: true,
    requires,
    example: DEFINE_EXAMPLE,
    hintSlug,
  });
}

function readRuntimeSet(name: string, value: unknown): ConfigurationSet {
  if (!FEATURE_NAME_REGEX.test(name)) {
    failConfig(name, name, `a configuration name matching ${FEATURE_NAME_REGEX.source}`, 'invalid-args.assembly.configuration-syntax');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    failConfig(name, value, 'an object of param() values', 'invalid-args.assembly.configuration-syntax');
  }
  const values: Record<string, ConfigValue> = {};
  for (const [paramName, paramValue] of Object.entries(value as Record<string, unknown>)) {
    readRuntimeValue(name, paramName, paramValue, values);
  }
  return { name, values };
}

function readRuntimeValue(
  setName: string,
  paramName: string,
  paramValue: unknown,
  values: Record<string, ConfigValue>,
): void {
  const path = `${setName}.${paramName}`;
  if (!FEATURE_NAME_REGEX.test(paramName)) {
    failConfig(path, paramName, 'the name of a param() in this part', 'invalid-args.assembly.configuration-syntax');
  }
  const literal = typeof paramValue === 'number' || typeof paramValue === 'boolean' || typeof paramValue === 'string';
  if (!literal || (typeof paramValue === 'number' && !Number.isFinite(paramValue))) {
    failConfig(path, paramValue, 'a finite number, a boolean, or a string', 'invalid-args.assembly.configuration-invalid-value');
  }
  values[paramName] = paramValue;
}

function readRuntimeSets(input: unknown): ConfigurationSet[] {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    failConfig('sets', input, 'an object whose keys are configuration names', 'invalid-args.assembly.configuration-syntax');
  }
  return Object.entries(input as Record<string, unknown>).map(([name, value]) => readRuntimeSet(name, value));
}

function assignOnCopy(copy: ParamTable, setName: string, paramName: string, value: ParamValue): void {
  const path = `${setName}.${paramName}`;
  if (!copy.has(paramName)) {
    const known = copy.list().map((entry) => entry.name).join(', ') || '(none)';
    failConfig(path, paramName, `the name of a param() declared in this part — declared: ${known}`, 'invalid-args.assembly.configuration-unknown-param');
  }
  try {
    copy.set(paramName, value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    invalidArgs({
      api: 'configurations(sets)',
      path,
      gotText: detail,
      requires: `a legal value for param('${paramName}') in configuration '${setName}'`,
      example: CONFIG_EXAMPLE,
      hintSlug: 'invalid-args.assembly.configuration-invalid-value',
    });
  }
}

function validateSet(session: CaptureSession, set: ConfigurationSet): void {
  const copy = ParamTable.deserialize(session.paramTable.serialize());
  for (const [paramName, value] of Object.entries(set.values)) {
    assignOnCopy(copy, set.name, paramName, value);
  }
}

/** Check every named set. The live parameter table is not modified. */
export function declareConfigurations(session: CaptureSession, input: unknown): void {
  if (declaredConfigurations.has(session)) {
    failConfig('configurations()', 'a second call', 'a single configurations() call in the part file', 'invalid-args.assembly.configurations-duplicate');
  }
  for (const set of readRuntimeSets(input)) validateSet(session, set);
  declaredConfigurations.add(session);
}

function resolveNumber(value: unknown, table: ParamTable, path: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (isParamRef(value) && value._type === 'number') return currentValue(value as ParamRef<number>, table);
  failDefine(path, value, 'a finite number or a numeric param() expression', 'invalid-args.assembly.configuration-invalid-value');
}

function readTriple(path: string, value: unknown, table: ParamTable): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    failDefine(path, value, 'three numbers [x, y, z]', 'invalid-args.assembly.configuration-invalid-value');
  }
  return [
    resolveNumber(value[0], table, `${path}[0]`),
    resolveNumber(value[1], table, `${path}[1]`),
    resolveNumber(value[2], table, `${path}[2]`),
  ];
}

function readOrigin(name: string, origin: unknown, table: ParamTable): [number, number, number] {
  if (Array.isArray(origin)) return readTriple(`connectors.${name}.origin`, origin, table);
  if (origin !== null && typeof origin === 'object' && (origin as { kind?: unknown }).kind === 'vec3') {
    return readTriple(`connectors.${name}.origin.value`, (origin as { value?: unknown }).value, table);
  }
  failDefine(
    `connectors.${name}.origin`,
    origin,
    "{ kind: 'vec3', value: [x, y, z] } — a configuration interface has numeric origins",
    'invalid-args.assembly.configuration-syntax',
  );
}

function readConnector(name: string, value: unknown, table: ParamTable): ResolvedPartConnector {
  if (!FEATURE_NAME_REGEX.test(name)) {
    failDefine(`connectors.${name}`, name, `a connector name matching ${FEATURE_NAME_REGEX.source}`, 'invalid-args.assembly.configuration-syntax');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    failDefine(`connectors.${name}`, value, 'a connector with type and origin', 'invalid-args.assembly.configuration-syntax');
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.type !== 'string' || !CONNECTOR_TYPES.has(raw.type)) {
    failDefine(`connectors.${name}.type`, raw.type, "'frame', 'axis', 'planar', or 'ball'", 'invalid-args.assembly.configuration-syntax');
  }
  const normal = raw.normal === undefined ? undefined : readTriple(`connectors.${name}.normal`, raw.normal, table);
  const axis = raw.axis === undefined ? undefined : readTriple(`connectors.${name}.axis`, raw.axis, table);
  return {
    name,
    type: raw.type as ResolvedPartConnector['type'],
    origin: readOrigin(name, raw.origin, table),
    ...(normal !== undefined ? { normal } : {}),
    ...(axis !== undefined ? { axis } : {}),
  };
}

function readConnectors(input: unknown, table: ParamTable): ResolvedPartConnector[] {
  if (input === undefined) return [];
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    failDefine('connectors', input, 'an object of named connectors', 'invalid-args.assembly.configuration-syntax');
  }
  return Object.entries(input as Record<string, unknown>).map(([name, value]) => readConnector(name, value, table));
}

/** Publish the part solid. Returns that same solid. */
export function definePartShape(session: CaptureSession, input: unknown): Shape {
  if (definedParts.has(session)) {
    failDefine('definePart()', 'a second call', 'a single definePart() call in the part file', 'invalid-args.assembly.define-part-duplicate');
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    failDefine('definePart()', input, 'an object { shape, connectors? }', 'invalid-args.assembly.configuration-syntax');
  }
  const shape = (input as { shape?: unknown }).shape;
  if (!(shape instanceof Shape)) {
    failDefine('shape', shape, 'the Shape this configuration returns', 'invalid-args.assembly.configuration-no-shape');
  }
  const connectors = readConnectors((input as { connectors?: unknown }).connectors, session.paramTable);
  definedParts.set(session, { shape, connectors });
  return shape;
}

export function readDefinedPart(session: CaptureSession): DefinedPart | undefined {
  return definedParts.get(session);
}

/** Every declared parameter's value after this configuration was applied. */
export function parameterSnapshot(table: ParamTable): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};
  for (const entry of table.list()) out[entry.name] = entry.value;
  return out;
}

/** Stable connector-interface identity. Order is by connector name. */
export function interfaceSignature(connectors: readonly { name: string; type: string }[]): string {
  return [...connectors]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((connector) => `${connector.name}:${connector.type}`)
    .join(',');
}
