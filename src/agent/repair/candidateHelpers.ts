// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared plumbing for the repair candidate generators (candidates.ts and the
// per-code generator modules it dispatches to).

import * as ts from 'typescript';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { ScriptSpanIndex } from './scriptSpans';

export interface CandidateContext {
  diagnostic: CompilerDiagnostic;
  diagnosticId: string;
  /** The feature the diagnostic is attributed to. */
  record: FeatureRecord;
  recordsById: ReadonlyMap<string, FeatureRecord>;
  spans: ScriptSpanIndex;
  /** Lowered shapes from the evaluation that produced the diagnostic. The
   *  failing feature itself is usually absent; its inputs are present. */
  shapes: ReadonlyMap<string, ShapeBackend>;
}

export function callOf(ctx: CandidateContext): ts.CallExpression | undefined {
  const location = ctx.record.scriptLocation;
  if (location === undefined) return undefined;
  return ctx.spans.callNodeAt(location);
}

export function inputShape(ctx: CandidateContext, key: string): ShapeBackend | undefined {
  const ref = ctx.record.inputs[key];
  if (ref === undefined || ref.kind !== 'feature') return undefined;
  return ctx.shapes.get(ref.id);
}

export function isNumericLiteralText(text: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(text.trim());
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
