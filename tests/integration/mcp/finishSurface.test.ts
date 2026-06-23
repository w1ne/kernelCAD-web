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

  it('sew honors tolerance + require_closed + binding_name', async () => {
    const out = await addSurfaceTool({
      kind: 'sew',
      code: SEED_CODE,
      surface_bindings: ['surf'],
      tolerance: 0.01,
      require_closed: true,
      binding_name: 'solid',
    } as never);
    const r = out as { ok: boolean; new_code?: string };
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const solid = sew([surf], { tolerance: 0.01, requireClosed: true });');
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
  it('routes add_surface kind:"draft" to the draft op and inserts a .draft() call', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'myBox',
      angle_deg: 5,
      face: 'top',
    } as never);
    const r = out as { ok: boolean; new_code?: string };
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _drafted_1 = myBox\.draft\(5, \{ face: "top" \}\)/);
  });

  it('draft honors neutral_plane + pull_dir + binding_name', async () => {
    const out = await addSurfaceTool({
      kind: 'draft',
      code: SEED_CODE,
      shape_binding: 'myBox',
      angle_deg: 3,
      face: 'side',
      neutral_plane: 'bottom',
      pull_dir: [0, 0, 1],
      binding_name: 'drafted',
    } as never);
    const r = out as { ok: boolean; new_code?: string };
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const drafted = myBox.draft(3, { face: "side", neutralPlane: "bottom", pullDir: [0,0,1] });');
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
});
