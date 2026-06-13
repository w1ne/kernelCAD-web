// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

describe('lookupCookbookTool', () => {
  it('returns hits for a real query', async () => {
    const r = await lookupCookbookTool({ query: 'fillet after subtract' });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.hits)).toBe(true);
    expect(r.hits!.length).toBeGreaterThan(0);
    expect(r.hits![0]).toHaveProperty('id');
    expect(r.hits![0]).toHaveProperty('title');
    expect(r.hits![0]).toHaveProperty('when_to_use');
    expect(r.hits![0]).toHaveProperty('body');
    expect(r.hits![0]).toHaveProperty('score');
  });

  it('returns empty hits for queries below the floor', async () => {
    const r = await lookupCookbookTool({ query: 'mysterious-magic-token-xyz123' });
    expect(r.ok).toBe(true);
    expect(r.hits).toEqual([]);
  });

  it('errors on empty query', async () => {
    const r = await lookupCookbookTool({ query: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/query/i);
  });

  it('clamps k > 5 to 5', async () => {
    const r = await lookupCookbookTool({ query: 'fillet', k: 99 });
    expect(r.ok).toBe(true);
    expect(r.hits!.length).toBeLessThanOrEqual(5);
  });

  it('defaults k to 3', async () => {
    const r = await lookupCookbookTool({ query: 'plate' });
    expect(r.ok).toBe(true);
    expect(r.hits!.length).toBeLessThanOrEqual(3);
  });
});
