// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const IMPORT = /from\s+['"]([^'"]*src\/(?:funnel|studio)[^'"]*)['"]/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

describe('site does not import app source', () => {
  it('has no imports from src/funnel or src/studio', () => {
    const offenders: string[] = [];
    for (const file of walk('site')) {
      const body = readFileSync(file, 'utf8');
      for (const match of body.matchAll(IMPORT)) offenders.push(`${file}: ${match[1]}`);
    }
    expect(offenders).toEqual([]);
  });
});
