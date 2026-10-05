// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/agent/evaluateDimensions.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const EXAMPLE = resolve('examples/gallery/mounting-bracket-dimensioned.kcad.ts');

/** The texts the example header promises, read from the file itself. */
function headerTexts(): string[] {
  const lines = readFileSync(EXAMPLE, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('// Expected declared dimension texts'));
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    const m = /^\/\/ {3}(.+)$/.exec(l);
    if (m === null) break;
    out.push(m[1]!);
  }
  return out;
}

describe('evaluate result: declared dimensions', () => {
  beforeAll(async () => { await initOcct(); });

  it('lists the declared dimensions of the gallery bracket, matching its header', async () => {
    const result = await evaluateScript({ file: EXAMPLE });
    expect(result.exitCode).toBe(0);
    expect(headerTexts().length).toBe(4);
    expect(result.dimensions?.map((d) => d.text)).toEqual(headerTexts());
    expect(result.dimensions?.every((d) => d.source === 'declared')).toBe(true);
    expect(result.dimensions?.map((d) => d.kind)).toEqual(['linear', 'linear', 'linear', 'diameter']);
  });

  it('omits dimensions when none are declared', async () => {
    const result = await evaluateScript({ code: 'return box(10, 10, 10);' });
    expect(result.dimensions).toBeUndefined();
  });

  it('reports a declared dimension whose query does not resolve', async () => {
    const result = await evaluateScript({
      code: "return box(10, 10, 10).dimension({ kind: 'diameter', edge: { ofCurveType: 'CIRCLE' } });",
    });
    expect(result.exitCode).toBe(0);
    expect(result.dimensions).toBeUndefined();
    const unresolved = result.diagnostics.filter((d) => d.code === 'drawing.dimension.unresolved');
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]).toMatchObject({ severity: 'warn' });
  });
});
