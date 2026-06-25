// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/subtractiveNoOpGate.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../agent/mcp/tools/evaluateScript';

// End-to-end: the subtractive no-op gate must turn a boolean difference that
// removes nothing (cutter misses the base) into a loud error — not a silent
// success returning the unchanged solid — while leaving a real cut untouched.
describe('subtractive no-op gate (boolean difference) — end to end', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('errors when a boolean difference removes nothing (cutter misses the base)', async () => {
    const code = [
      'const base = box(10, 10, 10);',
      'const cutter = box(2, 2, 2).translate(100, 100, 100);',
      'return base.subtract(cutter);',
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.subtractive-noop' && d.severity === 'error')).toBe(true);
    expect(r.ok).toBe(false);
  });

  it('succeeds when the cutter overlaps and removes material', async () => {
    const code = [
      'const base = box(10, 10, 10);',
      'const cutter = box(4, 4, 20);',
      'return base.subtract(cutter);',
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('errors when a hole is drilled off the face (removes nothing)', async () => {
    const code = `return box(20, 20, 20).hole('top', { u: 80, v: 0, diameter: 4, depth: 10 });`;
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.subtractive-noop' && d.severity === 'error')).toBe(true);
    expect(r.ok).toBe(false);
  });

  it('succeeds for a real through hole', async () => {
    const code = `return box(20, 20, 20).hole('top', { u: 0, v: 0, diameter: 4, depth: 25 });`;
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('errors when a cutout profile sits off the face (removes nothing)', async () => {
    const code = [
      'const p = path().moveTo(48, 48).lineTo(52, 48).lineTo(52, 52).lineTo(48, 52).close();',
      "return box(20, 20, 5).cutout(p, { face: 'top', depth: 3 });",
    ].join('\n');
    const r = await evaluateScriptTool({ code });
    expect(r.diagnostics.some(d => d.code === 'feature.subtractive-noop' && d.severity === 'error')).toBe(true);
    expect(r.ok).toBe(false);
  });
});
