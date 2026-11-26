// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/mcp/finishSurface.test.ts
//
// NURBS Slice E Task 8: integration tests for the three finishing-op kinds
// added to the add_surface dispatcher: 'trim', 'sew', and 'draft'.
// Each test verifies that the dispatcher routes to the right handler,
// injects the correct statement, and returns a modified script.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addSurfaceTool } from '../../../src/agent/mcp/tools/addSurface';

// A minimal script with a NURBS surface and a shape that finishing ops can
// reference. The surface sits in the XY plane; the box provides a Shape for
// trim/sew cutter and for draft.
const SEED_CODE = [
  'const surf = nurbsSurface({ controls: [[[0,0,0],[10,0,0]],[[0,10,0],[10,10,0]]], degree: { u: 1, v: 1 } });',
  'const cutter = box(20, 20, 5);',
  'const myBox = box(10, 10, 10);',
  'return myBox;',
].join('\n');

describe('add_surface finishing ops dispatcher', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  // -------------------------------------------------------------------------
  // kind: 'sew'
  // -------------------------------------------------------------------------
  it('routes add_surface kind:"sew" to the sew op and inserts a sew(...) call', async () => {
    const out = await addSurfaceTool({
      kind: 'sew',
      code: SEED_CODE,
      surface_bindings: ['surf'],
    } as never);
    const r = out as { ok: boolean; new_code?: string; error?: string };
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _sewn_1 = sew\(\[surf\]\)/);
  });

  it('sew honors tolerance + require_closed + binding_name and surfaces open-shell honestly', async () => {
    const out = await addSurfaceTool({
      kind: 'sew',
      code: SEED_CODE,
      surface_bindings: ['surf'],
      tolerance: 0.01,
      require_closed: true,
      binding_name: 'solid',
    } as never);
    const r = out as { ok: boolean; new_code?: string; diagnostics?: Array<{ code: string }> };
    // A single flat sheet is not watertight, so require_closed: true must fail evaluation honestly.
    expect(r.ok).toBe(false);
    expect(r.new_code).toContain('const solid = sew([surf], { tolerance: 0.01, requireClosed: true });');
    expect(r.diagnostics?.some(d => d.code === 'feature.surface-sew.open-shell')).toBe(true);
  });

  it('sew rejects an undeclared surface binding', async () => {
    const out = await addSurfaceTool({
      kind: 'sew',
      code: SEED_CODE,
      surface_bindings: ['missing'],
    } as never);
    const r = out as { ok: boolean; error?: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/"missing" is not declared/);
  });

  // -------------------------------------------------------------------------
  // kind: 'trim'
  // -------------------------------------------------------------------------
  it('routes add_surface kind:"trim" to the trim op and inserts a .trimTo() call', async () => {
    const out = await addSurfaceTool({
      kind: 'trim',
      code: SEED_CODE,
      surface_binding: 'surf',
      by_binding: 'cutter',
      op: 'trim',
    } as never);
    const r = out as { ok: boolean; new_code?: string };
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _trimmed_1 = surf\.trimTo\(cutter\)/);
  });

  it('routes add_surface kind:"trim" op:"split" to .split() call', async () => {
    const out = await addSurfaceTool({
      kind: 'trim',
      code: SEED_CODE,
      surface_binding: 'surf',
      by_binding: 'cutter',
      op: 'split',
      binding_name: 'halves',
    } as never);
    const r = out as { ok: boolean; new_code?: string };
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const halves = surf.split(cutter);');
  });

  it('trim rejects an undeclared surface binding', async () => {
    const out = await addSurfaceTool({
      kind: 'trim',
      code: SEED_CODE,
      surface_binding: 'noSurf',
      by_binding: 'cutter',
      op: 'trim',
    } as never);
    const r = out as { ok: boolean; error?: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/"noSurf" is not declared/);
  });

  // -------------------------------------------------------------------------
  // kind: 'draft'
  // -------------------------------------------------------------------------
  it('routes add_surface kind:"draft" to the draft op, rewrites return, and changes volume (#911)', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'myBox',
      angle_deg: 5,
      face: 'top',
    } as never);
    const r = out as { ok: boolean; new_code?: string; sceneSummary?: { volume?: number } };
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _drafted_1 = myBox\.draft\(5, \{ face: "top" \}\)/);
    expect(r.new_code).toMatch(/return _drafted_1;\s*$/);
    // Unmodified box(10, 10, 10) has volume 1000; 5° draft tapers it measurably.
    expect(r.sceneSummary?.volume).toBeDefined();
    expect(r.sceneSummary?.volume).toBeLessThan(1000);
  });

  it('draft honors neutral_plane + pull_dir + binding_name and produces real drafted geometry', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'myBox',
      angle_deg: 3,
      face: 'front',
      neutral_plane: 'bottom',
      pull_dir: [0, 0, 1],
      binding_name: 'drafted',
    } as never);
    const r = out as { ok: boolean; new_code?: string; sceneSummary?: { volume?: number } };
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const drafted = myBox.draft(3, { face: "front", neutralPlane: "bottom", pullDir: [0,0,1] });');
    expect(r.new_code).toMatch(/return drafted;\s*$/);
    expect(r.sceneSummary?.volume).toBeLessThan(1000);
  });

  it('draft surfaces evaluation failure honestly instead of hardcoding ok:true (#911)', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'myBox',
      angle_deg: 3,
      face: 'side',
      neutral_plane: 'bottom',
      pull_dir: [0, 0, 1],
    } as never);
    const r = out as { ok: boolean; diagnostics?: Array<{ severity: string }> };
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.some(d => d.severity === 'error')).toBe(true);
  });

  it('draft fails closed when shape_binding is not the returned expression (#911)', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'cutter',
      angle_deg: 5,
      face: 'top',
    } as never);
    const r = out as { ok: boolean; errorCode?: string; new_code?: string };
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.add.expression-unused');
    expect(r.new_code).toBeUndefined();
  });

  it('trim rewrites return when the script directly returns the trimmed surface', async () => {
    const out = await addSurfaceTool({
      kind: 'trim',
      code: [
        'const surf = nurbsSurface({ controls: [[[0,0,0],[10,0,0]],[[0,10,0],[10,10,0]]], degree: { u: 1, v: 1 } });',
        'const cutter = box(20, 20, 5);',
        'return surf;',
      ].join('\n'),
      surface_binding: 'surf',
      by_binding: 'cutter',
      op: 'trim',
    } as never);
    const r = out as { ok: boolean; new_code?: string };
    expect(r.new_code).toMatch(/const _trimmed_1 = surf\.trimTo\(cutter\);/);
    expect(r.new_code).toMatch(/return _trimmed_1;\s*$/);
  });

  it('draft rejects an angle outside [0, 90]', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'myBox',
      angle_deg: 95,
      face: 'top',
    } as never);
    const r = out as { ok: boolean; error?: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/angle_deg must be a finite number in \[0, 90\]/);
  });

  // -------------------------------------------------------------------------
  // dispatcher: unknown kind still rejected
  // -------------------------------------------------------------------------
  it('rejects an unknown kind with an actionable error', async () => {
    await expect(
      addSurfaceTool({ kind: 'unknown-op' as never, code: SEED_CODE }),
    ).rejects.toThrow(/Unknown add_surface kind: unknown-op/);
  });

  // -------------------------------------------------------------------------
  // Geometry outcome: sew diagnostic round-trips through the MCP layer
  // -------------------------------------------------------------------------

  // Six nurbsSurface bindings forming the faces of a unit cube [0,1]^3.
  const CUBE_FACE_CODE = [
    // controls layout: [[a,d],[b,c]] maps corners (see surfaceSew.test.ts)
    'const f0 = nurbsSurface({ controls: [[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]]], degree: { u: 1, v: 1 } });',
    'const f1 = nurbsSurface({ controls: [[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]]], degree: { u: 1, v: 1 } });',
    'const f2 = nurbsSurface({ controls: [[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]]], degree: { u: 1, v: 1 } });',
    'const f3 = nurbsSurface({ controls: [[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]], degree: { u: 1, v: 1 } });',
    'const f4 = nurbsSurface({ controls: [[[0,0,0],[0,1,0]],[[0,0,1],[0,1,1]]], degree: { u: 1, v: 1 } });',
    'const f5 = nurbsSurface({ controls: [[[1,0,0],[1,1,0]],[[1,0,1],[1,1,1]]], degree: { u: 1, v: 1 } });',
    'return f0;',
  ].join('\n');

  it('geometry outcome: closed sew of 6 cube faces returns ok:true and no open-shell diagnostic', async () => {
    const out = await addSurfaceTool({
      kind: 'sew',
      code: CUBE_FACE_CODE,
      surface_bindings: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'],
      require_closed: true,
    } as never);
    const r = out as { ok: boolean; diagnostics?: Array<{ code: string }> };
    expect(r.ok).toBe(true);
    const openShell = (r.diagnostics ?? []).some(d => d.code === 'feature.surface-sew.open-shell');
    expect(openShell).toBe(false);
  }, 60_000);

  it('geometry outcome: open sew (5 of 6 faces) with require_closed emits open-shell diagnostic', async () => {
    const out = await addSurfaceTool({
      kind: 'sew',
      code: CUBE_FACE_CODE,
      surface_bindings: ['f0', 'f1', 'f2', 'f3', 'f4'],
      require_closed: true,
    } as never);
    const r = out as { ok: boolean; diagnostics?: Array<{ code: string }> };
    expect(r.ok).toBe(false);
    const openShell = (r.diagnostics ?? []).some(d => d.code === 'feature.surface-sew.open-shell');
    expect(openShell).toBe(true);
  }, 60_000);
});
