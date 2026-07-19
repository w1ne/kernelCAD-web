#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-build gate on the artifacts `vite.docs-island.config.ts` emits.
//
// This exists because the build was green while producing a 160-byte
// docs-island.js: rollup treats the entry as an app root, saw no live import of
// `mount()`, and tree-shook the module and three.js with it. Nothing failed —
// the bundle was simply empty, and the Run button would have thrown
// "mount is not a function" for every reader.
//
// A unit test cannot catch that; it has to look at what was actually emitted.

import { statSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface Check {
  file: string;
  /** Smallest size that could possibly be the real artifact. */
  minBytes: number;
  /** Substrings that must survive bundling. */
  contains?: string[];
}

const CHECKS: Check[] = [
  {
    file: 'docs-island.js',
    // three.js alone is ~450 KB unminified-in, ~500 KB out. Anything under
    // 100 KB means the module was shaken away again.
    minBytes: 100_000,
    contains: ['mount', '/docs-worker.js'],
  },
  {
    file: 'docs-worker.js',
    minBytes: 100_000,
    // The worker resolves the wasm explicitly; Emscripten's default resolution
    // would look beside the *page* and 404 on every docs URL.
    contains: ['replicad_single.wasm'],
  },
  {
    file: 'replicad_single.wasm',
    minBytes: 5_000_000,
  },
];

function main(): void {
  const failures: string[] = [];

  for (const check of CHECKS) {
    const full = path.join(SITE, check.file);
    if (!existsSync(full)) {
      failures.push(`${check.file}: not emitted`);
      continue;
    }
    const size = statSync(full).size;
    if (size < check.minBytes) {
      failures.push(
        `${check.file}: ${size} bytes, expected at least ${check.minBytes} — the bundle was probably tree-shaken away`,
      );
      continue;
    }
    if (check.contains) {
      const text = readFileSync(full, 'utf8');
      for (const needle of check.contains) {
        if (!text.includes(needle)) failures.push(`${check.file}: missing ${needle}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('verify-docs-bundle FAILED:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`✓ docs bundles verified (${CHECKS.length} artifacts)`);
}

main();
