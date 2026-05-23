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

export function findLastTopLevelReturnLine(code: string): number {
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
