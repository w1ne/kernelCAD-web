// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { captureFeatureGraph, featureGraphCanonicalJson } from './featureGraph';

const armFile = resolve('examples/assemblies/two-link-connector-arm.kcad.ts');
const armSource = readFileSync(armFile, 'utf8');

describe('captureFeatureGraph', () => {
  it('captures the two-link arm with stable feature ids', async () => {
    const first = await captureFeatureGraph(armSource, { fileName: armFile });
    const second = await captureFeatureGraph(armSource, { fileName: armFile });

    const firstIds = first.order;
    const secondIds = second.order;
    expect(firstIds.length).toBeGreaterThan(0);
    expect(secondIds).toEqual(firstIds);
    expect([...first.features.keys()]).toEqual([...second.features.keys()]);
    expect(first.revisionHash).toBe(second.revisionHash);

    const parts = [...first.features.values()].filter((n) => n.kind === 'assemblyPart');
    expect(parts.map((n) => n.id)).toEqual(['assemblyPart_1', 'assemblyPart_2', 'assemblyPart_3']);
  });

  it('ignores whitespace-only edits except for spans', async () => {
    const base = await captureFeatureGraph(armSource, { fileName: armFile });
    const edited = await captureFeatureGraph(`\n\n   ${armSource.replace(/\nconst tool/, '\n\nconst tool')}`, {
      fileName: armFile,
    });

    expect(edited.revisionHash).toBe(base.revisionHash);
    expect(featureGraphCanonicalJson(edited)).toBe(featureGraphCanonicalJson(base));
    expect(edited.order).toEqual(base.order);
  });

  it('reports project params and symbolic values', async () => {
    const graph = await captureFeatureGraph(`
const wall = param('wall', 2, { min: 1, max: 5 });
return box(wall, 10, 10);
`);
    expect(graph.params.wall).toBe(2);
    expect(graph.paramDeclarations?.wall?.type).toBe('number');
    const box = graph.features.get('box_1');
    expect(box?.params.x).toBe(2);
    expect(box?.paramRefs?.x).toEqual(['wall']);
  });

  it('captures a fillet reference to the box it rounds', async () => {
    const graph = await captureFeatureGraph(`
const base = box(10, 10, 10);
return base.fillet(1, 'top');
`);
    const fillet = [...graph.features.values()].find((n) => n.kind === 'fillet');
    expect(fillet).toBeDefined();
    expect(fillet?.refs.base).toContain('box_1');
    expect(graph.features.get('fillet_1')?.sourceSpan.end).toBeGreaterThan(
      graph.features.get('fillet_1')?.sourceSpan.start ?? 0,
    );
  });

  it('lists helper source that produces no feature as unowned', async () => {
    const graph = await captureFeatureGraph(`
const twice = (n: number) => n * 2;
const w = param('w', 10);
return box(w, 10, 10);
`);
    const helper = graph.unowned.find((span) => span.text?.includes('const twice'));
    expect(helper).toBeDefined();
    expect(graph.unowned.some((span) => span.text?.includes("param('w'"))).toBe(false);
  });

  it('never lowers through the recompute engine', async () => {
    const spy = vi.spyOn(RecomputeEngine.prototype, 'run');
    try {
      await captureFeatureGraph(armSource, { fileName: armFile });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
