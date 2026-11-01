// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// set_param feature mode: change a feature's own literal arguments in place by
// feature id, rebuild before and after, and return the diff. Every rewrite is
// verified by re-capturing the script, so a guessed argument that does not
// produce the requested value is never returned.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { setParamValueTool } from '../../../src/agent/mcp/tools/setParamValue';
import { planFeatureParamEdit, formatNumberLiteral } from '../../../src/agent/mcp/edits/featureParamEdit';
import { getActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

// A plate with a bolt hole; the hole radius is a literal and the hole height
// is an expression of the plate thickness.
const BRACKET = `
const t = 5;
const base = box(60, 40, t);
const hole = cylinder(t + 2, 4).translate(30, 20, -1);
return base.subtract(hole).fillet(1);
`;

const PARAM_DRIVEN = `
const r = param('HoleR', 4, { min: 1, max: 10 });
const base = box(60, 40, 5);
return base.subtract(cylinder(7, r).translate(30, 20, -1));
`;

describe('set_param feature mode', () => {
  beforeAll(async () => { await initOcct(); });

  it('rewrites the hole radius in place, keeps everything else, and returns the before/after diff', async () => {
    const r = await setParamValueTool({ code: BRACKET, feature: 'cylinder_1', changes: { r: 3.3 } });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('cylinder(t + 2, 3.3)');
    // Only that argument changed.
    expect(r.new_code!.replace('3.3', '4')).toBe(BRACKET);
    expect(r.edits).toEqual([
      expect.objectContaining({ param: 'r', before: 4, after: 3.3, sourceBefore: '4', sourceAfter: '3.3', line: 4 }),
    ]);
    expect(r.changedParams).toEqual([{ feature: 'cylinder_1', param: 'r', before: 4, after: 3.3 }]);
    // Smaller hole: material is added back, the body is resized, nothing removed.
    expect(r.geometry?.summary.totalAddedMm3).toBeGreaterThan(0);
    expect(r.geometry?.summary.totalRemovedMm3 ?? 0).toBeLessThan(1e-3);
    expect(r.before?.buildOk).toBe(true);
    expect(r.after?.buildOk).toBe(true);
  }, 120_000);

  it('replaces an expression argument with the literal for this call only', async () => {
    const plan = await planFeatureParamEdit({ code: BRACKET, feature: 'cylinder_1', changes: { h: 12 } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.new_code).toContain('cylinder(12, 4)');
    // The shared `t` that drives the plate is untouched.
    expect(plan.new_code).toContain('const t = 5;');
    expect(plan.new_code).toContain('box(60, 40, t)');
    expect(plan.edits[0]).toMatchObject({ sourceBefore: 't + 2', sourceAfter: '12' });
  }, 60_000);

  it('edits a method-call feature (fillet radius) and several parameters at once', async () => {
    const fillet = await planFeatureParamEdit({ code: BRACKET, feature: 'fillet_1', changes: { radius: 0.5 } });
    expect(fillet.ok && fillet.new_code).toContain('.fillet(0.5)');
    const box = await planFeatureParamEdit({ code: BRACKET, feature: 'box_1', changes: { x: 80, y: 50 } });
    expect(box.ok && box.new_code).toContain('box(80, 50, t)');
  }, 60_000);

  it('refuses a param()-driven value and points at set_param', async () => {
    const r = await setParamValueTool({ code: PARAM_DRIVEN, feature: 'cylinder_1', changes: { r: 3 } });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.edit.param-driven');
    expect(r.hint).toContain("param_name: 'HoleR'");
  }, 60_000);

  it('names the valid ids and parameters on a bad request', async () => {
    const missing = await setParamValueTool({ code: BRACKET, feature: 'hole_9', changes: { r: 3 } });
    expect(missing).toMatchObject({ ok: false, errorCode: 'feature.not-found' });
    expect(missing.hint).toContain('cylinder_1');
    const unknown = await setParamValueTool({ code: BRACKET, feature: 'cylinder_1', changes: { diameter: 6 } });
    expect(unknown).toMatchObject({ ok: false, errorCode: 'feature.edit.unknown-param' });
    expect(unknown.hint).toContain('h, r');
    const empty = await setParamValueTool({ code: BRACKET });
    expect(empty.ok).toBe(false);
  }, 60_000);

  it('does not replace the active session, and works through the MCP registry', async () => {
    const before = getActiveMcpSession();
    const viaRegistry = await callMcpTool('set_param', { code: BRACKET, feature: 'cylinder_1', changes: { r: 3.3 } }) as { ok: boolean; new_code?: string };
    expect(viaRegistry.ok).toBe(true);
    expect(viaRegistry.new_code).toContain('3.3');
    expect(getActiveMcpSession()).toBe(before);
  }, 120_000);

  it('formats literals without float noise', () => {
    expect(formatNumberLiteral(6.6000000000000005)).toBe('6.6');
    expect(formatNumberLiteral(12)).toBe('12');
  });
});
