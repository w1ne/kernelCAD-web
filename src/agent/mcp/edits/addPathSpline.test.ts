// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/addPathSpline.test.ts
//
// V slice — Task V4: tangent-extension input shape for the add_path_spline
// MCP edit. The pre-existing integration test
// (tests/integration/mcp/addPathSpline.test.ts) covers the no-tangent
// regression; this file owns the tangent-extension contract.

import { describe, it, expect } from 'vitest';
import { addPathSpline } from './addPathSpline';

const SEED = [
  'const brow = path().moveTo(0, 0);',
  'const profile = brow.lineTo(40, 0).close();',
  'const part = profile.extrude(5);',
  'return part;',
].join('\n');

describe('add_path_spline — tangent extension (V slice)', () => {
  it('emits a .spline call with startTangent + endTangent in opts', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [5, 10], [10, 0]],
      startTangent: [1, 0],
      endTangent: [1, 0],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.spline([[0,0],[5,10],[10,0]], { startTangent: [1,0], endTangent: [1,0] })');
  });

  it('emits a .spline call with ONLY startTangent', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [5, 10], [10, 0]],
      startTangent: [0, 1],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.spline([[0,0],[5,10],[10,0]], { startTangent: [0,1] })');
    expect(r.new_code).not.toContain('endTangent');
  });

  it('emits a .spline call without opts when no tangents provided', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [1, 1]],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.spline([[0,0],[1,1]])');
    expect(r.new_code).not.toContain('startTangent');
    expect(r.new_code).not.toContain('endTangent');
  });

  it('rejects malformed startTangent (non-finite)', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [1, 1]],
      startTangent: [Infinity, 0],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/startTangent/);
  });

  it('rejects malformed endTangent (non-finite)', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [1, 1]],
      endTangent: [0, NaN],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/endTangent/);
  });

  it('rejects malformed startTangent (wrong arity)', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [1, 1]],
      // wrong arity — 3 elements instead of 2
      startTangent: [1, 0, 0] as unknown as [number, number],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/startTangent/);
  });

  it('combines tension and tangent opts in a single options object', () => {
    const r = addPathSpline({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [5, 10], [10, 0]],
      tension: 0.5,
      startTangent: [1, 0],
      endTangent: [1, 0],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('tension: 0.5');
    expect(r.new_code).toContain('startTangent: [1,0]');
    expect(r.new_code).toContain('endTangent: [1,0]');
  });
});
