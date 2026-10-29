// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../activeSession';
import { evaluateScriptTool } from './evaluateScript';
import { addFeatureTool } from './addFeature';

beforeAll(async () => { await initOcct(); });
beforeEach(() => clearActiveMcpSession());
it('returns step validity and honest snapshot availability for a full evaluation', async () => {
  const out = await evaluateScriptTool({ code: 'return box(10, 10, 10);' });
  expect(out.step?.validity.status, JSON.stringify(out.step)).toBe('valid');
  expect(out.step?.validity.volume).toBeCloseTo(1000);
  expect(out.step?.snapshots.status).toBeDefined();
});
it('measures every assembly part without treating the scene as a single shape', async () => {
  const out = await evaluateScriptTool({ code: `
    const a = assembly('step evidence');
    a.part('body', box(10, 10, 10));
    a.part('cover', box(5, 5, 5).translate(30, 0, 0));
    return a.model();
  `, skipMechanismCheck: true });
  expect(out.ok).toBe(true);
  expect(out.parts?.count).toBe(2);
  expect(out.step?.validity.status, JSON.stringify(out.step)).toBe('valid');
  expect(out.step?.validity.volume).toBeCloseTo(1125);
  expect(out.step?.snapshots.error).not.toMatch(/boundingBox is not a function/);
  expect(out.sceneSummary.size).toEqual([35, 10, 10]);
});
it('omits geometry evidence for dry runs', async () => {
  const out = await evaluateScriptTool({ code: 'return box(10, 10, 10);', dryRun: true });
  expect(out.step).toBeUndefined();
});
it('reports failed modeling steps as invalid', async () => {
  const out = await evaluateScriptTool({ code: 'throw new Error("broken step");' });
  expect(out.step?.validity.status).toBe('invalid');
  expect(out.step?.snapshots.status).toBe('unavailable');
});
it('forwards step evidence through modeling edit tools', async () => {
  const out = await addFeatureTool({ code: 'const body = box(10, 10, 10); return body;', feature_code: 'const extra = box(2, 2, 2);' });
  expect(out.step?.validity.status).toBe('valid');
});

it('certifies the whole Scene created from a multi-Shape array return', async () => {
  const out = await evaluateScriptTool({ code: `
    const body = box(10, 10, 10);
    const cover = box(5, 5, 5).translate(30, 0, 0);
    return [body, cover];
  ` });
  expect(out.ok).toBe(true);
  expect(out.parts).toEqual({ count: 2, names: ['body', 'cover'] });
  expect(out.step?.validity.status).toBe('valid');
  expect(out.step?.validity.volume).toBeCloseTo(1125);
  expect(out.step?.snapshots.status).toBeDefined();
  expect(out.sceneSummary.size).toEqual([35, 10, 10]);
});
