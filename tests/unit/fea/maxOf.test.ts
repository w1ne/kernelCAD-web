import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maxOf } from '../../../src/kernel/fea/maxOf';
import { buildHeatmap } from '../../../src/kernel/fea/heatmap';
import type { FeaFieldResult, FeaMesh } from '../../../src/kernel/fea/types';

const N = 500_000;

describe('maxOf', () => {
  it('handles arrays far past the spread argument limit', () => {
    const a = Array.from({ length: N }, (_, i) => i);
    expect(() => Math.max(...a)).toThrow(RangeError);
    expect(maxOf(a)).toBe(N - 1);
    expect(maxOf(Float64Array.from(a))).toBe(N - 1);
  });
  it('is -Infinity when empty', () => {
    expect(maxOf([])).toBe(-Infinity);
  });
});

describe('buildHeatmap on a huge field', () => {
  it('does not overflow the stack', async () => {
    const vonMises = Array.from({ length: N }, (_, i) => i / 1000);
    const fields = { nodeIds: vonMises.map((_, i) => i + 1), vonMises } as unknown as FeaFieldResult;
    const mesh = { nodes: new Map(), elements: [], surfaces: [] } as unknown as FeaMesh;
    const build = await buildHeatmap(mesh, fields, await mkdtemp(join(tmpdir(), 'hm-')));
    expect(build).toBeDefined();
  });
});
