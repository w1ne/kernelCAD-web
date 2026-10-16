// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Kernel selection end to end: the default path is byte-identical to an
// explicit kernel:'occt' build; the registered guarded backend also works
// through the MCP entry points.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { buildModelFromFile } from '../../../src/modeling/buildModel';
import { __setKernelFactoryForTest } from '../../../src/modeling/backends/kernelRegistry';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { executeCookbookTool } from '../../../src/agent/mcp/tools/executeCookbook';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import type { BuiltModel } from '../../../src/modeling/buildModel';

const ROOT = resolve(__dirname, '../../..');
const EXAMPLES = ['examples/bracket-with-hole.kcad.ts', 'examples/section-gasket.kcad.ts'];

function withoutSnapshotTempDir<T extends { step?: { snapshots?: { out_dir?: string } } }>(result: T): T {
  if (!result.step?.snapshots) return result;
  const { out_dir: _outDir, ...snapshots } = result.step.snapshots;
  return { ...result, step: { ...result.step, snapshots } };
}

function fingerprint(model: BuiltModel) {
  const shapes = [...model.shapes.entries()].map(([id, s]) => {
    if (isSceneBackend(s)) return [id, 'scene'];
    // Non-solid records (sketches, references) carry no measurable shape.
    try {
      return [id, Number(s.volume().toFixed(6)), Number(s.surfaceArea().toFixed(6)), s.boundingBox()];
    } catch {
      return [id, 'unmeasurable'];
    }
  });
  return {
    records: JSON.stringify(model.records),
    diagnostics: JSON.stringify(model.diagnostics),
    shapes,
  };
}

describe('kernel selection defaults to OCCT', () => {
  let restore: () => void;
  beforeEach(() => { restore = __setKernelFactoryForTest('smlib', undefined); });
  afterEach(() => restore());
  for (const rel of EXAMPLES) {
    it(`default build equals explicit kernel:'occt' (${rel})`, async () => {
      const file = resolve(ROOT, rel);
      const a = await buildModelFromFile({ file });
      const b = await buildModelFromFile({ file, kernel: 'occt' });
      expect(fingerprint(b)).toEqual(fingerprint(a));
      expect(fingerprint(a).shapes.some(e => typeof e[1] === 'number' && e[1] > 0)).toBe(true);
    }, 120_000);
  }

  it('evaluate_script: default and explicit occt agree', async () => {
    const file = resolve(ROOT, EXAMPLES[0]);
    const dflt = await evaluateScriptTool({ file });
    const occt = await evaluateScriptTool({ file, kernel: 'occt' });
    expect(withoutSnapshotTempDir(occt)).toEqual(withoutSnapshotTempDir(dflt));
    expect(dflt.ok).toBe(true);

  }, 120_000);

  it('execute_cookbook forwards kernel', async () => {
    const res = await executeCookbookTool({ id: 'blind-pocket-from-top', kernel: 'smlib', dryRun: true });
    expect(res.ok).toBe(false);
    expect(JSON.stringify(res)).toContain('recompute.kernel.unavailable');
  }, 120_000);
});

describe('registered guarded SMLib entry points', () => {
  it('evaluate_script accepts an eligible native fillet workflow', async () => {
    const result=await evaluateScriptTool({file:resolve(ROOT,'docs/demos/smlib-guarded/fillet.kcad.ts'),kernel:'smlib'});
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
  it('execute_cookbook accepts the registered optional kernel', async () => {
    const result=await executeCookbookTool({id:'blind-pocket-from-top',kernel:'smlib',dryRun:true});
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain('recompute.kernel.unavailable');
  });
});
