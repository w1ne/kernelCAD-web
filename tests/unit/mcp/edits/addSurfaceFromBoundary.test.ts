// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/mcp/edits/addSurfaceFromBoundary.test.ts
//
// Characterisation of addSurfaceFromBoundary before the complexity split:
// pins every validation error string, the generated binding text and the
// default-binding counter.

import { describe, it, expect } from 'vitest';
import { addSurfaceFromBoundary } from '../../../../src/agent/mcp/edits/addSurfaceFromBoundary';

const CODE = [
  'const bottom = nurbsCurve([[0,0,0]]);',
  'const right = nurbsCurve([[0,0,0]]);',
  'const top = nurbsCurve([[0,0,0]]);',
  'const left = nurbsCurve([[0,0,0]]);',
  'return bottom;',
].join('\n');

const FOUR = ['bottom', 'right', 'top', 'left'];

describe('addSurfaceFromBoundary', () => {
  it('inserts a minimal declaration with a derived binding name', () => {
    const r = addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR });
    expect(r).toEqual({
      ok: true,
      new_code: `${CODE.replace('return bottom;', '')}const _surface_1 = surfaceFromBoundary([bottom, right, top, left]);\nreturn bottom;`,
    });
  });

  it('honors explicit binding_name + continuity + sampling', () => {
    const r = addSurfaceFromBoundary({
      code: CODE,
      curve_bindings: FOUR,
      continuity: 'C1',
      sampling: 21,
      binding_name: 'frontPatch',
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const frontPatch = surfaceFromBoundary([bottom, right, top, left], { continuity: "C1", sampling: 21 });');
  });

  it('serializes a continuity array verbatim', () => {
    const r = addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, continuity: ['C0', 'C1', 'C2', 'C2'] });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('continuity: ["C0","C1","C2","C2"]');
  });

  it('rejects a non-tuple curve_bindings verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: 'x' as never })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: curve_bindings must be a tuple of exactly 4 Curve3D variable names.',
    });
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: ['a', 'b', 'c'] as never })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: curve_bindings must be a tuple of exactly 4 Curve3D variable names.',
    });
  });

  it('rejects non-identifier curve bindings verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: ['a', 'b', 'c', '9bad'] })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: curve_bindings must be JS identifiers; got "9bad".',
    });
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: ['a', 'b', 'c', 5] as never })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: curve_bindings must be JS identifiers; got 5.',
    });
  });

  it('rejects an undeclared curve binding verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: ['bottom', 'right', 'top', 'missing'] })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: curve binding "missing" is not declared in the source.',
    });
  });

  it('rejects a bad scalar continuity verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, continuity: 'C3' as never })).toEqual({
      ok: false,
      error: "add_surface_from_boundary: continuity must be 'C0' | 'C1' | 'C2' or an array of 4; got \"C3\".",
    });
  });

  it('rejects a continuity array of the wrong length verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, continuity: ['C0', 'C1', 'C2'] as never })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: continuity array must be length 4; got 3.',
    });
  });

  it('rejects a bad continuity array entry verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, continuity: ['C0', 'C1', 'C2', 'C9'] as never })).toEqual({
      ok: false,
      error: "add_surface_from_boundary: continuity entries must be 'C0' | 'C1' | 'C2'; got \"C9\".",
    });
  });

  it('rejects a bad sampling verbatim', () => {
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, sampling: 0 })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: sampling must be a finite positive integer; got 0.',
    });
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, sampling: NaN })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: sampling must be a finite positive integer; got null.',
    });
    expect(addSurfaceFromBoundary({ code: CODE, curve_bindings: FOUR, sampling: '5' as never })).toEqual({
      ok: false,
      error: 'add_surface_from_boundary: sampling must be a finite positive integer; got "5".',
    });
  });

  it('propagates the addFeature error when no top-level return exists', () => {
    expect(addSurfaceFromBoundary({ code: 'const bottom = 1;', curve_bindings: ['bottom', 'bottom', 'bottom', 'bottom'] })).toEqual({
      ok: false,
      error: 'no return statement found at top level — cannot place new feature.',
    });
  });
});
