// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `assembly.instance` evaluates one named configuration of a part file in a
// fresh parameter table and parks a clone of that solid on the parent
// session. The part file's own parameters never write the assembly's table.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import { FEATURE_NAME_REGEX } from '../../shared/intent/featureName';
import { requireHostFs } from '../../shared/runtime/hostFs';
import type { Shape } from './proxy';
import { Shape as ShapeValue } from './proxy';
import { recordPartInternal } from './assemblyParts';
import type { Assembly } from './assembly';
import type { AssemblyState } from './assemblyState';
import type { AssemblyPartOpts, AssemblyPartRef } from './assemblyTypes';
import type { PartConfigurationIdentity, PartConfigurationRef } from './partConfigurationTypes';
import {
  assertConfigurationAssignments,
  configurationByName,
  partEvalMemoKey,
  readConfigurations,
  rewriteParamsForConfiguration,
} from './partConfiguration';
import {
  interfaceSignature,
  parameterSnapshot,
  readDefinedPart,
  type ResolvedPartConnector,
} from './partDefinition';
import { runPartSource } from './partSourceRunner';

const INSTANCE_EXAMPLE = "arm.instance('block', { source: './part.kcad.ts', configuration: 'compact' })";
const PART_OPT_KEYS = ['at', 'density', 'material', 'process', 'stock', 'massKg', 'crossSection', 'role', 'overlay'] as const;

type ParkedSolid = Awaited<ReturnType<Shape['lower']>>;

interface MemoEntry {
  readonly master: ParkedSolid;
  readonly connectors: readonly ResolvedPartConnector[];
  readonly parameters: Readonly<Record<string, number | boolean | string>>;
  readonly interfaceSignature: string;
}

interface LoadedPart {
  readonly absolutePath: string;
  readonly scriptDir: string;
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly text: string;
}

interface InstanceRequest {
  readonly source: string;
  readonly configuration: string;
  readonly partOpts: AssemblyPartOpts;
}

const partEvalMemo = new Map<string, MemoEntry>();

function failInstance(path: string, got: unknown, requires: string, hintSlug: string, gotText?: string): never {
  invalidArgs({
    api: 'instance(name, opts)',
    path,
    ...(gotText !== undefined ? { gotText } : { got, showType: true }),
    requires,
    example: INSTANCE_EXAMPLE,
    hintSlug,
  });
}

function readInstanceRequest(opts: unknown): InstanceRequest {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    failInstance('opts', opts, 'an object with source and configuration', 'invalid-args.assembly.configuration-syntax');
  }
  const raw = opts as Record<string, unknown>;
  if (typeof raw.source !== 'string' || raw.source.length === 0) {
    failInstance('source', raw.source, 'a path to the part .kcad.ts file', 'invalid-args.assembly.configuration-syntax');
  }
  if (typeof raw.configuration !== 'string' || !FEATURE_NAME_REGEX.test(raw.configuration)) {
    failInstance('configuration', raw.configuration, `a configuration name matching ${FEATURE_NAME_REGEX.source}`, 'invalid-args.assembly.configuration-syntax');
  }
  if ('connectors' in raw || 'connect' in raw) {
    failInstance('opts.connectors', raw.connectors ?? raw.connect, 'connectors declared by definePart() in the part file, not on instance()', 'invalid-args.assembly.configuration-syntax');
  }
  const partOpts: AssemblyPartOpts = {};
  for (const key of PART_OPT_KEYS) {
    if (raw[key] !== undefined) (partOpts as Record<string, unknown>)[key] = raw[key];
  }
  return { source: raw.source, configuration: raw.configuration, partOpts };
}

function loadPartSource(scriptDir: string | undefined, source: string): LoadedPart {
  const fs = requireHostFs('assembly.instance()');
  const absolutePath = fs.resolveScriptRelative(scriptDir, source);
  if (!fs.fileExists(absolutePath)) {
    failInstance('source', source, `an existing part file — looked for ${absolutePath}`, 'invalid-args.assembly.configuration-source-missing');
  }
  let bytes: Uint8Array;
  try {
    bytes = fs.readFileBytes(absolutePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    failInstance('source', source, `a readable part file — ${detail}`, 'invalid-args.assembly.configuration-source-missing');
  }
  const slash = Math.max(absolutePath.lastIndexOf('/'), absolutePath.lastIndexOf('\\'));
  return {
    absolutePath,
    scriptDir: slash < 0 ? '' : absolutePath.slice(0, slash),
    fileName: slash < 0 ? absolutePath : absolutePath.slice(slash + 1),
    bytes,
    text: new TextDecoder().decode(bytes),
  };
}

function definedShape(child: { session: import('./captureSession').CaptureSession; returnValue: unknown }): {
  shape: Shape;
  connectors: readonly ResolvedPartConnector[];
} {
  const defined = readDefinedPart(child.session);
  if (defined) return defined;
  if (child.returnValue instanceof ShapeValue) return { shape: child.returnValue, connectors: [] };
  failInstance(
    'source',
    child.returnValue,
    'a part file that returns a Shape, or definePart({ shape })',
    'invalid-args.assembly.configuration-no-shape',
  );
}

async function evaluateConfiguredPart(source: LoadedPart, configuration: string): Promise<MemoEntry> {
  const set = configurationByName(readConfigurations(source.text), configuration);
  assertConfigurationAssignments(source.text, set);
  const key = partEvalMemoKey(source.bytes, configuration, set.values);
  const cached = partEvalMemo.get(key);
  if (cached) return cached;
  const { initOcct } = await import('../../kernel/backends/occt/backendInit');
  await initOcct();
  const child = await runPartSource({
    code: rewriteParamsForConfiguration(source.text, set.values),
    fileName: source.fileName,
    scriptDir: source.scriptDir,
  });
  const built = definedShape(child);
  const entry: MemoEntry = {
    master: (await built.shape.lower()).clone(),
    connectors: built.connectors,
    parameters: parameterSnapshot(child.paramTable),
    interfaceSignature: interfaceSignature(built.connectors),
  };
  partEvalMemo.set(key, entry);
  return entry;
}

function assertCompatibleInterface(
  state: AssemblyState,
  source: string,
  configuration: string,
  signature: string,
): void {
  const previous = state.configurationInterfaces.get(source);
  if (previous !== undefined && previous.signature !== signature) {
    failInstance(
      'configuration',
      configuration,
      `the same connector interface as configuration '${previous.name}' (${previous.signature || '(none)'}), but '${configuration}' declares ${signature || '(none)'}`,
      'invalid-args.assembly.configuration-interface-mismatch',
      `configuration '${configuration}' interface ${signature || '(none)'}`,
    );
  }
  if (previous === undefined) state.configurationInterfaces.set(source, { name: configuration, signature });
}

function parkClone(session: AssemblyState['session'], master: ParkedSolid): Shape {
  const shape = session.createShape({ kind: 'importedBrep', params: {}, inputs: {} });
  session.importedGeometry.set(shape.id, master.clone());
  return shape;
}

function registerConnectors(
  part: AssemblyPartRef,
  connectors: readonly ResolvedPartConnector[],
  ref: PartConfigurationRef,
): void {
  for (const connector of connectors) {
    part.connector(connector.name, {
      type: connector.type,
      origin: { kind: 'vec3', value: connector.origin },
      ...(connector.normal !== undefined ? { normal: connector.normal } : {}),
      ...(connector.axis !== undefined ? { axis: connector.axis } : {}),
    });
    const stored = part.mateConnectors[part.mateConnectors.length - 1];
    if (stored) (stored as { configuration?: PartConfigurationRef }).configuration = ref;
  }
}

/** Evaluate `opts.configuration` of `opts.source` and record it as `name`. */
export async function instantiateConfiguredPart(
  state: AssemblyState,
  arm: Assembly,
  name: string,
  opts: unknown,
): Promise<AssemblyPartRef> {
  requireHostFs('assembly.instance()');
  const request = readInstanceRequest(opts);
  const source = loadPartSource(state.session.scriptDir, request.source);
  const evaluated = await evaluateConfiguredPart(source, request.configuration);
  assertCompatibleInterface(state, source.absolutePath, request.configuration, evaluated.interfaceSignature);
  const shape = parkClone(state.session, evaluated.master);
  const identity: PartConfigurationIdentity = {
    source: source.absolutePath,
    sourceRef: request.source,
    name: request.configuration,
    parameters: evaluated.parameters,
    interfaceSignature: evaluated.interfaceSignature,
  };
  const part = recordPartInternal(state, arm, name, shape, request.partOpts, false, identity);
  registerConnectors(part, evaluated.connectors, { source: identity.source, name: identity.name });
  return part;
}
