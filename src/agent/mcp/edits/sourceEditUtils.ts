// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Small source-edit primitives shared by MCP source mutation tools.

export interface SourceEditResult {
  ok: boolean;
  new_code?: string;
  error?: string;
}

export function insertStatementBeforeLastTopLevelReturn(code: string, statement: string): SourceEditResult {
  const returnIndex = findLastTopLevelReturnLine(code);
  if (returnIndex < 0) {
    return { ok: false, error: 'no return statement found at top level — cannot place source edit.' };
  }

  const lines = code.split('\n');
  const indent = leadingWhitespace(lines[returnIndex]);
  lines.splice(returnIndex, 0, `${indent}${statement}`);
  return { ok: true, new_code: lines.join('\n') };
}

export function replaceLastTopLevelReturn(code: string, returnStatement: string): SourceEditResult {
  const returnIndex = findLastTopLevelReturnLine(code);
  if (returnIndex < 0) {
    return { ok: false, error: 'no return statement found at top level — cannot replace scene return.' };
  }

  const lines = code.split('\n');
  const indent = leadingWhitespace(lines[returnIndex]);
  lines[returnIndex] = `${indent}${returnStatement}`;
  return { ok: true, new_code: lines.join('\n') };
}

interface ReturnScanState {
  depth: number;
  inStr: '"' | "'" | '`' | null;
  inLineComment: boolean;
  inBlockComment: boolean;
}

/** Consume one comment/string token at `i`, updating `state`; returns the next
 *  index. Returns `i` unchanged when the character is ordinary code. */
function skipCommentOrString(line: string, i: number, state: ReturnScanState): number {
  const c = line[i];
  const c2 = line[i + 1];

  if (state.inLineComment) return i + 1;
  if (state.inBlockComment) {
    if (c === '*' && c2 === '/') { state.inBlockComment = false; return i + 2; }
    return i + 1;
  }
  if (state.inStr) {
    if (c === '\\') return i + 2;
    if (c === state.inStr) { state.inStr = null; return i + 1; }
    return i + 1;
  }
  if (c === '/' && c2 === '/') { state.inLineComment = true; return i + 2; }
  if (c === '/' && c2 === '*') { state.inBlockComment = true; return i + 2; }
  if (c === '"' || c === "'" || c === '`') { state.inStr = c as '"' | "'" | '`'; return i + 1; }
  return i;
}

export function findLastTopLevelReturnLine(code: string): number {
  const lines = code.split('\n');
  const state: ReturnScanState = { depth: 0, inStr: null, inLineComment: false, inBlockComment: false };
  let lastReturnLine = -1;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    state.inLineComment = false;
    let i = 0;
    let lineHasTopLevelReturn = false;

    while (i < line.length) {
      const next = skipCommentOrString(line, i, state);
      if (next !== i) { i = next; continue; }

      const c = line[i];
      if (c === '{') { state.depth++; i++; continue; }
      if (c === '}') { state.depth--; i++; continue; }

      if (state.depth === 0 && line.slice(i, i + 6) === 'return') {
        const before = i === 0 ? ' ' : line[i - 1];
        const after = line[i + 6] ?? ' ';
        if (!/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after)) {
          lineHasTopLevelReturn = true;
          i += 6;
          continue;
        }
      }
      i++;
    }

    if (lineHasTopLevelReturn) lastReturnLine = li;
  }

  return lastReturnLine;
}

export const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function isValidIdentifier(value: string): boolean {
  return IDENTIFIER_RE.test(value);
}

export function quoteString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function formatJsValue(value: unknown): string {
  if (typeof value === 'string') return quoteString(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot serialize non-finite number ${String(value)}.`);
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(formatJsValue).join(', ')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined);
    if (entries.length === 0) return '{}';
    return `{ ${entries.map(([key, entryValue]) => `${formatObjectKey(key)}: ${formatJsValue(entryValue)}`).join(', ')} }`;
  }
  throw new Error(`Cannot serialize value of type ${typeof value}.`);
}

export function bindingExists(code: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[^A-Za-z0-9_$])(?:const|let|var)\\s+${escaped}\\b`);
  return re.test(code);
}

function formatObjectKey(key: string): string {
  return isValidIdentifier(key) ? key : quoteString(key);
}

function leadingWhitespace(line: string): string {
  return line.match(/^(\s*)/)?.[1] ?? '';
}
