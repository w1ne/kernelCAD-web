// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Browser source-to-JavaScript step.
//
// WHY THIS IS NOT THE TYPESCRIPT COMPILER
// ---------------------------------------
// The node path calls `transpileTs`, which imports the `typescript` package for
// syntax-only type erasure. Measured cost of bundling just that one function
// for the browser (esbuild, --bundle --minify --format=esm --platform=browser):
//
//     3.40 MB raw  /  0.97 MB gzipped
//
// That is the entire compiler — parser, checker, emitter — shipped so we can
// delete `: number` from a script. It is far more than the rest of the modeling
// runtime costs, and it would be paid on first paint by every Studio user,
// including the overwhelming majority whose scripts are plain JavaScript (the
// Studio's own starter script is).
//
// So the browser default is JavaScript-only, and it says so out loud. A script
// carrying TypeScript syntax gets a named diagnostic pointing at the construct
// that would need the compiler — it is never silently mangled by a regex
// stripper, and it never fails later with a confusing SyntaxError from
// `new Function`. Hosts that want full TypeScript can pay the 3.4 MB
// deliberately by passing the real transpiler:
//
//     import { transpileTs } from './transpile';
//     runScriptInBrowser({ code, fileName, transpile: transpileTs });
//
// (`esbuild-wasm` was the third option; it is not a dependency of this repo and
// adding one was out of scope for this change. At ~9 MB of wasm it is also not
// obviously cheaper than the 3.4 MB it would replace.)

import { KernelError } from '../../shared/intent/kernelError';
import type { TranspileOutput } from './runScriptCore';

/** A TypeScript-only construct we can detect cheaply and name precisely. */
interface TsSyntaxProbe {
  label: string;
  re: RegExp;
}

// Deliberately conservative: each pattern is anchored enough that plain
// JavaScript does not trip it. The goal is a helpful message on the common
// cases, NOT a complete TypeScript grammar — anything that slips through
// simply reaches `new Function` and reports its own SyntaxError, which is
// still an honest failure rather than silently wrong geometry.
const TS_PROBES: readonly TsSyntaxProbe[] = [
  { label: 'interface declaration', re: /(^|\n)\s*(export\s+)?interface\s+[A-Za-z_$]/ },
  { label: 'type alias', re: /(^|\n)\s*(export\s+)?type\s+[A-Za-z_$][\w$]*\s*(<[^\n=]*>)?\s*=/ },
  { label: 'enum declaration', re: /(^|\n)\s*(export\s+)?(const\s+)?enum\s+[A-Za-z_$]/ },
  { label: 'import type', re: /(^|\n)\s*import\s+type\b/ },
  { label: 'abstract class', re: /(^|\n)\s*(export\s+)?abstract\s+class\b/ },
  { label: 'namespace/module declaration', re: /(^|\n)\s*(export\s+)?(namespace|declare)\s+[A-Za-z_$]/ },
  { label: '"as" type assertion', re: /\bas\s+(const\b|[A-Z][\w$]*(\[\])?(\s*[|&]\s*[A-Z][\w$]*)*)/ },
  { label: '"satisfies" operator', re: /\bsatisfies\s+[A-Za-z_$]/ },
  // `const x: number = 1` / `let x: Foo` — a colon annotation on a declaration.
  { label: 'variable type annotation', re: /(^|\n)\s*(const|let|var)\s+[A-Za-z_$][\w$]*\s*:\s*[A-Za-z_$[{]/ },
  // `function f(a: number)` / `(a: number) =>` — a colon annotation on a param.
  { label: 'parameter type annotation', re: /\((\s*[A-Za-z_$][\w$]*\s*:\s*[A-Za-z_$[{][^)]*)\)/ },
  // `function f(): number {`
  { label: 'return type annotation', re: /\)\s*:\s*[A-Za-z_$][\w$.<>[\]|& ]*\s*(\{|=>)/ },
];

/**
 * Detect TypeScript-only syntax. Exported so tests (and callers that want to
 * decide whether to lazily fetch the real compiler) can ask the same question
 * this transpiler asks.
 */
export function detectTypeScriptSyntax(source: string): string | null {
  // Strip line/block comments and string literals first so prose in a comment
  // ("returns a Shape: the base solid") cannot masquerade as an annotation.
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  for (const probe of TS_PROBES) {
    if (probe.re.test(stripped)) return probe.label;
  }
  return null;
}

/**
 * The browser's default `ScriptTranspiler`: pass JavaScript through untouched,
 * refuse TypeScript with a diagnostic that names the construct and the fix.
 */
export function transpileBrowser(source: string): TranspileOutput {
  const ts = detectTypeScriptSyntax(source);
  if (ts !== null) {
    throw new KernelError(
      'cli.script-exception',
      `This script uses TypeScript syntax (${ts}), which the in-browser script engine cannot compile. ` +
        `The browser runtime runs JavaScript only — bundling the TypeScript compiler would add 3.4 MB ` +
        `(0.97 MB gzipped) to the page. Either remove the type annotations, or run the script through ` +
        `the kernelCAD CLI or MCP server, which use the full TypeScript compiler.`,
    );
  }
  return { code: source };
}
