// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Static and dynamic import specifiers in TypeScript files. */
const TS_PATTERNS = [
  /from\s+['"]([^'"]*src\/(?:funnel|studio)[^'"]*)['"]/g,
  /import\s*\(\s*['"]([^'"]*src\/(?:funnel|studio)[^'"]*)['"]/g,
];

/** Tailwind @source / @import paths in CSS files. */
const CSS_PATTERNS = [
  /@(?:source|import)\s+['"]([^'"]*src\/(?:funnel|studio)[^'"]*)['"]/g,
];

const PATTERNS: Record<string, readonly RegExp[]> = {
  '.ts': TS_PATTERNS,
  '.tsx': TS_PATTERNS,
  '.css': CSS_PATTERNS,
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (PATTERNS[extname(name)]) out.push(path);
  }
  return out;
}

describe('site does not import app source', () => {
  it('has no imports from src/funnel or src/studio', () => {
    const offenders: string[] = [];
    for (const file of walk('site')) {
      const body = readFileSync(file, 'utf8');
      for (const pattern of PATTERNS[extname(file)]) {
        for (const match of body.matchAll(pattern)) offenders.push(`${file}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
