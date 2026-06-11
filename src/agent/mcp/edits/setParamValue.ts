// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/edits/setParamValue.ts

export interface SetParamValueResult {
  ok: boolean;
  new_code?: string;
  error?: string;
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
  newValue: number | string,
): SetParamValueResult {
  // Match: `param(` ... <quoted name match> ... `,` ... <default value capture> ... `,` ... `)` OR `)`
  // Strategy: locate every `param(` call, parse its first arg as the literal name string,
  // then extract the second-arg span and rewrite it.
  const matches: { start: number; end: number; valueStart: number; valueEnd: number }[] = [];

  // Find every `param(` token followed by a quoted name. Use a simple state machine
  // because regex alone can't reliably parse balanced parens / nested braces.
  let i = 0;
  while (i < code.length) {
    const j = code.indexOf('param(', i);
    if (j < 0) break;

    // Skip if `param(` is part of a longer identifier (e.g. `myparam(`)
    const charBefore = j > 0 ? code[j - 1] : ' ';
    if (/[A-Za-z0-9_$]/.test(charBefore)) { i = j + 6; continue; }

    let p = j + 'param('.length;
    // Skip whitespace
    while (p < code.length && /\s/.test(code[p])) p++;

    // Expect quote — single or double
    if (code[p] !== "'" && code[p] !== '"') { i = j + 1; continue; }
    const quote = code[p];
    const nameStart = p + 1;
    let nameEnd = nameStart;
    while (nameEnd < code.length && code[nameEnd] !== quote) {
      if (code[nameEnd] === '\\') nameEnd += 2; else nameEnd++;
    }
    const literalName = code.slice(nameStart, nameEnd);
    p = nameEnd + 1;
    if (literalName !== paramName) { i = j + 1; continue; }

    // Skip whitespace + comma
    while (p < code.length && /\s/.test(code[p])) p++;
    if (code[p] !== ',') { i = j + 1; continue; }
    p++;
    while (p < code.length && /\s/.test(code[p])) p++;

    // Capture the second-arg value. Track nesting of () [] {} and string literals.
    const valueStart = p;
    let depth = 0;
    let inStr: '"' | "'" | '`' | null = null;
    while (p < code.length) {
      const c = code[p];
      if (inStr) {
        if (c === '\\') p += 2;
        else if (c === inStr) { inStr = null; p++; }
        else p++;
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
    const valueEnd = p;

    matches.push({ start: j, end: valueEnd, valueStart, valueEnd });
    i = p;
  }

  if (matches.length === 0) {
    return { ok: false, error: `param '${paramName}' not found in code.` };
  }
  if (matches.length > 1) {
    return { ok: false, error: `param '${paramName}' has multiple matches (${matches.length}) — refusing to pick one. Disambiguate the source.` };
  }

  const m = matches[0];
  const literal =
    typeof newValue === 'number'
      ? String(newValue)
      : `'${String(newValue).replace(/'/g, "\\'")}'`;
  const new_code = code.slice(0, m.valueStart) + literal + code.slice(m.valueEnd);
  return { ok: true, new_code };
}
