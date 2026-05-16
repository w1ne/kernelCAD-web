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

/**
 * Check whether the line at `lineIndex` contains a `return` keyword at brace
 * depth 0 (top-level). Mirrors the state-machine in addFeature.ts.
 */
function lineContainsTopLevelReturn(lines: string[], lineIndex: number): boolean {
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let li = 0; li <= lineIndex; li++) {
    const line = lines[li];
    inLineComment = false;
    let i = 0;
    let lineHasTopLevelReturn = false;

    while (i < line.length) {
      const c = line[i];
      const c2 = line[i + 1];

      if (inLineComment) { i++; continue; }
      if (inBlockComment) {
        if (c === '*' && c2 === '/') { inBlockComment = false; i += 2; continue; }
        i++; continue;
      }
      if (inStr) {
        if (c === '\\') { i += 2; continue; }
        if (c === inStr) { inStr = null; i++; continue; }
        i++; continue;
      }
      if (c === '/' && c2 === '/') { inLineComment = true; i += 2; continue; }
      if (c === '/' && c2 === '*') { inBlockComment = true; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c as '"' | "'" | '`'; i++; continue; }
      if (c === '{') { depth++; i++; continue; }
      if (c === '}') { depth--; i++; continue; }
      if (depth === 0 && line.slice(i, i + 6) === 'return') {
        const before = i === 0 ? ' ' : line[i - 1];
        const after = line[i + 6] ?? ' ';
        if (!/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after)) {
          lineHasTopLevelReturn = true;
          i += 6; continue;
        }
      }
      i++;
    }

    if (li === lineIndex && lineHasTopLevelReturn) return true;
  }
  return false;
}
