// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP `split_keep_parts`. Evaluates a script that calls `shape.split`, or
// wraps two expressions as `body.split(tool)`. Returns each kept solid's
// name, volume and bounding box. Does not change subtract or intersect.

import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import type { BuiltModel } from '../../../modeling/buildModel';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

const KEEPS = ['parts', 'intersection', 'a_only', 'b_only'] as const;
type SplitKeep = (typeof KEEPS)[number];

export interface SplitKeepPartsInput {
  file?: unknown;
  code?: unknown;
  body_code?: unknown;
  tool_code?: unknown;
  keep?: unknown;
}

export interface SplitPartMeasure {
  name: string;
  volume_mm3: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export interface SplitKeepPartsResult {
  ok: boolean;
  parts: SplitPartMeasure[];
  diagnostics: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
}

interface ScriptRequest {
  file?: string;
  code?: string;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function refused(errorCode: string, error: string): SplitKeepPartsResult {
  return { ok: false, parts: [], diagnostics: [], error, errorCode };
}

function keepOf(value: unknown): SplitKeep | SplitKeepPartsResult {
  const keep = value === undefined ? 'parts' : value;
  if (typeof keep === 'string' && (KEEPS as readonly string[]).includes(keep)) return keep as SplitKeep;
  return refused('cli.invalid-args', "keep must be 'parts', 'intersection', 'a_only', or 'b_only'.");
}

function wrap(body: string, tool: string, keep: SplitKeep): string {
  const expr = (source: string) => source.trim().replace(/;+\s*$/, '');
  const opts = keep === 'parts' ? '' : `, { keep: '${keep}' }`;
  return `return (${expr(body)}).split((${expr(tool)})${opts});`;
}

/** One of `{ file | code }` or `{ body_code, tool_code }`. `keep` is wrapper-only. */
function resolveRequest(input: SplitKeepPartsInput): ScriptRequest | SplitKeepPartsResult {
  const file = text(input.file);
  const code = text(input.code);
  const body = text(input.body_code);
  const tool = text(input.tool_code);
  const wrapper = body !== undefined || tool !== undefined;
  if (wrapper && (file !== undefined || code !== undefined)) {
    return refused('cli.invalid-args', 'Pass file or code, or body_code and tool_code, not both.');
  }
  if (wrapper) {
    if (body === undefined || tool === undefined) {
      return refused('cli.invalid-args', 'Pass both body_code and tool_code. Each is a Shape expression.');
    }
    const keep = keepOf(input.keep);
    if (typeof keep !== 'string') return keep;
    return { code: wrap(body, tool, keep) };
  }
  if (input.keep !== undefined) {
    return refused('cli.invalid-args', 'keep applies to body_code and tool_code. Put keep in the script when you pass file or code.');
  }
  if ((file === undefined) === (code === undefined)) {
    return refused('cli.invalid-args', 'Pass file or code that calls shape.split, or body_code and tool_code.');
  }
  return file !== undefined ? { file } : { code };
}

function measure(name: string, shape: ShapeBackend): SplitPartMeasure {
  const box = shape.boundingBox();
  return {
    name,
    volume_mm3: shape.volume(),
    bbox: {
      min: [box.min[0], box.min[1], box.min[2]],
      max: [box.max[0], box.max[1], box.max[2]],
    },
  };
}

function singleName(model: BuiltModel): string {
  const root = model.rootId === undefined ? undefined : model.records.find((record) => record.id === model.rootId);
  if (root?.kind !== 'booleanSplit') return 'shape';
  const fragment = root.metadata?.fragment;
  if (typeof fragment === 'string') return fragment;
  const keep = String(root.params.keep?.expression ?? '').replace(/'/g, '');
  return keep === '' || keep === 'parts' ? 'shape' : keep;
}

function partsOf(model: BuiltModel): SplitPartMeasure[] {
  const root = model.rootShape;
  if (root === undefined) return [];
  if (isSceneBackend(root)) return root.parts.map((part) => measure(part.name, part.shape));
  return [measure(singleName(model), root)];
}

function sawSplit(model: BuiltModel): boolean {
  return model.records.some((record) => record.kind === 'booleanSplit' && record.metadata?.splitRole !== 'fragment');
}

function report(model: BuiltModel | undefined, diagnostics: CompilerDiagnostic[], exitCode: number): SplitKeepPartsResult {
  if (model === undefined || !sawSplit(model)) {
    const error = diagnostics.find((item) => item.severity === 'error')?.message
      ?? 'The script must call shape.split. subtract and intersect still return one Shape.';
    return { ok: false, parts: [], diagnostics, error, errorCode: 'feature.invalid-args' };
  }
  const parts = partsOf(model);
  if (exitCode !== 0 || parts.length === 0) {
    const error = diagnostics.find((item) => item.severity === 'error')?.message ?? 'split produced no kept solid.';
    return { ok: false, parts, diagnostics, error, errorCode: diagnostics.find((item) => item.severity === 'error')?.code ?? 'feature.invalid-args' };
  }
  return { ok: true, parts, diagnostics };
}

/** Measure the solids `shape.split` kept. Writes nothing and does not replace the active session. */
export async function splitKeepPartsTool(input: SplitKeepPartsInput): Promise<SplitKeepPartsResult> {
  const request = resolveRequest(input);
  if ('ok' in request) return request;
  const built = await evaluateAndBuildScript(request);
  return report(built.model, built.evaluation.diagnostics, built.evaluation.exitCode);
}
