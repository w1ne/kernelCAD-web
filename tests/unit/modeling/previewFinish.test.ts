// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { previewSkipsFeature } from '../../../src/modeling/previewFinish';
import type { FeatureLowerer, ShapeBackend } from '../../../src/kernel/backends/backend';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

function record(id: string, kind: FeatureRecord['kind'], base?: string, paramRefs?: string[]): FeatureRecord {
  return {
    id,
    kind,
    params: {},
    inputs: base ? { base: { kind: 'feature', id: base } } : {},
    metadata: paramRefs ? { paramRefs } : {},
  } as unknown as FeatureRecord;
}

describe('previewSkipsFeature', () => {
  it('skips a fillet that does not read the edit and keeps one that does', () => {
    const edited = new Set(['radius']);
    expect(previewSkipsFeature(record('f', 'fillet', 'box'), edited)).toBe(true);
    expect(previewSkipsFeature(record('f', 'fillet', 'box', ['radius']), edited)).toBe(false);
    expect(previewSkipsFeature(record('b', 'extrude'), edited)).toBe(false);
  });
});

describe('preview finish passthrough', () => {
  it('does not lower a fillet during a preview, and does lower it when the preview is off', async () => {
    const lowered: string[] = [];
    const lowerer: FeatureLowerer = {
      target: 'export-occt',
      supports: new Set(['box', 'fillet']),
      async lower(rec, inputs) {
        lowered.push(rec.id);
        const shape = (inputs.byKey.base ?? { id: rec.id }) as ShapeBackend;
        return { shape, diagnostics: [] };
      },
    };
    const records = [record('box', 'box'), record('fillet', 'fillet', 'box')];
    const preview = await new RecomputeEngine(lowerer).run(records, {
      previewFinish: true,
      previewEdited: new Set(['length']),
    });
    expect(lowered).toEqual(['box']);
    expect(preview.shapes.get('fillet')).toBe(preview.shapes.get('box'));

    lowered.length = 0;
    const exact = await new RecomputeEngine(lowerer).run(records);
    expect(lowered).toEqual(['box', 'fillet']);
    expect(exact.shapes.has('fillet')).toBe(true);
  });
});
