// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/invalidArgs.ts
//
// One shared raiser for `feature.invalid-args` / `cli.invalid-args`.
//
// `feature.invalid-args` is the single most common failure authoring agents
// hit (74 of 472 real `evaluate_script` calls over 2026-09-29 → 10-03, and the
// top cause of hosted-agent gate failures). The retry loop seen in telemetry —
// the same call shape re-sent 3–8 times — happens when the message says *that*
// an argument is wrong but not *what to write instead*. So every message built
// here names, in this order:
//
//   1. the API and the argument path  — `hole(face, { diameter })`, `opts.positions[2].u`
//   2. what was received              — the value (and its type when the type is the problem)
//   3. what is required               — range, units, allowed set, or relation to another argument
//   4. one minimal correct example    — inline, copy-pasteable
//
// Rendered shape (one or two lines):
//
//   hole(face, { diameter }): opts.diameter — got 0; requires a finite number
//   > 0 and ≤ 1000 (mm). Example: plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through' })
//
// Call `invalidArgs({...})` instead of `new KernelError('feature.invalid-args', ...)`.
// `tests/diagnostics/invalidArgsHelper.lint.test.ts` is a ratchet over the
// remaining hand-rolled raise sites: the per-file counts may shrink, never grow.

import { KernelError } from './kernelError';
import { formatScalarForError } from './types';
import type { DiagnosticCode } from '../diagnostics/registry';

/** Long received values are truncated so one bad 400-point array cannot bury
 *  the requirement and the example at the end of the message. */
export const MAX_GOT_CHARS = 120;

/** Units kernelCAD arguments carry. Linear is always mm, angular always deg —
 *  naming the unit in the message is what stops the "I passed cm" retry. */
export type ArgUnit = 'mm' | 'deg' | 'mm²' | 'mm³' | 'mm/s' | 'count' | 'ratio' | 'unitless';

export interface InvalidArgsSpec {
  /**
   * The call signature with the offending argument named, e.g.
   * `hole(face, { diameter })`, `spurGear({ teeth })`, `param(name, { min })`.
   */
  api: string;
  /**
   * The argument path exactly as the author writes it in the script, e.g.
   * `opts.positions[2].u`, `opts.counterbore.diameter`. Use `''` when the whole
   * argument object is wrong.
   */
  path?: string;
  /** The received value. Formatted with `formatScalarForError` and truncated. */
  got?: unknown;
  /** Pre-rendered received text, for when `got` is not a single value. */
  gotText?: string;
  /** Append `(type)` to the received value — set when the *type* is the problem. */
  showType?: boolean;
  /**
   * What is required, as a phrase that completes "requires …": a range, an
   * allowed set, or — when the cause is a relationship — the relationship and
   * BOTH values, e.g. `counterbore.diameter > diameter; diameter is 5 mm`.
   */
  requires: string;
  /** One minimal correct call, inline and copy-pasteable. */
  example: string;
  /** Unit of the argument, named explicitly. Omit for non-dimensional args. */
  unit?: ArgUnit;
  featureId?: string;
  /**
   * Defaults to `feature.invalid-args`. Pass `cli.invalid-args` for CLI/tool
   * args, or a narrower registered code when one already exists for the field
   * (e.g. `feature.sheetMetal.kfactor-invalid`) — the code raised must not
   * change, only the text.
   */
  code?: DiagnosticCode;
  /**
   * Replace the generated hint. Only for the handful of cases that can explain
   * *how to get what the author wanted* a different way (e.g. the thread
   * clearance cap, where the fix is to grow the nominal diameter instead).
   * The message still carries path/value/requirement/example.
   */
  hint?: string;
}

function truncate(text: string): string {
  if (text.length <= MAX_GOT_CHARS) return text;
  return `${text.slice(0, MAX_GOT_CHARS - 1)}…`;
}

/** `formatScalarForError`, truncated, with the JS type appended on request. */
export function describeArgValue(value: unknown, showType = false): string {
  const rendered = truncate(formatScalarForError(value));
  if (!showType) return rendered;
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  return `${rendered} (${type})`;
}

function receivedText(spec: InvalidArgsSpec): string {
  if (spec.gotText !== undefined) return truncate(spec.gotText);
  if (!('got' in spec)) return 'nothing';
  return describeArgValue(spec.got, spec.showType);
}

function unitSuffix(unit: ArgUnit | undefined): string {
  return unit === undefined || unit === 'unitless' ? '' : ` (${unit})`;
}

/**
 * Render the message + hint without building an error — for the lowerer paths
 * that `diagnostics.push({ code: 'feature.invalid-args', ... })` instead of
 * throwing. Same four-part shape, so a lowered arg error reads like a
 * capture-time one.
 */
export function invalidArgsText(spec: InvalidArgsSpec): { message: string; hint: string } {
  const target = spec.path === undefined || spec.path === '' ? 'argument' : spec.path;
  const requires = `${spec.requires}${unitSuffix(spec.unit)}`;
  return {
    message:
      `${spec.api}: ${target} — got ${receivedText(spec)}; requires ${requires}. ` +
      `Example: ${spec.example}`,
    hint: spec.hint ?? `Set ${target} to ${requires}. Example: ${spec.example}`,
  };
}

/** Build the error without throwing — for call sites that need to attach it to
 *  a report rather than raise. Prefer `invalidArgs`. */
export function invalidArgsError(spec: InvalidArgsSpec): KernelError {
  const { message, hint } = invalidArgsText(spec);
  return new KernelError(spec.code ?? 'feature.invalid-args', message, spec.featureId, hint);
}

/** Raise the shared, self-correcting `invalid-args` error. */
export function invalidArgs(spec: InvalidArgsSpec): never {
  throw invalidArgsError(spec);
}

/**
 * Curried form for a file that validates many fields of one API — keeps the
 * call sites to the three parts that actually differ.
 *
 *   const bad = argChecker('hole(face, opts)', featureId);
 *   bad({ path: 'opts.diameter', got: d, requires: '> 0 and ≤ 1000', unit: 'mm',
 *         example: "hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through' })" });
 */
export function argChecker(
  api: string,
  featureId?: string,
  code?: DiagnosticCode,
): (spec: Omit<InvalidArgsSpec, 'api' | 'featureId' | 'code'>) => never {
  return (spec) => invalidArgs({ ...spec, api, featureId, code });
}
