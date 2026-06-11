#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adds the canonical two-line SPDX header to every tracked .ts/.tsx source
// file under src/, scripts/, and eval/. Idempotent — safe to re-run any time
// (files that already carry the SPDX line in their first lines are skipped).
//
// Rules:
//  - The header goes at the very top of the file, above any existing comment.
//  - If the file starts with a shebang (#!), the header goes directly below it.
//  - Recorded eval run fixtures (eval/runs/) are excluded: golden tests
//    compare those outputs byte-for-byte against freshly generated runs.
//
// Usage: node scripts/addSpdxHeaders.mjs [--check]
//   --check  exit 1 listing files that are missing the header, without writing.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SPDX_LINE = '// SPDX-License-Identifier: MIT';
const COPYRIGHT_LINE = '// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors';
const HEADER = `${SPDX_LINE}\n${COPYRIGHT_LINE}\n`;

const ROOTS = ['src', 'scripts', 'eval'];
const EXCLUDE = [
  /^eval\/runs\//, // recorded run fixtures, compared byte-for-byte by golden tests
];

export function hasHeader(source) {
  // The header must be within the first three lines (line 1, or line 2 when
  // a shebang occupies line 1).
  return source.split('\n', 3).some((line) => line.trim() === SPDX_LINE);
}

export function withHeader(source) {
  if (source.startsWith('#!')) {
    const nl = source.indexOf('\n');
    if (nl === -1) return `${source}\n${HEADER}`;
    return source.slice(0, nl + 1) + HEADER + source.slice(nl + 1);
  }
  return HEADER + source;
}

function listTargets() {
  const out = execFileSync('git', ['ls-files', ...ROOTS], { encoding: 'utf8' });
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => !EXCLUDE.some((re) => re.test(f)));
}

const checkOnly = process.argv.includes('--check');
const missing = [];
let updated = 0;

const targets = listTargets();
for (const file of targets) {
  const source = readFileSync(file, 'utf8');
  if (hasHeader(source)) continue;
  if (checkOnly) {
    missing.push(file);
    continue;
  }
  writeFileSync(file, withHeader(source));
  updated += 1;
}

if (checkOnly) {
  if (missing.length > 0) {
    console.error(`Missing SPDX header (run: node scripts/addSpdxHeaders.mjs):`);
    for (const f of missing) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`SPDX headers OK: ${targets.length} files checked.`);
} else {
  console.log(`SPDX headers: ${targets.length} files scanned, ${updated} updated.`);
}
