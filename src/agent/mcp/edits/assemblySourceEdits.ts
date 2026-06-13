// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ConnectorOrigin, ConnectorType } from '../../../modeling/mates/connector';
import type { MateLimitRange, MatePose } from '../../../modeling/mates/mate';
import type { MateType } from '../../../modeling/mates/mateTypes';
import type { TransmissionKind } from '../../../modeling/capture/assembly';
import type { Vec3 } from '../../../shared/intent/types';
import {
  bindingExists,
  formatJsValue,
  insertStatementBeforeLastTopLevelReturn,
  isValidIdentifier,
  quoteString,
  replaceLastTopLevelReturn,
  type SourceEditResult,
} from './sourceEditUtils';

export type { SourceEditResult };

export interface AddAssemblyPartSourceInput {
  code: string;
  assembly_binding: string;
  part_name: string;
  shape_expression: string;
  binding_name?: string;
  at?: Vec3;
}

export interface AddPartConnectorSourceInput {
  code: string;
  part_binding: string;
  name: string;
  type: ConnectorType;
  origin: Vec3 | ConnectorOrigin;
  axis?: Vec3;
  normal?: Vec3;
}

export interface AddMateSourceInput {
  code: string;
  assembly_binding: string;
  name: string;
  a: string;
  b: string;
  type: MateType;
  pose?: MatePose;
  limitsDeg?: MateLimitRange;
  limitsMm?: MateLimitRange;
}

export interface AddMateCouplingSourceInput {
  code: string;
  assembly_binding: string;
  driven: string;
  source: string;
  ratio: number;
  offset?: number;
}

export interface AddTransmissionSourceInput {
  code: string;
  assembly_binding: string;
  name: string;
  kind: TransmissionKind;
  sourceMate: string;
  drivenMates: string[];
  actuator?: string;
  input?: string;
  output?: string;
  path: string[];
  ratio?: number;
  notes?: string;
}

export interface AddWorkspaceTargetSourceInput {
  code: string;
  assembly_binding: string;
  connector_ref: string;
  reachable: Vec3[];
  toleranceMm?: number;
}

export interface SetSceneReturnSourceInput {
  code: string;
  assembly_binding: string;
  mode: 'model' | 'solvedModel';
  poses?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export type AssemblySourceEditResult = SourceEditResult & { binding_name?: string };

export function addAssemblyPartSource(input: AddAssemblyPartSourceInput): AssemblySourceEditResult {
  const baseError = validateSourceBasics(input.code, input.assembly_binding);
  if (baseError) return baseError;
  if (!isNonEmptyString(input.part_name)) return { ok: false, error: 'add_part: part_name must be a non-empty string.' };
  if (!isNonEmptyString(input.shape_expression)) return { ok: false, error: 'add_part: shape_expression must be a non-empty string.' };
  if (input.at !== undefined && !isVec3(input.at)) return { ok: false, error: 'add_part: at must be a finite Vec3 when provided.' };

  const binding = input.binding_name ?? derivePartBinding(input.code, input.part_name);
  if (!isValidIdentifier(binding)) {
    return { ok: false, error: `add_part: binding_name must be a JS identifier; got ${JSON.stringify(binding)}.` };
  }

  const args = [
    quoteString(input.part_name),
    input.shape_expression.trim(),
    ...(input.at !== undefined ? [`{ at: ${formatJsValue(input.at)} }`] : []),
  ];
  const edit = insertStatementBeforeLastTopLevelReturn(
    input.code,
    `const ${binding} = ${input.assembly_binding}.part(${args.join(', ')});`,
  );
  return edit.ok ? { ...edit, binding_name: binding } : edit;
}

export function addPartConnectorSource(input: AddPartConnectorSourceInput): SourceEditResult {
  if (!isNonEmptyString(input.code)) return { ok: false, error: 'add_connector: code must be a non-empty string.' };
  const partError = validateIdentifierField('add_connector', 'part_binding', input.part_binding);
  if (partError) return partError;
  if (!isNonEmptyString(input.name)) return { ok: false, error: 'add_connector: name must be a non-empty string.' };
  if (!isConnectorType(input.type)) return { ok: false, error: `add_connector: unsupported connector type '${String(input.type)}'.` };
  const origin = normalizeOrigin(input.origin);
  if (origin === undefined) return { ok: false, error: 'add_connector: origin must be a Vec3 shorthand or ConnectorOrigin object.' };
  if (input.axis !== undefined && !isVec3(input.axis)) return { ok: false, error: 'add_connector: axis must be a finite Vec3 when provided.' };
  if (input.normal !== undefined && !isVec3(input.normal)) return { ok: false, error: 'add_connector: normal must be a finite Vec3 when provided.' };

  const opts = {
    type: input.type,
    origin,
    ...(input.axis !== undefined ? { axis: input.axis } : {}),
    ...(input.normal !== undefined ? { normal: input.normal } : {}),
  };
  return insertStatementBeforeLastTopLevelReturn(
    input.code,
    `${input.part_binding}.connector(${quoteString(input.name)}, ${formatJsValue(opts)});`,
  );
}

export function addMateSource(input: AddMateSourceInput): SourceEditResult {
  const baseError = validateSourceBasics(input.code, input.assembly_binding);
  if (baseError) return baseError;
  for (const field of ['name', 'a', 'b'] as const) {
    if (!isNonEmptyString(input[field])) return { ok: false, error: `add_mate: ${field} must be a non-empty string.` };
  }
  if (!isMateType(input.type)) return { ok: false, error: `add_mate: unsupported mate type '${String(input.type)}'.` };
  const opts = {
    ...(input.pose !== undefined ? { pose: input.pose } : {}),
    ...(input.limitsDeg !== undefined ? { limitsDeg: input.limitsDeg } : {}),
    ...(input.limitsMm !== undefined ? { limitsMm: input.limitsMm } : {}),
  };
  const hasOpts = Object.keys(opts).length > 0;
  const args = [
    quoteString(input.name),
    quoteString(input.a),
    quoteString(input.b),
    quoteString(input.type),
    ...(hasOpts ? [formatJsValue(opts)] : []),
  ];
  return insertStatementBeforeLastTopLevelReturn(input.code, `${input.assembly_binding}.mate(${args.join(', ')});`);
}

export function addMateCouplingSource(input: AddMateCouplingSourceInput): SourceEditResult {
  const baseError = validateSourceBasics(input.code, input.assembly_binding);
  if (baseError) return baseError;
  if (!isNonEmptyString(input.driven)) return { ok: false, error: 'add_mate: driven must be a non-empty string.' };
  if (!isNonEmptyString(input.source)) return { ok: false, error: 'add_mate: source must be a non-empty string.' };
  if (!Number.isFinite(input.ratio)) return { ok: false, error: 'add_mate: ratio must be finite.' };
  if (input.offset !== undefined && !Number.isFinite(input.offset)) return { ok: false, error: 'add_mate: offset must be finite when provided.' };
  return insertStatementBeforeLastTopLevelReturn(
    input.code,
    `${input.assembly_binding}.coupleMates(${quoteString(input.driven)}, ${formatJsValue({
      source: input.source,
      ratio: input.ratio,
      ...(input.offset !== undefined ? { offset: input.offset } : {}),
    })});`,
  );
}

export function addTransmissionSource(input: AddTransmissionSourceInput): SourceEditResult {
  const baseError = validateSourceBasics(input.code, input.assembly_binding);
  if (baseError) return baseError;
  if (!isNonEmptyString(input.name)) return { ok: false, error: 'add_mate: name must be a non-empty string.' };
  if (!isTransmissionKind(input.kind)) return { ok: false, error: `add_mate: unsupported kind '${String(input.kind)}'.` };
  if (!isNonEmptyString(input.sourceMate)) return { ok: false, error: 'add_mate: sourceMate must be a non-empty string.' };
  if (!isStringArray(input.drivenMates, true)) return { ok: false, error: 'add_mate: drivenMates must be a non-empty string array.' };
  if (!isStringArray(input.path, true)) return { ok: false, error: 'add_mate: path must be a non-empty string array.' };
  for (const field of ['actuator', 'input', 'output', 'notes'] as const) {
    if (input[field] !== undefined && !isNonEmptyString(input[field])) {
      return { ok: false, error: `add_mate: ${field} must be a non-empty string when provided.` };
    }
  }
  if (input.ratio !== undefined && !Number.isFinite(input.ratio)) return { ok: false, error: 'add_mate: ratio must be finite when provided.' };

  return insertStatementBeforeLastTopLevelReturn(
    input.code,
    `${input.assembly_binding}.transmission(${quoteString(input.name)}, ${formatJsValue({
      kind: input.kind,
      sourceMate: input.sourceMate,
      drivenMates: input.drivenMates,
      ...(input.actuator !== undefined ? { actuator: input.actuator } : {}),
      ...(input.input !== undefined ? { input: input.input } : {}),
      ...(input.output !== undefined ? { output: input.output } : {}),
      path: input.path,
      ...(input.ratio !== undefined ? { ratio: input.ratio } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    })});`,
  );
}

export function addWorkspaceTargetSource(input: AddWorkspaceTargetSourceInput): SourceEditResult {
  const baseError = validateSourceBasics(input.code, input.assembly_binding);
  if (baseError) return baseError;
  if (!isNonEmptyString(input.connector_ref)) return { ok: false, error: 'add_workspace_target: connector_ref must be a non-empty string.' };
  if (!Array.isArray(input.reachable) || input.reachable.length === 0 || !input.reachable.every(isVec3)) {
    return { ok: false, error: 'add_workspace_target: reachable must be a non-empty Vec3 array.' };
  }
  if (input.toleranceMm !== undefined && (!Number.isFinite(input.toleranceMm) || input.toleranceMm < 0)) {
    return { ok: false, error: 'add_workspace_target: toleranceMm must be finite and non-negative when provided.' };
  }
  return insertStatementBeforeLastTopLevelReturn(
    input.code,
    `${input.assembly_binding}.workspace(${quoteString(input.connector_ref)}, ${formatJsValue({
      reachable: input.reachable,
      ...(input.toleranceMm !== undefined ? { toleranceMm: input.toleranceMm } : {}),
    })});`,
  );
}

export function setSceneReturnSource(input: SetSceneReturnSourceInput): SourceEditResult {
  const baseError = validateSourceBasics(input.code, input.assembly_binding);
  if (baseError) return baseError;
  if (input.mode !== 'model' && input.mode !== 'solvedModel') {
    return { ok: false, error: "set_scene_return: mode must be 'model' or 'solvedModel'." };
  }

  if (input.mode === 'model') {
    return replaceLastTopLevelReturn(input.code, `return ${input.assembly_binding}.model();`);
  }
  const poses = input.poses ?? {};
  const args = [formatJsValue(poses), ...(input.options !== undefined ? [formatJsValue(input.options)] : [])];
  return replaceLastTopLevelReturn(input.code, `return ${input.assembly_binding}.solvedModel(${args.join(', ')});`);
}

function validateSourceBasics(code: string, assemblyBinding: string): SourceEditResult | undefined {
  if (!isNonEmptyString(code)) return { ok: false, error: 'code must be a non-empty string.' };
  return validateIdentifierField('assembly source edit', 'assembly_binding', assemblyBinding);
}

function validateIdentifierField(tool: string, field: string, value: unknown): SourceEditResult | undefined {
  if (typeof value !== 'string' || !isValidIdentifier(value)) {
    return { ok: false, error: `${tool}: ${field} must be a JS identifier; got ${JSON.stringify(value)}.` };
  }
  return undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every(coord => typeof coord === 'number' && Number.isFinite(coord));
}

function normalizeOrigin(value: Vec3 | ConnectorOrigin): ConnectorOrigin | undefined {
  if (isVec3(value)) return { kind: 'vec3', value };
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as { kind?: unknown }).kind === 'string') {
    return value as ConnectorOrigin;
  }
  return undefined;
}

function isStringArray(value: unknown, requireNonEmpty: boolean): value is string[] {
  return Array.isArray(value) &&
    (!requireNonEmpty || value.length > 0) &&
    value.every(isNonEmptyString);
}

function isConnectorType(value: unknown): value is ConnectorType {
  return value === 'frame' || value === 'axis' || value === 'planar' || value === 'ball';
}

function isMateType(value: unknown): value is MateType {
  return value === 'fastened' ||
    value === 'revolute' ||
    value === 'prismatic' ||
    value === 'cylindrical' ||
    value === 'planar' ||
    value === 'ball' ||
    value === 'pin_slot';
}

function isTransmissionKind(value: unknown): value is TransmissionKind {
  return value === 'direct-horn' ||
    value === 'link-rod' ||
    value === 'four-bar' ||
    value === 'gear-pair' ||
    value === 'belt' ||
    value === 'tendon';
}

function derivePartBinding(code: string, partName: string): string {
  const base = `${toCamelIdentifier(partName)}Part`;
  if (!bindingExists(code, base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}${i}`;
    if (!bindingExists(code, candidate)) return candidate;
  }
  return `${base}${Date.now()}`;
}

function toCamelIdentifier(value: string): string {
  const words = value.match(/[A-Za-z0-9_$]+/g) ?? ['part'];
  const [first, ...rest] = words;
  const head = first.replace(/^[0-9]+/, '') || 'part';
  const body = rest.map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('');
  const candidate = `${head.slice(0, 1).toLowerCase()}${head.slice(1)}${body}`;
  return isValidIdentifier(candidate) ? candidate : 'part';
}
