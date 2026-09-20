// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

export function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== 'test') walk(p);
        continue;
      }
      if (
        !/\.(ts|tsx)$/.test(name) ||
        /\.test\.(ts|tsx)$/.test(name) ||
        name.endsWith('.d.ts') ||
        /\.gen\.tsx?$/.test(name)
      )
        continue;
      out.push(relative(root, p));
    }
  };
  walk(join(root, 'src'));
  return out.sort();
}

export interface Finding {
  rule: 'complexity' | 'max-lines-per-function' | 'max-lines';
  file: string;
  symbol: string;
  value: number;
}

export const RATCHET_RULES = {
  complexity: ['error', 15],
  'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
  'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],
} as const;

export function findingKey(f: Finding): string {
  return `${f.rule}|${f.file}|${f.symbol}`;
}

function parse(ruleId: string, message: string): { symbol: string; value: number } | undefined {
  if (ruleId === 'complexity') {
    const m = /^(.*?) has a complexity of (\d+)\./.exec(message);
    return m ? { symbol: m[1], value: Number(m[2]) } : undefined;
  }
  if (ruleId === 'max-lines-per-function') {
    const m = /^(.*?) has too many lines \((\d+)\)\./.exec(message);
    return m ? { symbol: m[1], value: Number(m[2]) } : undefined;
  }
  if (ruleId === 'max-lines') {
    const m = /has too many lines \((\d+)\)\./.exec(message);
    return m ? { symbol: '(file)', value: Number(m[1]) } : undefined;
  }
  return undefined;
}

export async function collectFindings(root: string, files: string[]): Promise<Finding[]> {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    allowInlineConfig: false,
    overrideConfig: [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tseslint.parser },
        rules: RATCHET_RULES as unknown as Record<string, unknown>,
      },
    ],
  });
  const results = await eslint.lintFiles(files);
  const out: Finding[] = [];
  for (const r of results) {
    const file = r.filePath.startsWith(root) ? r.filePath.slice(root.length + 1) : r.filePath;
    const seen = new Map<string, number>();
    for (const m of r.messages) {
      if (!m.ruleId) continue;
      const p = parse(m.ruleId, m.message);
      if (!p) continue;
      const dedupeKey = `${m.ruleId}|${p.symbol}`;
      const count = (seen.get(dedupeKey) ?? 0) + 1;
      seen.set(dedupeKey, count);
      const symbol = count === 1 ? p.symbol : `${p.symbol}#${count}`;
      out.push({ rule: m.ruleId as Finding['rule'], file, symbol, value: p.value });
    }
  }
  return out.sort((a, b) => codeUnitCompare(findingKey(a), findingKey(b)));
}

function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface RatchetResult {
  ok: boolean;
  added: Finding[];
  grown: Array<{ before: Finding; after: Finding }>;
  shrunk: Array<{ before: Finding; after: Finding }>;
  stale: Finding[];
}

export function diffAgainstBaseline(current: Finding[], baseline: Finding[]): RatchetResult {
  const base = new Map(baseline.map((f) => [findingKey(f), f]));
  const cur = new Map(current.map((f) => [findingKey(f), f]));
  const added: Finding[] = [];
  const grown: RatchetResult['grown'] = [];
  const shrunk: RatchetResult['shrunk'] = [];
  for (const [k, f] of cur) {
    const b = base.get(k);
    if (!b) added.push(f);
    else if (f.value > b.value) grown.push({ before: b, after: f });
    else if (f.value < b.value) shrunk.push({ before: b, after: f });
  }
  const stale = [...base.entries()].filter(([k]) => !cur.has(k)).map(([, f]) => f);
  return {
    ok: added.length === 0 && grown.length === 0 && shrunk.length === 0 && stale.length === 0,
    added,
    grown,
    shrunk,
    stale,
  };
}

export function planRegen(
  current: Finding[],
  existing: Finding[] | undefined,
  allowNew: boolean,
): { write: boolean; report: string[] } {
  if (existing === undefined) {
    return { write: true, report: ['no existing qualityBaseline.json — writing first baseline'] };
  }
  const fmt = (f: Finding) => `${f.file} ${f.symbol} (${f.rule}=${f.value})`;
  const r = diffAgainstBaseline(current, existing);
  const offenders = [
    ...r.added.map((f) => `NEW      ${fmt(f)} — split it or reduce below the threshold`),
    ...r.grown.map(({ before, after }) => `GREW     ${fmt(after)} (was ${before.value})`),
  ];
  if (offenders.length > 0 && !allowNew) {
    return { write: false, report: offenders };
  }
  return { write: true, report: [] };
}
