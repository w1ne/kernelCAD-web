// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/ledger.test.ts

import { describe, expect, it } from 'vitest';
import {
  buildLedger,
  hasOpenMissingFact,
  resolveAssumptions,
  type PriorInput,
  type ScaleAnchor,
} from './ledger';
import type { TraceFeatureResult } from './types';

const opencvSilhouette: TraceFeatureResult = {
  label: 'silhouette',
  kind: 'silhouette',
  waypoints: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
  confidence: 1,
  backend: 'opencv',
};

const llmPoint: TraceFeatureResult = {
  label: 'brow_top',
  kind: 'point',
  waypoints: [[0.5, 0.2]],
  confidence: 0.72,
  backend: 'vision-llm',
};

describe('buildLedger', () => {
  it('classifies an opencv feature as visible+confirmed (deterministic, confidence 1)', () => {
    const ledger = buildLedger({ features: [opencvSilhouette] });
    const fact = ledger.facts.find((f) => f.id === 'silhouette')!;
    expect(fact.kind).toBe('visible');
    expect(fact.confidence).toBe(1);
    expect(fact.resolution).toBe('confirmed');
    expect(fact.evidence?.source).toBe('image');
  });

  it('classifies a vision-llm feature as inferred+open, echoing self-reported confidence', () => {
    const ledger = buildLedger({ features: [llmPoint] });
    const fact = ledger.facts.find((f) => f.id === 'brow_top')!;
    expect(fact.kind).toBe('inferred');
    expect(fact.confidence).toBe(0.72);
    expect(fact.resolution).toBe('open');
  });

  it('records scale as missing+open when no scale anchor is supplied', () => {
    const ledger = buildLedger({ features: [opencvSilhouette] });
    const scaleFact = ledger.facts.find((f) => f.id === 'scale')!;
    expect(scaleFact.kind).toBe('missing');
    expect(scaleFact.confidence).toBe(0);
    expect(scaleFact.resolution).toBe('open');
    expect(ledger.scale).toBeUndefined();
    expect(hasOpenMissingFact(ledger)).toBe(true);
  });

  it('records scale as visible+confirmed when a scale anchor is supplied, computing mmPerPixel', () => {
    const scaleAnchor: ScaleAnchor = { pixelDistance: 100, realDistance: 20, unit: 'mm' };
    const ledger = buildLedger({ features: [opencvSilhouette], scaleAnchor });
    const scaleFact = ledger.facts.find((f) => f.id === 'scale')!;
    expect(scaleFact.kind).toBe('visible');
    expect(scaleFact.resolution).toBe('confirmed');
    expect(ledger.scale).toEqual({ mmPerPixel: 0.2, source: 'scale-anchor' });
    expect(hasOpenMissingFact(ledger)).toBe(false);
  });

  it('converts non-mm units to mmPerPixel', () => {
    const scaleAnchor: ScaleAnchor = { pixelDistance: 50, realDistance: 1, unit: 'in' };
    const ledger = buildLedger({ features: [opencvSilhouette], scaleAnchor });
    expect(ledger.scale?.mmPerPixel).toBeCloseTo(0.508, 3);
  });

  it('records priors as assumed+open, verbatim confidence, never adjusted', () => {
    const priors: PriorInput[] = [
      { id: 'wall-thickness', statement: 'Acetate wall assumed 2mm from category norm.', value: 2, confidence: 0.4 },
    ];
    const ledger = buildLedger({ features: [opencvSilhouette], priors });
    const fact = ledger.facts.find((f) => f.id === 'wall-thickness')!;
    expect(fact.kind).toBe('assumed');
    expect(fact.confidence).toBe(0.4);
    expect(fact.resolution).toBe('open');
    expect(fact.evidence?.source).toBe('prior');
  });

  it('computes unresolvedCount across visible/inferred/assumed/missing facts', () => {
    const priors: PriorInput[] = [
      { id: 'wall-thickness', statement: 'assumed 2mm', value: 2, confidence: 0.4 },
    ];
    const ledger = buildLedger({ features: [opencvSilhouette, llmPoint], priors });
    // opencv silhouette (confirmed) + llm point (open) + scale (missing, open) + prior (open) = 3 open
    expect(ledger.unresolvedCount).toBe(3);
  });
});

describe('resolveAssumptions', () => {
  it('confirms an open fact without changing its value', () => {
    const ledger = buildLedger({ features: [llmPoint] });
    const { ledger: updated, paramOverrides } = resolveAssumptions(ledger, [
      { id: 'brow_top', confirm: true },
    ]);
    const fact = updated.facts.find((f) => f.id === 'brow_top')!;
    expect(fact.resolution).toBe('confirmed');
    expect(paramOverrides.brow_top).toEqual(llmPoint.waypoints);
  });

  it('overrides a fact with a caller-supplied value and reduces unresolvedCount', () => {
    const ledger = buildLedger({ features: [opencvSilhouette] }); // scale is missing+open
    expect(ledger.unresolvedCount).toBe(1);
    const { ledger: updated, paramOverrides } = resolveAssumptions(ledger, [
      { id: 'scale', value: 0.25 },
    ]);
    const fact = updated.facts.find((f) => f.id === 'scale')!;
    expect(fact.resolution).toBe('overridden');
    expect(fact.value).toBe(0.25);
    expect(paramOverrides.scale).toBe(0.25);
    expect(updated.unresolvedCount).toBe(0);
  });

  it('reports unknown ids without touching the ledger', () => {
    const ledger = buildLedger({ features: [opencvSilhouette] });
    const { unknownIds, ledger: updated } = resolveAssumptions(ledger, [
      { id: 'does-not-exist', confirm: true },
    ]);
    expect(unknownIds).toEqual(['does-not-exist']);
    expect(updated.unresolvedCount).toBe(ledger.unresolvedCount);
  });
});
