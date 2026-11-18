// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Top-level `refuse` envelope for evaluate_script failures. Agents key off
// the first error diagnostic instead of scanning the full diagnostics list.

import type { CompilerDiagnostic } from './diagnostic';
import { HINT_TEMPLATES, type DiagnosticCode } from './registry';

export interface EvaluateRefuseLocation {
  featureId?: string;
  param?: string;
  scriptLocation?: {
    line?: number;
    column?: number;
    path?: string;
  };
}

export interface EvaluateRefuse {
  code: string;
  message: string;
  location?: EvaluateRefuseLocation;
  /** Actionable recovery hint (`diagnostic.hint`, else the code's hint template). */
  try: string;
}

const GENERIC_TRY = 'Fix the reported error and re-evaluate.';

/** First error diagnostic as a refuse envelope. Warnings-only (or empty) → undefined. */
export function refuseFromDiagnostics(
  diags: readonly CompilerDiagnostic[],
): EvaluateRefuse | undefined {
  const error = diags.find((d) => d.severity === 'error');
  if (error === undefined) return undefined;
  const location = refuseLocation(error);
  return {
    code: typeof error.code === 'string' ? error.code : '',
    message: typeof error.message === 'string' ? error.message : '',
    ...(location !== undefined ? { location } : {}),
    try: refuseTry(error),
  };
}

/** Spread onto an evaluate result. Omitted when `ok` or when no error exists. */
export function refuseEnvelope(
  ok: boolean,
  diagnostics: readonly CompilerDiagnostic[],
): { refuse: EvaluateRefuse } | undefined {
  if (ok) return undefined;
  const refuse = refuseFromDiagnostics(diagnostics);
  return refuse === undefined ? undefined : { refuse };
}

function refuseTry(diagnostic: CompilerDiagnostic): string {
  const hint = nonEmptyString(diagnostic.hint);
  if (hint !== undefined) return hint;
  const template = hintTemplateFor(diagnostic.code);
  return template !== undefined ? template : GENERIC_TRY;
}

function hintTemplateFor(code: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(HINT_TEMPLATES, code)) return undefined;
  return nonEmptyString(HINT_TEMPLATES[code as DiagnosticCode].template);
}

function refuseLocation(diagnostic: CompilerDiagnostic): EvaluateRefuseLocation | undefined {
  const featureId = nonEmptyString(diagnostic.featureId);
  const param = nonEmptyString(diagnostic.details?.param);
  const scriptLocation = scriptLocationOf(diagnostic.scriptLocation);
  if (featureId === undefined && param === undefined && scriptLocation === undefined) return undefined;
  return {
    ...(featureId !== undefined ? { featureId } : {}),
    ...(param !== undefined ? { param } : {}),
    ...(scriptLocation !== undefined ? { scriptLocation } : {}),
  };
}

function scriptLocationOf(
  loc: CompilerDiagnostic['scriptLocation'],
): EvaluateRefuseLocation['scriptLocation'] | undefined {
  if (loc === undefined) return undefined;
  const line = finiteNumber(loc.line);
  const column = finiteNumber(loc.column);
  const path = nonEmptyString(loc.file);
  if (line === undefined && column === undefined && path === undefined) return undefined;
  return {
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
    ...(path !== undefined ? { path } : {}),
  };
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
