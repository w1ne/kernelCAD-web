// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/invalidArgsBaselineRegen.ts
//
// Regenerate `scripts/lib/invalidArgsBaseline.json` — the per-file count of
// `feature.invalid-args` / `cli.invalid-args` raise sites that still bypass
// the shared raiser. Refuses to write (exit 1) when any file would GROW or a
// new bypassing file would appear, unless `--allow-new` is passed. That keeps
// the ratchet one-way: convert sites, never add them.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectBaseline, diffAgainstBaseline } from './lib/invalidArgsRatchet';
import baseline from './lib/invalidArgsBaseline.json';

const root = process.cwd();
const current = collectBaseline(root);
const diff = diffAgainstBaseline(baseline as Record<string, number>, current);
const allowNew = process.argv.includes('--allow-new');

if (!allowNew && (diff.grew.length > 0 || diff.added.length > 0)) {
  for (const g of diff.grew) {
    console.error(`GREW  ${g.file}: ${g.baseline} -> ${g.current}`);
  }
  for (const a of diff.added) {
    console.error(`NEW   ${a.file}: ${a.current}`);
  }
  console.error(
    '\nRoute these raise sites through invalidArgs(...) / invalidArgsText(...) ' +
    '(src/shared/intent/invalidArgs.ts), or re-run with --allow-new if the growth is intended.',
  );
  process.exit(1);
}

const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  join(root, 'scripts/lib/invalidArgsBaseline.json'),
  `${JSON.stringify(sorted, null, 2)}\n`,
);
const total = Object.values(sorted).reduce((a, b) => a + b, 0);
console.log(`wrote scripts/lib/invalidArgsBaseline.json — ${Object.keys(sorted).length} files, ${total} sites`);
for (const s of diff.shrank) console.log(`SHRANK ${s.file}: ${s.baseline} -> ${s.current}`);
