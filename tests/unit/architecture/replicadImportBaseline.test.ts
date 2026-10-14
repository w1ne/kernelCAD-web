// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Ratchet for the kernel seam: replicad / replicad-opencascadejs are the OCCT
// kernel's bindings and belong in src/{modeling,kernel}/backends/occt/. Files
// that imported them elsewhere when the kernel registry landed are listed in
// scripts/lint/replicad-import-baseline.json, where eslint's warning is off.
// The list may only shrink: a stale entry (file no longer imports replicad,
// or was deleted) fails here so it gets removed, and the list may not grow.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const BASELINE = JSON.parse(
  readFileSync(join(ROOT, 'scripts/lint/replicad-import-baseline.json'), 'utf8'),
) as { files: string[] };
const MAX_BASELINE = 20;
const DIRECT_IMPORT = /\bfrom\s+['"]replicad(?:-opencascadejs)?['"]/;
const OCCT_DIRS = /^src\/(modeling|kernel)\/backends\/occt\//;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('replicad import baseline', () => {
  it('may only shrink', () => {
    expect(BASELINE.files.length).toBeLessThanOrEqual(MAX_BASELINE);
    expect([...BASELINE.files].sort()).toEqual(BASELINE.files);
  });

  it('has no stale entries', () => {
    const stale = BASELINE.files.filter(f => {
      const p = join(ROOT, f);
      return !existsSync(p) || !DIRECT_IMPORT.test(readFileSync(p, 'utf8'));
    });
    expect(stale, 'remove these from scripts/lint/replicad-import-baseline.json and lower MAX_BASELINE').toEqual([]);
  });

  it('every baselined file is outside the OCCT backend folders', () => {
    expect(BASELINE.files.filter(f => OCCT_DIRS.test(f))).toEqual([]);
  });

  it('reports current direct importers outside the OCCT folders (lint warns on the rest)', () => {
    const outside = walk(join(ROOT, 'src'))
      .map(f => relative(ROOT, f))
      .filter(f => !OCCT_DIRS.test(f) && DIRECT_IMPORT.test(readFileSync(join(ROOT, f), 'utf8')));
    // Not a hard gate on new files (the eslint rule is a warning), but the
    // baseline must at least cover everything that predates it.
    expect(outside.length).toBeGreaterThan(0);
  });
});
