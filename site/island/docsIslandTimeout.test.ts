// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The run deadline is split across two files by necessity: the runtime knows
// the budget but cannot enforce it (`new Function` is not interruptible), and
// the island can enforce it but has to be told the number. Importing the
// constant directly would drag the whole script runtime into the island bundle
// alongside three.js, so it is duplicated — and guarded here.
//
// The island source is read as text rather than imported: importing it pulls in
// three.js and `new Worker(new URL(...))`, neither of which resolves under
// vitest's node environment.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BROWSER_SCRIPT_TIMEOUT_MS } from '../../src/modeling/runtime/browserRuntime';

const HERE = dirname(fileURLToPath(import.meta.url));
const ISLAND = readFileSync(resolve(HERE, 'docs-island.ts'), 'utf8');

describe('docs island run deadline', () => {
  it('matches the runtime budget it stands in for', () => {
    const match = ISLAND.match(/export const DOCS_RUN_TIMEOUT_MS = ([\d_]+);/);
    expect(match, 'DOCS_RUN_TIMEOUT_MS is no longer declared as a literal').not.toBeNull();
    expect(Number(match![1].replace(/_/g, ''))).toBe(BROWSER_SCRIPT_TIMEOUT_MS);
  });

  it('enforces the deadline by terminating the worker', () => {
    // Nothing else can stop a synchronous runaway script. A deadline that only
    // rejected the promise would leave the thread spinning forever.
    expect(ISLAND).toContain('worker?.terminate()');
    expect(ISLAND).toMatch(/setTimeout\([\s\S]{0,200}terminateWorker/);
  });

  it('runs reader code off the main thread', () => {
    expect(ISLAND).toMatch(/new Worker\(new URL\('\.\/docs-worker\.ts'/);
    // If the island ever called the runtime directly, the deadline above would
    // be unenforceable and a runaway example would freeze the reader's tab.
    expect(ISLAND).not.toContain('runScriptInBrowser');
  });
});
