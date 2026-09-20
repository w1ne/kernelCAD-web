// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/addPatternFeature.ts
//
// Typed AST-edit MCP tool — composes a Shape.patternLinear / .patternCircular /
// .patternGrid call from structured input and inserts it via the shared
// addFeature helper, then re-evaluates the script.

import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool } from './evaluateScript';
import { validateLinear, validateCircular, validateGridAxis } from '../../../shared/intent/patternValidation';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

type Vec3Tuple = [number, number, number];

export interface AddPatternFeatureInput {
  code: string;
  target: string;
  kind: 'linear' | 'circular' | 'grid';
  linear?: { count: number; direction: Vec3Tuple; spacing: number };
  circular?: { count: number; axis: Vec3Tuple; angleDeg?: number };
  grid?: {
    x: { count: number; direction: Vec3Tuple; spacing: number };
    y: { count: number; direction: Vec3Tuple; spacing: number };
  };
  assign_to?: string;
}

export interface AddPatternFeatureOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: 'feature.pattern.count-out-of-range' | 'feature.invalid-args';
}

function fmtVec3(v: Vec3Tuple): string {
  return `[${v[0]}, ${v[1]}, ${v[2]}]`;
}

type PatternCallResult =
  | { error: AddPatternFeatureOutput }
  | { call: string };

function buildLinearCall(input: AddPatternFeatureInput): PatternCallResult {
  if (!input.linear) return { error: { ok: false, error: "kind: 'linear' requires the `linear` field.", errorCode: 'feature.invalid-args' } };
  const err = validateLinear(input.linear);
  if (err) {
    const code = err.field === 'count'
      ? 'feature.pattern.count-out-of-range'
      : 'feature.invalid-args';
    return { error: { ok: false, error: err.message, errorCode: code } };
  }
  return { call: `${input.target}.patternLinear({ count: ${input.linear.count}, direction: ${fmtVec3(input.linear.direction)}, spacing: ${input.linear.spacing} });` };
}

function buildCircularCall(input: AddPatternFeatureInput): PatternCallResult {
  if (!input.circular) return { error: { ok: false, error: "kind: 'circular' requires the `circular` field.", errorCode: 'feature.invalid-args' } };
  const angleDeg = input.circular.angleDeg ?? 360;
  const err = validateCircular({ count: input.circular.count, axis: input.circular.axis, angleDeg });
  if (err) {
    const code = err.field === 'count'
      ? 'feature.pattern.count-out-of-range'
      : 'feature.invalid-args';
    return { error: { ok: false, error: err.message, errorCode: code } };
  }
  const angleClause = input.circular.angleDeg !== undefined ? `, angleDeg: ${input.circular.angleDeg}` : '';
  return { call: `${input.target}.patternCircular({ count: ${input.circular.count}, axis: ${fmtVec3(input.circular.axis)}${angleClause} });` };
}

function buildGridCall(input: AddPatternFeatureInput): PatternCallResult {
  if (!input.grid) return { error: { ok: false, error: "kind: 'grid' requires the `grid` field.", errorCode: 'feature.invalid-args' } };
  const xErr = validateGridAxis('x', input.grid.x);
  if (xErr) {
    const code = xErr.field.endsWith('count') ? 'feature.pattern.count-out-of-range' : 'feature.invalid-args';
    return { error: { ok: false, error: xErr.message, errorCode: code } };
  }
  const yErr = validateGridAxis('y', input.grid.y);
  if (yErr) {
    const code = yErr.field.endsWith('count') ? 'feature.pattern.count-out-of-range' : 'feature.invalid-args';
    return { error: { ok: false, error: yErr.message, errorCode: code } };
  }
  return { call: `${input.target}.patternGrid({ x: { count: ${input.grid.x.count}, direction: ${fmtVec3(input.grid.x.direction)}, spacing: ${input.grid.x.spacing} }, y: { count: ${input.grid.y.count}, direction: ${fmtVec3(input.grid.y.direction)}, spacing: ${input.grid.y.spacing} } });` };
}

function buildPatternCall(input: AddPatternFeatureInput): PatternCallResult {
  if (input.kind === 'linear') return buildLinearCall(input);
  if (input.kind === 'circular') return buildCircularCall(input);
  if (input.kind === 'grid') return buildGridCall(input);
  return { error: { ok: false, error: `kind must be 'linear' | 'circular' | 'grid'; got ${String(input.kind)}.`, errorCode: 'feature.invalid-args' } };
}

export async function addPatternFeatureTool(
  input: AddPatternFeatureInput,
): Promise<AddPatternFeatureOutput> {
  // 1. Kind-arg combo validation.
  if (!input.target || typeof input.target !== 'string') {
    return { ok: false, error: 'target must be a non-empty string.', errorCode: 'feature.invalid-args' };
  }
  const built = buildPatternCall(input);
  if ('error' in built) return built.error;
  const call = built.call;

  const feature_code = input.assign_to ? `const ${input.assign_to} = ${call}` : call;
  const edit = addFeature(input.code, feature_code);
  if (!edit.ok || !edit.new_code) return { ok: false, error: edit.error };
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return { ok: evalResult.ok, new_code: edit.new_code, diagnostics: evalResult.diagnostics };
}
