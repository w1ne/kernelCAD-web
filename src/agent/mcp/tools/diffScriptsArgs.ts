// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/diffScriptsArgs.ts
//
// Argument normalisation for `diff_scripts`. LLM clients reach for the
// natural names of a two-sided diff — `base_code` / `revised_code`,
// `old_code` / `new_code`, `before` / `after` — rather than the camelCase
// `baseCode` / `code` pair the schema declares. Every one of those calls used
// to fail with a bare "must provide baseCode" even though the intent was
// unambiguous. This module folds the aliases onto the canonical four keys and,
// when a side is genuinely missing or malformed, returns a coded diagnostic
// that names the argument, the bad value and a working example.

export interface DiffScriptsCanonicalInput {
  baseFile?: string;
  baseCode?: string;
  file?: string;
  code?: string;
}

export type DiffScriptsArgsResult =
  | { ok: true; input: DiffScriptsCanonicalInput }
  | { ok: false; side: 'base' | 'revised'; error: string; errorCode: 'cli.invalid-args' };

/** Example call quoted in every argument diagnostic. */
export const DIFF_SCRIPTS_EXAMPLE =
  "diff_scripts({ baseCode: 'return box(10, 10, 10);', code: 'return box(10, 10, 12);' })";

const BASE_CODE_KEYS = ['baseCode', 'base_code', 'baselineCode', 'baseline_code', 'oldCode', 'old_code', 'beforeCode', 'before_code', 'originalCode', 'original_code'];
const BASE_FILE_KEYS = ['baseFile', 'base_file', 'baselineFile', 'baseline_file', 'oldFile', 'old_file', 'beforeFile', 'before_file'];
const REVISED_CODE_KEYS = ['code', 'revisedCode', 'revised_code', 'newCode', 'new_code', 'afterCode', 'after_code', 'revisionCode', 'revision_code'];
const REVISED_FILE_KEYS = ['file', 'revisedFile', 'revised_file', 'newFile', 'new_file', 'afterFile', 'after_file', 'revisionFile', 'revision_file'];
/** Keys whose value may be either inline source or a path. */
const BASE_EITHER_KEYS = ['base', 'baseline', 'before', 'old', 'original'];
const REVISED_EITHER_KEYS = ['revised', 'revision', 'after', 'new', 'current'];

/** A string is a path (not inline source) when it is one line ending in a
 *  script extension. Inline source always has a statement in it. */
export function looksLikeScriptPath(s: string): boolean {
  return !/[\n;(]/.test(s) && /\.(kcad\.)?(ts|js|mjs)$/.test(s.trim());
}

function firstString(raw: Record<string, unknown>, keys: readonly string[]): { key: string; value: unknown } | undefined {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null) return { key: k, value: raw[k] };
  }
  return undefined;
}

function badType(side: 'base' | 'revised', key: string, value: unknown): DiffScriptsArgsResult {
  return {
    ok: false,
    side,
    error:
      `diff_scripts: argument '${key}' must be a string (inline script source or a .kcad.ts path); ` +
      `got ${Array.isArray(value) ? 'array' : typeof value} ${JSON.stringify(value)?.slice(0, 80)}. Example: ${DIFF_SCRIPTS_EXAMPLE}.`,
    errorCode: 'cli.invalid-args',
  };
}

interface SideSource { code?: string; file?: string }

function resolveSide(
  raw: Record<string, unknown>,
  side: 'base' | 'revised',
): { ok: true; source: SideSource } | Extract<DiffScriptsArgsResult, { ok: false }> {
  const [codeKeys, fileKeys, eitherKeys] = side === 'base'
    ? [BASE_CODE_KEYS, BASE_FILE_KEYS, BASE_EITHER_KEYS]
    : [REVISED_CODE_KEYS, REVISED_FILE_KEYS, REVISED_EITHER_KEYS];
  for (const [keys, kind] of [[codeKeys, 'code'], [fileKeys, 'file'], [eitherKeys, 'either']] as const) {
    const hit = firstString(raw, keys);
    if (hit === undefined) continue;
    if (typeof hit.value !== 'string') return badType(side, hit.key, hit.value) as Extract<DiffScriptsArgsResult, { ok: false }>;
    const asFile = kind === 'file' || (kind === 'either' && looksLikeScriptPath(hit.value));
    return { ok: true, source: asFile ? { file: hit.value } : { code: hit.value } };
  }
  return { ok: true, source: {} };
}

function missingSide(side: 'base' | 'revised'): DiffScriptsArgsResult {
  const [codeKey, fileKey, what] = side === 'base'
    ? ['baseCode', 'baseFile', 'baseline (the version before the edit)']
    : ['code', 'file', 'revision (the version after the edit)'];
  return {
    ok: false,
    side,
    error:
      `diff_scripts: missing the ${what}. Pass it inline as '${codeKey}' (works everywhere, including a hosted server) ` +
      `or as a path in '${fileKey}' (local servers only). Example: ${DIFF_SCRIPTS_EXAMPLE}.`,
    errorCode: 'cli.invalid-args',
  };
}

/** Fold every accepted alias onto the canonical `{ baseFile, baseCode, file,
 *  code }` keys, or say exactly which side is missing. */
export function normalizeDiffScriptsArgs(raw: Record<string, unknown>): DiffScriptsArgsResult {
  const base = resolveSide(raw, 'base');
  if (!base.ok) return base;
  const revised = resolveSide(raw, 'revised');
  if (!revised.ok) return revised;
  if (base.source.code === undefined && base.source.file === undefined) return missingSide('base');
  if (revised.source.code === undefined && revised.source.file === undefined) return missingSide('revised');
  return {
    ok: true,
    input: {
      ...(base.source.code !== undefined ? { baseCode: base.source.code } : {}),
      ...(base.source.file !== undefined ? { baseFile: base.source.file } : {}),
      ...(revised.source.code !== undefined ? { code: revised.source.code } : {}),
      ...(revised.source.file !== undefined ? { file: revised.source.file } : {}),
    },
  };
}
