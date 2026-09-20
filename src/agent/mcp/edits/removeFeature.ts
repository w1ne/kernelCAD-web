// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/edits/removeFeature.ts

export interface RemoveFeatureResult {
  ok: boolean;
  new_code?: string;
  error?: string;
}

/**
 * Remove a line from `code` whose contents include `match`. Returns error if
 * 0 lines or >1 lines match, or if the match resolves to the line containing
 * `return` (removing return breaks the script). String match is literal —
 * not a regex.
 */
export function removeFeature(code: string, match: string): RemoveFeatureResult {
  if (match.length === 0) {
    return { ok: false, error: 'match must not be empty.' };
  }

  const lines = code.split('\n');
  const matchedIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) matchedIndices.push(i);
  }

  if (matchedIndices.length === 0) {
    return { ok: false, error: `match '${match}' not found in code.` };
  }
  if (matchedIndices.length > 1) {
    return { ok: false, error: `match '${match}' has multiple matches (${matchedIndices.length} lines) — refusing to pick one. Disambiguate.` };
  }

  const idx = matchedIndices[0];
  // Refuse to remove the line containing `return` at brace depth 0
  if (lineContainsTopLevelReturn(lines, idx)) {
    return { ok: false, error: `match resolves to the line containing the return statement. Cannot remove the return.` };
  }

  lines.splice(idx, 1);
  return { ok: true, new_code: lines.join('\n') };
}

interface LineScanState {
  depth: number;
  inStr: '"' | "'" | '`' | null;
  inLineComment: boolean;
  inBlockComment: boolean;
}

function hasTopLevelReturnAt(line: string, i: number, depth: number): boolean {
  if (depth !== 0 || line.slice(i, i + 6) !== 'return') return false;
  const before = i === 0 ? ' ' : line[i - 1];
  const after = line[i + 6] ?? ' ';
  return !/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after);
}

function skipBlockComment(line: string, state: LineScanState, i: number): number {
  if (line[i] === '*' && line[i + 1] === '/') { state.inBlockComment = false; return i + 2; }
  return i + 1;
}

function skipString(line: string, state: LineScanState, i: number): number {
  const c = line[i];
  if (c === '\\') return i + 2;
  if (c === state.inStr) { state.inStr = null; return i + 1; }
  return i + 1;
}

function skipCodeChar(line: string, state: LineScanState, i: number): number {
  const c = line[i];
  const c2 = line[i + 1];
  if (c === '/' && c2 === '/') { state.inLineComment = true; return i + 2; }
  if (c === '/' && c2 === '*') { state.inBlockComment = true; return i + 2; }
  if (c === '"' || c === "'" || c === '`') { state.inStr = c as '"' | "'" | '`'; return i + 1; }
  if (c === '{') { state.depth++; return i + 1; }
  if (c === '}') { state.depth--; return i + 1; }
  return i + 1;
}

function scanLineForTopLevelReturn(line: string, state: LineScanState): boolean {
  let i = 0;
  let lineHasTopLevelReturn = false;

  while (i < line.length) {
    if (state.inLineComment) { i++; continue; }
    if (state.inBlockComment) { i = skipBlockComment(line, state, i); continue; }
    if (state.inStr) { i = skipString(line, state, i); continue; }
    if (hasTopLevelReturnAt(line, i, state.depth)) {
      lineHasTopLevelReturn = true;
      i += 6; continue;
    }
    i = skipCodeChar(line, state, i);
  }

  return lineHasTopLevelReturn;
}

/**
 * Check whether the line at `lineIndex` contains a `return` keyword at brace
 * depth 0 (top-level). Mirrors the state-machine in addFeature.ts.
 */
function lineContainsTopLevelReturn(lines: string[], lineIndex: number): boolean {
  const state: LineScanState = {
    depth: 0,
    inStr: null,
    inLineComment: false,
    inBlockComment: false,
  };

  for (let li = 0; li <= lineIndex; li++) {
    const line = lines[li];
    state.inLineComment = false;
    const lineHasTopLevelReturn = scanLineForTopLevelReturn(line, state);

    if (li === lineIndex && lineHasTopLevelReturn) return true;
  }
  return false;
}
