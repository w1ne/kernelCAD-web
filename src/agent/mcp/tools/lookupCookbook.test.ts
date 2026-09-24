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

  it('surfaces the repair-loop snippet for a failing-fillet query', async () => {
    // Agents reach the trace-guided repair loop by describing the symptom,
    // not by knowing the tool names — so the symptom query must rank it first.
    const r = await lookupCookbookTool({ query: 'repair failing fillet' });
    expect(r.ok).toBe(true);
    expect(r.hits![0].id).toBe('repair-oversized-fillet');
    expect(r.hits![0].body).toContain('block.fillet(edgeRound)');
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

  it('routes organic car bodies to automotive-body-envelope', async () => {
    for (const q of ['automotive body envelope', 'organic car body', 'berlinetta body']) {
      const r = await lookupCookbookTool({ query: q });
      expect(r.ok).toBe(true);
      expect(r.hits!.map(h => h.id)).toContain('automotive-body-envelope');
    }
  });

  it('keeps stylized loft shell for polyline / hull demo intent', async () => {
    for (const q of ['loft a stylized body shell', 'hull from cross sections', 'mechanism demo shell']) {
      const r = await lookupCookbookTool({ query: q });
      expect(r.ok).toBe(true);
      expect(r.hits!.map(h => h.id)).toContain('loft-body-shell-from-profiles');
    }
  });

  it('ranks wrapTexture cylinder recipe first for a wrap query', async () => {
    for (const q of [
      'wrap a texture around a cylinder',
      'cylindrical UV projection wrapTexture',
    ]) {
      const r = await lookupCookbookTool({ query: q });
      expect(r.ok).toBe(true);
      expect(r.hits![0].id).toBe('wrap-texture-can-label');
      expect(r.hits![0].body).toContain('wrapTexture');
      expect(r.hits![0].body).toContain("type: 'cylinder'");
    }
  });
});
