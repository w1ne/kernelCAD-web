// src/agent/mcp/edits/addPathSpline.ts
//
// NURBS Slice D Task 4: insert a `.spline([...], opts?)` call into an
// existing PathBuilder chain anchored on a named variable. Pure string
// manipulation — mirrors addNurbsCurve but injects mid-chain instead of
// adding a new top-level binding.
//
// Strategy: locate the `const <chain_anchor> = ` declaration; find the
// assignment statement's `;`; if `.close()` appears in the assignment,
// insert immediately before `.close()`; otherwise append before `;`.

export interface AddPathSplineInput {
  code: string;
  chain_anchor: string;
  points: Array<[number, number]>;
  tension?: number;
  binding_name?: string;
}

export interface AddPathChainResult {
  ok: boolean;
  new_code?: string;
  error?: string;
}

export function addPathSpline(input: AddPathSplineInput): AddPathChainResult {
  if (typeof input.chain_anchor !== 'string' || !isValidIdentifier(input.chain_anchor)) {
    return {
      ok: false,
      error: `add_path_spline: chain_anchor must be a JS identifier; got ${JSON.stringify(input.chain_anchor)}.`,
    };
  }
  if (!Array.isArray(input.points) || input.points.length < 2) {
    return {
      ok: false,
      error: 'add_path_spline: points must be a Vec2[] with at least 2 waypoints.',
    };
  }
  for (const p of input.points) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return {
        ok: false,
        error: 'add_path_spline: every point must be a [x, y] Vec2 of finite numbers.',
      };
    }
  }
  if (input.tension !== undefined && (typeof input.tension !== 'number' || !Number.isFinite(input.tension))) {
    return {
      ok: false,
      error: `add_path_spline: tension must be a finite number; got ${JSON.stringify(input.tension)}.`,
    };
  }

  const pointsLiteral = JSON.stringify(input.points);
  const callFragment = input.tension !== undefined
    ? `.spline(${pointsLiteral}, { tension: ${JSON.stringify(input.tension)} })`
    : `.spline(${pointsLiteral})`;

  return injectIntoChain(input.code, input.chain_anchor, callFragment);
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export function isValidIdentifier(s: string): boolean {
  return IDENTIFIER_RE.test(s);
}

/**
 * Locate the `const|let|var <chain_anchor> = ...;` statement and inject
 * `callFragment` immediately before any `.close()` call, or before the
 * statement-terminating semicolon if `.close()` is absent.
 *
 * Robust to multi-line chains. Tracks string/template/comment context so a
 * `.close()` inside a comment / string does not confuse the cursor.
 */
export function injectIntoChain(
  code: string,
  chainAnchor: string,
  callFragment: string,
): AddPathChainResult {
  const declRe = new RegExp(
    `(^|[^A-Za-z0-9_$])((?:const|let|var)\\s+${escapeRegex(chainAnchor)}\\s*=)`,
    'm',
  );
  const match = declRe.exec(code);
  if (!match) {
    return {
      ok: false,
      error: `chain_anchor "${chainAnchor}" is not declared in the source.`,
    };
  }
  // Position just AFTER the matched `= ` — start scanning the rhs expression.
  const rhsStart = match.index + match[1].length + match[2].length;

  // Walk forward to the statement-terminating semicolon at depth 0, tracking
  // strings/templates/comments and brace/paren/bracket nesting.
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let semiIdx = -1;
  for (let i = rhsStart; i < code.length; i++) {
    const c = code[i];
    const c2 = code[i + 1] ?? '';
    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && c2 === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && c2 === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && c2 === '*') { inBlockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c as '"' | "'" | '`'; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; continue; }
    if (c === ';' && depth === 0) { semiIdx = i; break; }
  }
  if (semiIdx < 0) {
    return {
      ok: false,
      error: `chain_anchor "${chainAnchor}" assignment does not terminate with a semicolon.`,
    };
  }

  // Look for `.close()` inside [rhsStart, semiIdx) at depth 0 (we already
  // walked depth so re-scan a narrower window).
  const closeIdx = findCloseCall(code, rhsStart, semiIdx);
  const insertAt = closeIdx >= 0 ? closeIdx : semiIdx;

  const newCode = code.slice(0, insertAt) + callFragment + code.slice(insertAt);
  return { ok: true, new_code: newCode };
}

/**
 * Find the leftmost `.close()` (or `.close ()`) call between [start, end) at
 * the top-level chain depth (depth 0). Returns the offset of the leading dot.
 * Returns -1 if not present.
 */
function findCloseCall(code: string, start: number, end: number): number {
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = start; i < end; i++) {
    const c = code[i];
    const c2 = code[i + 1] ?? '';
    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && c2 === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && c2 === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && c2 === '*') { inBlockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c as '"' | "'" | '`'; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; continue; }
    if (depth === 0 && c === '.' && code.slice(i, i + 6) === '.close') {
      const after = code[i + 6];
      // Accept `.close(` or `.close (`.
      if (after === '(' || (after === ' ' && code[i + 7] === '(')) {
        return i;
      }
    }
  }
  return -1;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
