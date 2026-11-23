// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// dfm_fix_recheck: one bounded edit, then the same dfm_review suite.
// Local validation of the loop — not a printed or moulded part.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmFixRecheckTool } from '../../../src/agent/mcp/tools/dfmFixRecheck';

const POCKET = 'return box(40, 40, 10).subtract(box(20, 20, 8).fillet(1).translate(10, 10, 5));';
const THIN_SHELL = "return box(40, 30, 10).shell(0.3, { face: 'top' });";
const LONG_SHELL = "return box(400, 40, 10).shell(0.3, { face: 'top' });";
const TEE = `
  const stem = box(4, 10, 20).translate(10, 0, 0);
  const bar = box(24, 10, 4).translate(0, 0, 20);
  return stem.union(bar);
`;

describe('dfm_fix_recheck', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('does not label an unmeasured sheet-metal review as passed', async () => {
    const result = await dfmFixRecheckTool({
      code: 'return box(20, 20, 10);',
      processes: ['sheet-metal'],
    });
    expect(result.before.verdict).toBe('not-checked');
    expect(result.remaining).toEqual([
      expect.objectContaining({ id: 'sheet.not-sheet-metal', status: 'not-checked' }),
    ]);
    expect(result.suggestions).toEqual([]);
    expect(result.refusal).toMatch(/incomplete|not.checked/i);
    expect(result.refusal).not.toMatch(/review passed/i);
  }, 120_000);

  it('retains comparison tolerance in open findings', async () => {
    const result = await dfmFixRecheckTool({
      code: 'return box(40, 30, 3);',
      process: 'injection-molding',
    });
    const draft = result.before.findings.find(f => f.id === 'mold.draft');
    expect(draft).toMatchObject({ op: '>=', unit: 'deg', tolerance: 0.001 });
  }, 120_000);

  it('raises a pocket fillet to the end-mill radius and the corner check passes', async () => {
    const result = await dfmFixRecheckTool({
      code: POCKET,
      processes: ['cnc'],
      tool_diameter_mm: 4,
    });
    expect(result.applied).toBe(true);
    expect(result.status).toBe('applied');
    expect(result.bounds).toEqual({ maxApplies: 1, appliedCount: 1 });
    expect(result.change).toMatchObject({
      kind: 'increase-fillet-radius',
      feature: 'fillet_1',
      param: 'radius',
      before: 1,
      after: 2,
    });
    expect(result.new_code).toContain('.fillet(2)');
    expect(result.new_code).not.toContain('.fillet(1)');
    expect(result.cleared.map(c => c.id)).toContain('cnc.internal-corner-radius');
    expect(result.after?.verdict).toBe('pass');
    expect(result.remaining.map(f => f.id)).not.toContain('cnc.internal-corner-radius');
    expect(result.after?.findings.filter(f => f.status === 'fail')).toEqual([]);
  }, 120_000);

  it('returns suggested text and does not edit when no safe fix exists', async () => {
    const result = await dfmFixRecheckTool({ code: TEE, process: 'fdm', material: 'PLA' });
    expect(result.ok).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.status).toBe('no-safe-fix');
    expect(result.new_code).toBeUndefined();
    expect(result.change).toBeUndefined();
    expect(result.after).toBeUndefined();
    expect(result.material).toBe('PLA');
    expect(result.before.verdict).toBe('fail');
    expect(result.refusal).toMatch(/no safe auto-fix/i);
    expect(result.suggestions.some(s => s.id === 'fdm.overhangs' && s.guidance.length > 0)).toBe(true);
    expect(result.bounds.appliedCount).toBe(0);
  }, 120_000);

  it('thickens the shell, then reports the bed-fit failure that remains', async () => {
    const result = await dfmFixRecheckTool({ code: LONG_SHELL, processes: ['fdm'] });
    expect(result.applied).toBe(true);
    expect(result.change).toMatchObject({
      kind: 'thicken-wall',
      feature: 'shell_1',
      param: 'thickness',
      before: 0.3,
      after: 0.81,
      namedLimit: 0.8,
    });
    expect(result.before.findings.find(f => f.id === 'fdm.min-wall')).toMatchObject({ unit: 'mm', op: '>=', limit: 0.8 });
    expect(result.before.findings.find(f => f.id === 'fdm.min-wall')?.tolerance).toBeUndefined();
    expect(result.new_code).toContain('shell(0.81');
    expect(result.cleared.map(c => c.id)).toContain('fdm.min-wall');
    expect(result.after?.verdict).toBe('fail');
    expect(result.remaining.map(f => f.id)).toContain('fdm.bed-fit');
    expect(result.remaining.map(f => f.id)).not.toContain('fdm.min-wall');
    expect(result.bounds.appliedCount).toBe(1);
  }, 120_000);

  it('does not apply a wall fix when the caller targeted a finding with no safe edit', async () => {
    const result = await dfmFixRecheckTool({
      code: THIN_SHELL,
      processes: ['fdm'],
      finding_id: 'fdm.bed-fit',
    });
    expect(result.applied).toBe(false);
    expect(result.new_code).toBeUndefined();
    expect(result.refusal).toMatch(/fdm\.bed-fit/);
  }, 120_000);
});
