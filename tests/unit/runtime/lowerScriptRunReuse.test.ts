// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// validate / export lower an executed script once and reuse the session's
// clean full lower — and lower again whenever reuse could change the output
// (a dirty lower, active gates).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { runScript } from '../../../src/composition/runScript';
import { lowerScriptRun } from '../../../src/agent/script-runtime/lowerScriptRun';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { Shape } from '../../../src/modeling/capture/proxy';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const PART = `
  const plate = box(40, 30, 4).subtract(cylinder(10, 3).translate(10, 10, -1));
  return plate.translate(0, 0, 1);
`;
// An over-sized fillet fails to lower: an error diagnostic, unhealthy record.
const BROKEN = `return box(10, 10, 10).fillet(20);`;

function countLowering(): string[] {
  const ids: string[] = [];
  const original = OcctLowerer.prototype.lower;
  vi.spyOn(OcctLowerer.prototype, 'lower').mockImplementation(function (this: OcctLowerer, record, inputs) {
    ids.push(record.id);
    return original.call(this, record, inputs);
  });
  return ids;
}

const run = (code: string) => runScript({ code, fileName: 'reuse.kcad.ts' });

describe('lowerScriptRun reuses the clean full lower', () => {
  beforeAll(async () => { await initOcct(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('a second consumer lowers nothing and sees the same shapes and diagnostics', async () => {
    const r = await run(PART);
    const lowered = countLowering();
    const first = await lowerScriptRun(r);
    const n = lowered.length;
    expect(n).toBeGreaterThan(0);
    const second = await lowerScriptRun(r);
    expect(lowered.length).toBe(n);
    expect(second.diagnostics).toEqual(first.diagnostics);
    for (const rec of r.records) expect(second.shapes.get(rec.id)).toBe(first.shapes.get(rec.id));
    // Physical review's Shape.lower() reuses it too.
    await (r.returnValue as Shape).lower();
    expect(lowered.length).toBe(n);
  });

  it('a clean Shape.lower() in the script is reused', async () => {
    const r = await run(PART);
    const lowered = countLowering();
    await (r.returnValue as Shape).lower();
    const n = lowered.length;
    await lowerScriptRun(r);
    expect(lowered.length).toBe(n);
  });

  it('lowers again after a dirty lower, so diagnostics are reported every time', async () => {
    const r = await run(BROKEN);
    const lowered = countLowering();
    const first = await lowerScriptRun(r);
    expect(first.diagnostics.length).toBeGreaterThan(0);
    const n = lowered.length;
    const second = await lowerScriptRun(r);
    expect(lowered.length).toBe(2 * n);
    expect(second.diagnostics).toEqual(first.diagnostics);
  });

  it('does not reuse while gates are active', async () => {
    const r = await run(PART);
    await lowerScriptRun(r);
    const lowered = countLowering();
    await lowerScriptRun(r);
    expect(lowered.length).toBe(0);
    r.session.gatedFeatureNames.set('gate', undefined);
    await lowerScriptRun(r);
    expect(lowered.length).toBeGreaterThan(0);
  });
});
