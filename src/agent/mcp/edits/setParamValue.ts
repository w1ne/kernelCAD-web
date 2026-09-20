// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/edits/setParamValue.ts

export interface SetParamValueResult {
  ok: boolean;
  new_code?: string;
  error?: string;
}

interface ParamCallMatch {
  start: number;
  end: number;
  valueStart: number;
  valueEnd: number;
  /** Span of the third (`meta`) argument, when the call has one. */
  metaStart?: number;
  metaEnd?: number;
}

type FindParamCallResult =
  | { ok: true; match: ParamCallMatch }
  | { ok: false; error: string };

/**
 * Locate the (unique) `param('<name>', <default>, [meta])` call for
 * `paramName` in `code`. Shared scanning core for both the source-rewrite
 * (`setParamValue`) and the read-only declaration parser
 * (`parseParamDeclaration`) below — a state machine, not a regex, because
 * regex alone can't reliably track balanced parens/brackets/braces and
 * string literals across a multi-line call.
 */
function skipWhitespace(code: string, from: number): number {
  let p = from;
  while (p < code.length && /\s/.test(code[p])) p++;
  return p;
}

/**
 * Scan one argument starting at `from`, returning the index where it ends
 * (at the top-level `,` or closing delimiter). Track nesting of () [] {}
 * and string literals so a nested `{ choices: [...] }` in a LATER arg
 * doesn't confuse this scan.
 */
function scanStringChar(
  code: string,
  p: number,
  inStr: '"' | "'" | '`',
): { p: number; inStr: '"' | "'" | '`' | null } {
  const c = code[p];
  if (c === '\\') return { p: p + 2, inStr };
  if (c === inStr) return { p: p + 1, inStr: null };
  return { p: p + 1, inStr };
}

function scanArgEnd(code: string, from: number): number {
  let p = from;
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;
  while (p < code.length) {
    const c = code[p];
    if (inStr) {
      const next = scanStringChar(code, p, inStr);
      p = next.p;
      inStr = next.inStr;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c as '"' | "'" | '`'; p++; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; p++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth--; p++; continue;
    }
    if (c === ',' && depth === 0) break;
    p++;
  }
  return p;
}

/** Read the quoted first argument's literal text; `null` when malformed. */
function readParamName(code: string, from: number): { name: string; end: number } | null {
  let p = from;
  // Expect quote — single or double
  if (code[p] !== "'" && code[p] !== '"') return null;
  const quote = code[p];
  const nameStart = p + 1;
  let nameEnd = nameStart;
  while (nameEnd < code.length && code[nameEnd] !== quote) {
    if (code[nameEnd] === '\\') nameEnd += 2; else nameEnd++;
  }
  const literalName = code.slice(nameStart, nameEnd);
  p = nameEnd + 1;
  return { name: literalName, end: p };
}

function findParamCall(code: string, paramName: string): FindParamCallResult {
  const matches: ParamCallMatch[] = [];

  let i = 0;
  while (i < code.length) {
    const j = code.indexOf('param(', i);
    if (j < 0) break;

    // Skip if `param(` is part of a longer identifier (e.g. `myparam(`)
    const charBefore = j > 0 ? code[j - 1] : ' ';
    if (/[A-Za-z0-9_$]/.test(charBefore)) { i = j + 6; continue; }

    let p = skipWhitespace(code, j + 'param('.length);
    const name = readParamName(code, p);
    if (!name) { i = j + 1; continue; }
    p = name.end;
    if (name.name !== paramName) { i = j + 1; continue; }

    // Skip whitespace + comma
    p = skipWhitespace(code, p);
    if (code[p] !== ',') { i = j + 1; continue; }
    p = skipWhitespace(code, p + 1);

    const valueStart = p;
    const valueEnd = scanArgEnd(code, p);

    // Optional third (meta) arg: `, { ... }` up to the closing `)`.
    let metaStart: number | undefined;
    let metaEnd: number | undefined;
    let q = skipWhitespace(code, valueEnd);
    if (code[q] === ',') {
      q = skipWhitespace(code, q + 1);
      metaStart = q;
      metaEnd = scanArgEnd(code, q);
    }

    matches.push({ start: j, end: valueEnd, valueStart, valueEnd, metaStart, metaEnd });
    i = valueEnd;
  }

  if (matches.length === 0) {
    return { ok: false, error: `param '${paramName}' not found in code.` };
  }
  if (matches.length > 1) {
    return { ok: false, error: `param '${paramName}' has multiple matches (${matches.length}) — refusing to pick one. Disambiguate the source.` };
  }
  return { ok: true, match: matches[0] };
}

/**
 * Replace the default value of a `param('<name>', <default>, [opts])` call in
 * `.kcad.ts` source. Regex-based — handles single/double quotes, optional opts,
 * multi-line calls, and rejects multiple-match cases.
 *
 * Returns error if the param name is not found or appears more than once.
 */
export function setParamValue(
  code: string,
  paramName: string,
  newValue: number | string | boolean,
): SetParamValueResult {
  const found = findParamCall(code, paramName);
  if (!found.ok) return { ok: false, error: found.error };

  const m = found.match;
  const literal =
    typeof newValue === 'number' || typeof newValue === 'boolean'
      ? String(newValue)
      : `'${String(newValue).replace(/'/g, "\\'")}'`;
  const new_code = code.slice(0, m.valueStart) + literal + code.slice(m.valueEnd);
  return { ok: true, new_code };
}

export type DeclaredParamKind = 'number' | 'boolean' | 'choice' | 'string' | 'unknown';

export interface ParamDeclaration {
  name: string;
  /** Inferred purely from the SOURCE TEXT of the default-value literal and
   *  `meta` object — no script evaluation. `'unknown'` when the default is
   *  not a literal (e.g. a variable/expression), in which case validation
   *  is skipped rather than guessed. */
  kind: DeclaredParamKind;
  choices?: string[];
  maxLength?: number;
}

export type ParseParamDeclarationResult =
  | { ok: true; declaration: ParamDeclaration }
  | { ok: false; error: string };

/**
 * Read-only, evaluation-independent counterpart to `setParamValue`: parses
 * the SOURCE TEXT of a `param('<name>', <default>, [meta])` call to
 * determine the param's declared kind (from the default literal's syntax)
 * plus `choices`/`maxLength` from the meta object literal, WITHOUT running
 * the script.
 *
 * This exists so `set_param` can reject a type/choice mismatch even when
 * the script fails to evaluate for an unrelated reason (a missing font
 * file, a broken downstream feature, etc.) — evaluation-based validation
 * alone silently skips the check whenever evaluation itself fails, which
 * let a mismatched `new_value` slip through untouched into `new_code`.
 *
 * Deliberately conservative: only classifies a default that is a literal
 * (`true`/`false`, a numeric literal, or a quoted string). Anything else
 * (a variable, a call, a template expression) returns `kind: 'unknown'` —
 * we do not guess at what an expression evaluates to from source text
 * alone; the evaluation-based check remains the source of truth for those.
 */
export function parseParamDeclaration(code: string, paramName: string): ParseParamDeclarationResult {
  const found = findParamCall(code, paramName);
  if (!found.ok) return { ok: false, error: found.error };

  const m = found.match;
  const defaultLiteral = code.slice(m.valueStart, m.valueEnd).trim();
  const metaLiteral = m.metaStart !== undefined && m.metaEnd !== undefined
    ? code.slice(m.metaStart, m.metaEnd)
    : undefined;

  const kind = classifyDefaultLiteral(defaultLiteral);
  const declaration: ParamDeclaration = { name: paramName, kind };

  if (metaLiteral !== undefined) {
    const choices = extractChoices(metaLiteral);
    if (choices !== undefined) declaration.choices = choices;
    const maxLength = extractMaxLength(metaLiteral);
    if (maxLength !== undefined) declaration.maxLength = maxLength;
  }

  // A string default with a declared `choices` array is a 'choice' param,
  // not a plain 'string' one — same inference `param()` itself does at
  // runtime (see `KernelCadApi.param` overloads in `modeling/api.ts`).
  if (declaration.kind === 'string' && declaration.choices !== undefined) {
    declaration.kind = 'choice';
  }

  return { ok: true, declaration };
}

function classifyDefaultLiteral(literal: string): DeclaredParamKind {
  if (literal === 'true' || literal === 'false') return 'boolean';
  if (/^['"].*['"]$/s.test(literal)) return 'string';
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(literal)) return 'number';
  return 'unknown';
}

/** Extract `choices: ['a', 'b', ...]` from a `meta` object's source text. */
function extractChoices(metaLiteral: string): string[] | undefined {
  const m = /choices\s*:\s*\[([^\]]*)\]/.exec(metaLiteral);
  if (!m) return undefined;
  const items = m[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.replace(/^['"]|['"]$/g, ''));
  return items;
}

/** Extract `maxLength: <number>` from a `meta` object's source text. */
function extractMaxLength(metaLiteral: string): number | undefined {
  const m = /maxLength\s*:\s*(-?\d+(?:\.\d+)?)/.exec(metaLiteral);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
