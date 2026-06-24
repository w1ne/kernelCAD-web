// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/additiveNoOpGate.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../agent/mcp/tools/evaluateScript';

// End-to-end: the additive/primitive no-op gate must turn an unambiguous empty
// result into a loud error rather than a silent success returning an empty
// shape, while leaving every legitimate (real overlap, normal primitive,
// containment union) build clean.
describe('additive / primitive no-op gate — end to end', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('errors when an intersection is empty (disjoint bodies)', async () => {
    const code = [
      'const a = box(10, 10, 10);',
      'const b = box(10, 10, 10).translate(100, 100, 100);',
      'return a.intersect(b);',
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.intersection-empty' && d.severity === 'error')).toBe(true);
    expect(r.ok).toBe(false);
  });

  it('succeeds when two bodies really overlap (intersection has volume)', async () => {
    const code = [
      'const a = box(10, 10, 10);',
      'const b = box(10, 10, 10).translate(5, 5, 5);',
      'return a.intersect(b);',
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.intersection-empty')).toBe(false);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('does NOT gate a containment union (union of fully-contained body is legitimate)', async () => {
    const code = [
      'const outer = box(20, 20, 20);',
      'const inner = box(4, 4, 4).translate(8, 8, 8);',
      'return outer.union(inner);',
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.intersection-empty')).toBe(false);
    expect(r.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(false);
    expect(r.ok).toBe(true);
  });

  it('succeeds for a normal box primitive (no false positive)', async () => {
    const r = await evaluateScriptTool({ code: 'return box(10, 10, 10);' });
    expect(r.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(false);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('succeeds for a normal cylinder and sphere (no false positive)', async () => {
    const cyl = await evaluateScriptTool({ code: 'return cylinder(10, 4);' });
    expect(cyl.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(false);
    expect(cyl.ok).toBe(true);
    const sph = await evaluateScriptTool({ code: 'return sphere(5);' });
    expect(sph.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(false);
    expect(sph.ok).toBe(true);
  });

  it('succeeds for a normal extrude (no false positive)', async () => {
    const code = [
      'const p = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close();',
      'return p.extrude(5);',
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(false);
    expect(r.ok).toBe(true);
  });
});
