// tests/unit/animation/appearanceTargets.test.ts
//
// Appearance-track targets resolve against the meshed scene with the same
// name rules as --focus/--hide, then each frame becomes per-feature material
// overrides.

import { describe, it, expect } from 'vitest';
import {
  resolveAppearanceTargets,
  appearanceEntriesForFrame,
} from '../../../src/modeling/animation/appearanceTargets';
import type { NormalizedAnimationAppearanceTrack } from '../../../src/shared/intent/animationViewRecord';

const features = [
  { featureId: 'box_1', featureKind: 'box', assemblyPartName: 'led-1' },
  { featureId: 'box_2', featureKind: 'box', assemblyPartName: 'led-2' },
  { featureId: 'cyl_1', featureKind: 'cylinder', displayName: 'Pylon' },
  { featureId: 'anim_1', featureKind: 'animationView', virtual: true },
];

function track(target: string, channel: 'color' | 'emissive' = 'emissive'): NormalizedAnimationAppearanceTrack {
  return { target, channel, keys: [{ atMs: 0, value: '#000000', ease: 'linear' }] };
}

describe('resolveAppearanceTargets', () => {
  it('matches part names, display names (case-insensitive) and wildcards', () => {
    const r = resolveAppearanceTargets([track('led-1'), track('pylon', 'color'), track('led-*', 'color')], features);
    expect(r.unknown).toEqual([]);
    expect(r.featureIdsByTarget.get('led-1')).toEqual(['box_1']);
    expect(r.featureIdsByTarget.get('pylon')).toEqual(['cyl_1']);
    expect(r.featureIdsByTarget.get('led-*')).toEqual(['box_1', 'box_2']);
  });

  it('reports unmatched targets and the available names, ignoring virtual records', () => {
    const r = resolveAppearanceTargets([track('led-9'), track('animationView')], features);
    expect(r.unknown).toEqual(['led-9', 'animationView']);
    expect(r.available).toContain('led-2');
    expect(r.available).not.toContain('anim_1');
  });
});

describe('appearanceEntriesForFrame', () => {
  it('merges channels per feature; later tracks win on overlap', () => {
    const r = resolveAppearanceTargets([track('led-*', 'color'), track('led-2', 'color'), track('led-2')], features);
    const entries = appearanceEntriesForFrame(
      [
        { target: 'led-*', channel: 'color', value: '#111111' },
        { target: 'led-2', channel: 'color', value: '#222222' },
        { target: 'led-2', channel: 'emissive', value: '#00ff00' },
      ],
      r.featureIdsByTarget,
    );
    expect(entries).toEqual([
      { featureId: 'box_1', color: '#111111' },
      { featureId: 'box_2', color: '#222222', emissive: '#00ff00' },
    ]);
  });
});
