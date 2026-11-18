// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../toolRegistry';

const BODY = 'box(20, 20, 20)';
const OVERLAP = 'box(20, 20, 20).translate(10, 0, 0)';
const APART = 'box(10, 10, 10).translate(30, 0, 0)';

interface PartRow {
  name: string;
  volume_mm3: number;
  bbox: { min: number[]; max: number[] };
}

function rows(result: { parts: PartRow[] }): PartRow[] {
  return result.parts;
}

describe('split_keep_parts', () => {
  it('returns three parts when the boxes overlap', async () => {
    const result = await callMcpTool('split_keep_parts', { body_code: BODY, tool_code: OVERLAP }) as { ok: boolean; parts: PartRow[] };
    expect(result.ok).toBe(true);
    expect(rows(result).map((part) => part.name)).toEqual(['intersection', 'a_only', 'b_only']);
    for (const part of rows(result)) {
      expect(part.volume_mm3).toBeCloseTo(4000, 0);
      expect(part.bbox.max[0] - part.bbox.min[0]).toBeCloseTo(10, 1);
    }
  }, 60_000);

  it('omits the empty intersection when the operands are disjoint', async () => {
    const result = await callMcpTool('split_keep_parts', {
      code: 'return box(10, 10, 10).split(box(10, 10, 10).translate(30, 0, 0));',
    }) as { ok: boolean; parts: PartRow[] };
    expect(result.ok).toBe(true);
    expect(rows(result).map((part) => part.name)).toEqual(['a_only', 'b_only']);
    expect(rows(result)[0].volume_mm3).toBeCloseTo(1000, 0);
    expect(rows(result)[1].volume_mm3).toBeCloseTo(1000, 0);
  }, 60_000);

  it('returns one solid for a single keep and refuses an empty fragment', async () => {
    const kept = await callMcpTool('split_keep_parts', {
      body_code: BODY,
      tool_code: OVERLAP,
      keep: 'intersection',
    }) as { ok: boolean; parts: PartRow[] };
    expect(kept.ok).toBe(true);
    expect(rows(kept)).toHaveLength(1);
    expect(rows(kept)[0].name).toBe('intersection');
    expect(rows(kept)[0].volume_mm3).toBeCloseTo(4000, 0);

    const empty = await callMcpTool('split_keep_parts', {
      body_code: 'box(10, 10, 10)',
      tool_code: APART,
      keep: 'intersection',
    }) as { ok: boolean; errorCode?: string; parts: PartRow[] };
    expect(empty.ok).toBe(false);
    expect(empty.errorCode).toBe('feature.intersection-empty');
    expect(empty.parts).toEqual([]);
  }, 60_000);

  it('does not treat subtract as a split', async () => {
    const result = await callMcpTool('split_keep_parts', {
      code: 'return box(20, 20, 20).subtract(box(20, 20, 20).translate(10, 0, 0));',
    }) as { ok: boolean; parts: unknown[] };
    expect(result.ok).toBe(false);
    expect(result.parts).toEqual([]);
  }, 60_000);

  it('refuses a missing script and an unknown keep', async () => {
    const missing = await callMcpTool('split_keep_parts', {}) as { ok: boolean; errorCode?: string };
    expect(missing.ok).toBe(false);
    expect(missing.errorCode).toBe('cli.invalid-args');
    const keep = await callMcpTool('split_keep_parts', {
      body_code: BODY,
      tool_code: OVERLAP,
      keep: 'both',
    }) as { ok: boolean; errorCode?: string };
    expect(keep.ok).toBe(false);
    expect(keep.errorCode).toBe('cli.invalid-args');
  });
});
