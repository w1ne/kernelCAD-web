// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// S6 — edit preview against intent. `set_param({ preview: true })` builds the
// edit in a scratch session and returns geometry + ledger + binding diffs
// without touching the source, the active MCP session or its caches.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { setParamValueTool, type SetParamValueOutput } from '../../../src/agent/mcp/tools/setParamValue';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { getActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const LEDGER_CODE = `
const w = param('Width', 40, { min: 10, max: 100 });
const body = box(w, 20, 5);
require('bracket-volume', volume(body).gte(3970));
require('width-band', bbox(body).within({ x: [39, 41], y: [19, 21], z: [4, 6] }));
return body;
`;

const BINDING_CODE = `
const w = param('w', 30, { min: 20, max: 60 });
const plate = box(w, 40, 6);
const boss = box(w.subtract(10), 20, 10).translate(5, 10, 6);
return plate.union(boss).fillet(1, { face: { byNormal: 'Z', minArea: 700, maxArea: 900 } });
`;

const INVALID_EDIT_CODE = `
const w = param('Width', 40);
return box(w, 20, 5).hole('top', { u: 0, v: 0, diameter: w.multiply(-1), depth: 'through' });
`;

const PLAIN_CODE = `
const w = param('Width', 40);
return box(w, 20, 5);
`;

function byName<T extends { name: string }>(entries: T[], name: string): T | undefined {
  return entries.find((entry) => entry.name === name);
}

describe('set_param preview (S6)', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns the geometry diff and a ledger diff with a flip and a margin shrink', async () => {
    const r = await setParamValueTool({
      code: LEDGER_CODE,
      param_name: 'Width',
      new_value: 39.5,
      preview: true,
    });

    expect(r.ok).toBe(true);
    expect(r.preview).toBe(true);
    expect(r.new_code).toContain(`param('Width', 39.5`);
    expect(r.geometry?.ok).toBe(true);
    expect(r.geometry?.summary.resized).toBe(1);
    expect(r.geometry?.summary.totalRemovedMm3).toBeCloseTo(50, 0);

    const diff = r.requirementsDiff!;
    expect(diff.summary.flipped).toBe(1);
    expect(byName(diff.flipped, 'bracket-volume')).toMatchObject({
      before: { status: 'pass' },
      after: { status: 'fail' },
      margin: { direction: 'shrink' },
    });
    expect(byName(diff.marginsShrunk, 'width-band')).toMatchObject({
      before: { status: 'pass', margin: 1 },
      after: { status: 'pass', margin: 0.5 },
    });
    expect(r.after?.requirementsOk).toBe(false);
  });

  it('reports an S1 selector that re-bound to another face', async () => {
    const r = await setParamValueTool({
      code: BINDING_CODE,
      param_name: 'w',
      new_value: 50,
      preview: true,
    });

    expect(r.ok).toBe(true);
    expect(r.bindings).toHaveLength(1);
    expect(r.bindings![0]).toMatchObject({
      consumerFeatureId: 'fillet_1',
      verdict: 'changed',
      pairs: [{ reasons: ['producing feature box_1 -> box_2'] }],
    });
    expect(r.geometry?.summary.topologyChanged).toBe(1);
  });

  it('leaves the active session, source, selections and caches untouched', async () => {
    await evaluateScriptTool({ code: LEDGER_CODE });
    const active = getActiveMcpSession()!;
    const codeBefore = active.code;
    const selectionsBefore = active.selections;
    const cachedBefore = new Map(active.session.cachedShapes);
    const envBefore = process.env.KERNELCAD_VALIDATE_DEFAULT;

    const r = await setParamValueTool({
      code: LEDGER_CODE,
      param_name: 'Width',
      new_value: 39.5,
      preview: true,
    });

    expect(r.ok).toBe(true);
    expect(getActiveMcpSession()).toBe(active);
    expect(active.code).toBe(codeBefore);
    expect(active.selections).toBe(selectionsBefore);
    expect(active.session.cachedShapes.size).toBe(cachedBefore.size);
    for (const [id, shape] of cachedBefore) {
      expect(active.session.cachedShapes.get(id)).toBe(shape);
    }
    expect(process.env.KERNELCAD_VALIDATE_DEFAULT).toBe(envBefore);
    // The preview returned the rewritten source, but the input string itself
    // was never changed and nothing wrote it to disk.
    expect(LEDGER_CODE).toContain(`param('Width', 40`);
    expect(r.new_code).toContain(`param('Width', 39.5`);
  });

  it('fails an invalid edit without side effects and returns no diff', async () => {
    await evaluateScriptTool({ code: PLAIN_CODE });
    const active = getActiveMcpSession()!;
    const cachedBefore = new Map(active.session.cachedShapes);

    const r = await setParamValueTool({
      code: INVALID_EDIT_CODE,
      param_name: 'Width',
      new_value: -5,
      preview: true,
    });

    expect(r.ok).toBe(false);
    expect(r.preview).toBe(true);
    expect(r.new_code).toBeUndefined();
    expect(r.geometry).toBeUndefined();
    expect(r.requirementsDiff).toBeUndefined();
    expect(r.error).toMatch(/diameter|negative|> 0/i);
    expect(getActiveMcpSession()).toBe(active);
    expect(active.session.cachedShapes.size).toBe(cachedBefore.size);
    for (const [id, shape] of cachedBefore) {
      expect(active.session.cachedShapes.get(id)).toBe(shape);
    }
  });

  it('is wired through the public MCP dispatcher', async () => {
    const r = await callMcpTool('set_param', {
      code: PLAIN_CODE,
      param_name: 'Width',
      new_value: 50,
      preview: true,
    }) as SetParamValueOutput;

    expect(r.ok).toBe(true);
    expect(r.preview).toBe(true);
    expect(r.geometry?.summary.resized).toBe(1);
    expect(r.after?.requirementsOk).toBe(true);
  });
});
