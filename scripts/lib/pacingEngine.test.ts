// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { computeTimeline, type FeatureSpec, type PacingOverride } from './pacingEngine';

const f = (id: string, kind: FeatureSpec['kind']): FeatureSpec => ({ id, kind });

describe('computeTimeline', () => {
  it('produces standard timeline for 8 features (default pacing fits 30s)', () => {
    const features = [
      f('box-1', 'box'), f('cyl-1', 'cylinder'),
      f('bool-1', 'boolean'), f('fillet-1', 'fillet'),
      f('cyl-2', 'cylinder'), f('bool-2', 'boolean'),
      f('cyl-3', 'cylinder'), f('bool-3', 'boolean'),
    ];
    const pacing = computeTimeline(features, {});
    expect(pacing.preRollMs).toBe(0);
    expect(pacing.totalDurationMs).toBeLessThanOrEqual(30000);
    expect(pacing.totalDurationMs).toBeGreaterThanOrEqual(12000);
    expect(pacing.features.size).toBe(8);
  });

  it('extends rotate + adds title pre-roll for build < 4s', () => {
    const features = [f('box-1', 'box'), f('cyl-1', 'cylinder')];
    const pacing = computeTimeline(features, {});
    expect(pacing.preRollMs).toBe(2000);
    expect(pacing.rotateDurationMs).toBe(12000);
  });

  it('compresses pause to 200ms when projected total > 30s', () => {
    const features = Array.from({ length: 14 }, (_, i) => f(`box-${i}`, 'box'));
    const pacing = computeTimeline(features, {});
    const sample = pacing.features.get('box-0')!;
    expect(sample.pauseMsAfter).toBe(200);
    expect(pacing.totalDurationMs).toBeLessThanOrEqual(30000);
  });

  it('truncates with warning when 30+ features still overflow after pause + nudge compression', () => {
    const features = Array.from({ length: 30 }, (_, i) => f(`box-${i}`, 'box'));
    const pacing = computeTimeline(features, {});
    expect(pacing.totalDurationMs).toBeLessThanOrEqual(30000);
    expect(pacing.truncated).toBe(true);
    expect(pacing.features.size).toBeLessThan(30);
  });

  it('animation transitionMs never compresses below registry value', () => {
    const features = Array.from({ length: 14 }, (_, i) => f(`box-${i}`, 'box'));
    const pacing = computeTimeline(features, {});
    for (const t of pacing.features.values()) {
      expect(t.durationMs).toBe(500); // box = "add" transition = 500ms
    }
  });

  it('applies per-feature override', () => {
    const features = [f('box-1', 'box'), f('cyl-1', 'cylinder')];
    const override: PacingOverride = {
      features: { 'box-1': { pauseMsAfterOverride: 1500 } },
      rotateMsOverride: 10000,
    };
    const pacing = computeTimeline(features, override);
    expect(pacing.features.get('box-1')!.pauseMsAfter).toBe(1500);
    expect(pacing.rotateDurationMs).toBe(10000);
  });
});
