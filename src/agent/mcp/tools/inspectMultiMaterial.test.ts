// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { runMcpScript } from '../runMcpScript';
import { inspectMultiMaterialTool } from './inspectMultiMaterial';

vi.mock('../runMcpScript', () => ({ runMcpScript: vi.fn() }));

describe('inspect multi-material analysis', () => {
  it('finds differently materialled boolean ancestry and returns a rewrite plan', async () => {
    vi.mocked(runMcpScript).mockResolvedValue({
      ok: true,
      fileName: '<inline>',
      run: {
        records: [
          record('insert', 'box', {}, { material: { baseColor: '#d0a000' } }),
          record('body', 'box', {}, { material: { baseColor: '#52606d' } }),
          record('fuse', 'boolean', { a: { kind: 'feature', id: 'insert' }, b: { kind: 'feature', id: 'body' } }, { material: { baseColor: '#52606d' } }, 'union'),
        ],
      } as never,
    });
    const result = await inspectMultiMaterialTool({ code: 'const result = body.union(insert);' });
    expect(result.shadowedLeaves).toHaveLength(1);
    expect(result.shadowedLeaves[0]).toMatchObject({ leafFeatureId: 'insert', shadowingFeatureId: 'fuse' });
    expect(result.shadowedLeaves[0].rewrite).toContain("arm.part('insert', insert)");
    expect(result.limitations[0]).toContain('does not attribute faces');
  });

  it('does not flag same-material union operands or subtract cutters', async () => {
    vi.mocked(runMcpScript).mockResolvedValue({
      ok: true,
      fileName: '<inline>',
      run: {
        records: [
          record('left', 'box', {}, { material: { baseColor: '#777777' } }),
          record('right', 'box', {}, { material: { baseColor: '#777777' } }),
          record('same', 'boolean', { a: { kind: 'feature', id: 'left' }, b: { kind: 'feature', id: 'right' } }, { material: { baseColor: '#777777' } }, 'union'),
          record('cutter', 'box', {}, { material: { baseColor: '#ff0000' } }),
          record('cut', 'boolean', { a: { kind: 'feature', id: 'same' }, b: { kind: 'feature', id: 'cutter' } }, { material: { baseColor: '#777777' } }, 'subtract'),
        ],
      } as never,
    });
    const result = await inspectMultiMaterialTool({ code: 'result' });
    expect(result.shadowedLeaves).toEqual([]);
  });
});

function record(
  id: string,
  kind: string,
  inputs: Record<string, unknown>,
  metadata: Record<string, unknown>,
  op?: string,
) {
  return {
    id, kind, inputs, metadata, transforms: [], suppressed: false,
    params: op ? { op: { evaluated: 0, expression: `'${op === 'subtract' ? 'difference' : op}'`, unit: '' } } : {},
  };
}
