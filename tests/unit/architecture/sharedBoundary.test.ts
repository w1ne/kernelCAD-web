// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const SHARED_ROOT = join(ROOT, 'src/shared');

const FORBIDDEN_LAYER_IMPORT = /(?:from\s+['"]|import\(\s*['"])(?:\.\.\/)+(?:kernel|modeling|authoring|agent|studio)\//;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (/\.[cm]?tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('shared architecture boundary', () => {
  it('keeps src/shared free of imports into higher runtime layers', () => {
    const offenders = walk(SHARED_ROOT)
      .filter(file => FORBIDDEN_LAYER_IMPORT.test(readFileSync(file, 'utf8')))
      .map(file => relative(ROOT, file));

    expect(
      offenders,
      `src/shared must stay a leaf; move serializable contracts into shared instead:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
