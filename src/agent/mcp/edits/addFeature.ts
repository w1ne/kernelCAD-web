// src/mcp/edits/addFeature.ts

export interface AddFeatureResult {
  ok: boolean;
  new_code?: string;
  error?: string;
}

/**
 * Insert `feature_code` as a new line in `code` immediately before the LAST
 * top-level `return` statement.
 *
 * "Top-level" means at brace depth 0 — `return` statements inside helper
 * functions / arrow bodies are skipped. The script must contain at least
 * one top-level `return` or this returns an error.
 *
 * Indentation of the inserted line matches the indentation of the `return`
 * line it precedes.
 */
export function addFeature(code: string, feature_code: string): AddFeatureResult {
  const returnIndex = findLastTopLevelReturnLine(code);
  if (returnIndex < 0) {
    return { ok: false, error: 'no return statement found at top level — cannot place new feature.' };
  }

  // Preserve source line endings.
  const lines = code.split('\n');
  const returnLine = lines[returnIndex];
  // Indentation = leading whitespace of the return line.
  const indentMatch = returnLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';

  const insertLine = `${indent}${feature_code}`;
  lines.splice(returnIndex, 0, insertLine);
  return { ok: true, new_code: lines.join('\n') };
}

/**
 * Find the line index (0-based) of the last `return` statement at brace
 * depth 0. Tracks string literals, template strings, and `{}` nesting.
 * Returns -1 if no top-level return is present.
 */
function findLastTopLevelReturnLine(code: string): number {
  const lines = code.split('\n');
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let lastReturnLine = -1;

  for (let li = 0; li < lines.length; li++) {
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

      // Check for `return` at depth 0 — it must be a word boundary.
      if (depth === 0 && line.slice(i, i + 6) === 'return') {
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
