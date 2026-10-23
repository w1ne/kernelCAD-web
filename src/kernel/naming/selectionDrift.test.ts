// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { BindingFingerprint, SelectionRecord } from '../../shared/intent/selectionRecord';
import { selectionDriftDiagnostics } from './selectionDrift';

const face = (over: Partial<BindingFingerprint> = {}): BindingFingerprint => ({
  entityKind: 'face', geomType: 'PLANE', producer: 'box_1', role: 'top',
  direction: [0, 0, 1], size: 800, centroid: [15, 20, 6], ...over,
});
const sel = (fp: BindingFingerprint, over: Partial<SelectionRecord> = {}): SelectionRecord => ({
  consumerFeatureId: 'fillet_1', selectorText: '{"byNormal":"Z"}', syntax: 'query',
  fingerprints: [fp], partDiagonal: 60, ...over,
});

describe('selectionDriftDiagnostics', () => {
  it('names old entity, new entity, consumer and selector for a re-bound selector', () => {
    const [d] = selectionDriftDiagnostics([sel(face())], [sel(face({ producer: 'box_2', centroid: [25, 20, 16] }))]);
    expect(d).toMatchObject({ code: 'selector.binding-changed', severity: 'warn', featureId: 'fillet_1' });
    expect(d!.message).toContain("'{\"byNormal\":\"Z\"}'");
    expect(d!.message).toContain('of box_1');
    expect(d!.message).toContain('of box_2');
    expect(d!.details).toMatchObject({ consumerFeature: 'fillet_1', syntax: 'query' });
  });

  it('reports a resized face as moved, with the delta', () => {
    const [d] = selectionDriftDiagnostics([sel(face())], [sel(face({ size: 880 }))]);
    expect(d).toMatchObject({ code: 'selector.binding-moved', severity: 'info' });
    expect(d!.message).toContain('area 800 -> 880');
  });

  it('is silent within tolerance and for selections without a counterpart', () => {
    expect(selectionDriftDiagnostics([sel(face())], [sel(face({ size: 801 }))])).toEqual([]);
    expect(selectionDriftDiagnostics([sel(face())], [sel(face(), { selectorText: 'other' })])).toEqual([]);
    expect(selectionDriftDiagnostics([], [sel(face())])).toEqual([]);
  });

  it('matches repeated selections of one selector by occurrence', () => {
    const a = sel(face());
    const b = sel(face({ centroid: [0, 0, 30], producer: 'box_3' }));
    const out = selectionDriftDiagnostics([a, b], [a, sel(face({ centroid: [0, 0, 30], producer: 'box_4' }))]);
    expect(out.map((d) => d.code)).toEqual(['selector.binding-changed']);
  });
});
