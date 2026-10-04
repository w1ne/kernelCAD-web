// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/invalidArgsRatchet.ts
//
// Scanner for `feature.invalid-args` / `cli.invalid-args` raise sites that do
// NOT go through the shared raiser in `src/shared/intent/invalidArgs.ts`.
//
// Why a ratchet and not a hard ban: `feature.invalid-args` is raised from ~120
// files. The 2026-10-03 usage triage put the high-traffic families first
// (hole/holes, cutout, fillet/chamfer/shell, patterns, sheetMetal/bend, gears,
// extrude primitives, params, connectors, joints/mates) and those are
// converted; the rest are recorded here and may only shrink. A new raise site
// in a converted file fails the gate, which is what stops the regression.
//
// Regenerate with: npx tsx scripts/invalidArgsBaselineRegen.ts

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** How far around a `code:` match to look for the helper call that built the
 *  message. One diagnostic object literal is comfortably inside this. */
const DIAGNOSTIC_WINDOW = 900;

const INVALID_ARGS_CODES = ['feature.invalid-args', 'cli.invalid-args'] as const;

const HELPER_CALL = /\binvalidArgs(?:Text|Error)?\s*\(/;

/** `new KernelError('feature.invalid-args', ...)` — the legacy throw form. */
const DIRECT_THROW = new RegExp(
  String.raw`new\s+KernelError\s*\(\s*'(?:${INVALID_ARGS_CODES.join('|')})'`,
  'g',
);

/** `code: 'feature.invalid-args'` inside a CompilerDiagnostic literal. */
const DIAGNOSTIC_CODE = new RegExp(
  String.raw`code:\s*'(?:${INVALID_ARGS_CODES.join('|')})'`,
  'g',
);

export interface RaiseSite {
  file: string;
  line: number;
  kind: 'throw' | 'diagnostic';
}

export function listSourceFiles(root: string, dir = 'src'): string[] {
  const out: string[] = [];
  const walk = (abs: string): void => {
    for (const entry of readdirSync(abs)) {
      const child = join(abs, entry);
      if (statSync(child).isDirectory()) {
        walk(child);
        continue;
      }
      if (!child.endsWith('.ts') && !child.endsWith('.tsx')) continue;
      if (child.endsWith('.test.ts') || child.endsWith('.test.tsx')) continue;
      out.push(relative(root, child).split(sep).join('/'));
    }
  };
  walk(join(root, dir));
  return out.sort();
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Raise sites in one file that bypass the shared helper. */
export function scanFile(file: string, text: string): RaiseSite[] {
  const sites: RaiseSite[] = [];
  for (const m of text.matchAll(DIRECT_THROW)) {
    sites.push({ file, line: lineOf(text, m.index), kind: 'throw' });
  }
  for (const m of text.matchAll(DIAGNOSTIC_CODE)) {
    // A converted diagnostic spreads `...invalidArgsText({...})` into the same
    // object literal, so the helper call sits next to the `code:` field.
    const from = Math.max(0, m.index - DIAGNOSTIC_WINDOW);
    const window = text.slice(from, m.index + DIAGNOSTIC_WINDOW);
    if (HELPER_CALL.test(window)) continue;
    sites.push({ file, line: lineOf(text, m.index), kind: 'diagnostic' });
  }
  return sites;
}

/** Per-file counts of bypassing raise sites, lowest-churn baseline shape. */
export type InvalidArgsBaseline = Record<string, number>;

export function collectBaseline(root: string): InvalidArgsBaseline {
  const out: InvalidArgsBaseline = {};
  for (const file of listSourceFiles(root)) {
    // The helper itself and the registry that declares the codes are not
    // raise sites.
    if (file === 'src/shared/intent/invalidArgs.ts') continue;
    const sites = scanFile(file, readFileSync(join(root, file), 'utf8'));
    if (sites.length > 0) out[file] = sites.length;
  }
  return out;
}

export interface BaselineDiff {
  /** Files with more bypassing sites than the baseline allows. */
  grew: Array<{ file: string; baseline: number; current: number }>;
  /** Files not in the baseline at all — a brand-new bypassing site. */
  added: Array<{ file: string; current: number }>;
  /** Files that improved; the baseline should be regenerated. */
  shrank: Array<{ file: string; baseline: number; current: number }>;
}

export function diffAgainstBaseline(
  baseline: InvalidArgsBaseline,
  current: InvalidArgsBaseline,
): BaselineDiff {
  const diff: BaselineDiff = { grew: [], added: [], shrank: [] };
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file];
    if (allowed === undefined) {
      diff.added.push({ file, current: count });
    } else if (count > allowed) {
      diff.grew.push({ file, baseline: allowed, current: count });
    } else if (count < allowed) {
      diff.shrank.push({ file, baseline: allowed, current: count });
    }
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    if (current[file] === undefined) diff.shrank.push({ file, baseline: allowed, current: 0 });
  }
  return diff;
}
