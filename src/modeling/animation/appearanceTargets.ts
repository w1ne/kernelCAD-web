// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/animation/appearanceTargets.ts
//
// Resolves animationView appearance-track targets against the meshed scene
// and turns one sampled frame into per-feature material overrides for the
// renderer. Target names follow the render `--focus/--hide` rules (see
// objectNameMatch.ts), checked against the same names the render player
// collects for a feature group. Pure: no I/O, no three.js.

import { objectMatches } from '../../shared/render/objectNameMatch';
import type {
  AnimationAppearanceChannel,
  NormalizedAnimationAppearanceTrack,
} from '../../shared/intent/animationViewRecord';
import type { AppearanceSample } from './animationSampler';

/** The serialized-mesh fields that name a feature. */
export interface NamedFeature {
  featureId: string;
  featureKind: string;
  displayName?: string;
  filterNames?: readonly string[];
  sourceMetadataName?: string;
  assemblyFeatureId?: string;
  assemblyPartName?: string;
  virtual?: boolean;
}

/** Per-feature material override for one frame. */
export interface FeatureAppearanceEntry {
  featureId: string;
  color?: string;
  emissive?: string;
}

export interface AppearanceTargetResolution {
  /** Target string → matched feature ids, in scene order. */
  featureIdsByTarget: Map<string, string[]>;
  /** Targets that matched no rendered feature, in track order. */
  unknown: string[];
  /** Every name a target could have used (for the refusal message). */
  available: string[];
}

/** Same name set the render player's `collectFilterNames` builds for a group. */
export function featureNames(f: NamedFeature): string[] {
  const names = [
    f.featureId,
    f.displayName,
    f.assemblyFeatureId,
    f.assemblyPartName,
    f.featureKind,
    f.sourceMetadataName,
    ...(f.filterNames ?? []),
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  return [...new Set(names)];
}

export function resolveAppearanceTargets(
  tracks: readonly NormalizedAnimationAppearanceTrack[],
  features: readonly NamedFeature[],
): AppearanceTargetResolution {
  const rendered = features.filter((f) => f.virtual !== true);
  const namesById = rendered.map((f) => ({ id: f.featureId, names: featureNames(f) }));
  const featureIdsByTarget = new Map<string, string[]>();
  const unknown: string[] = [];
  for (const track of tracks) {
    if (featureIdsByTarget.has(track.target)) continue;
    const ids = namesById.filter((f) => objectMatches(f.names, [track.target])).map((f) => f.id);
    if (ids.length === 0) {
      if (!unknown.includes(track.target)) unknown.push(track.target);
      continue;
    }
    featureIdsByTarget.set(track.target, ids);
  }
  const available = [...new Set(namesById.flatMap((f) => f.names))];
  return { featureIdsByTarget, unknown, available };
}

/** One frame's sampled colours → per-feature overrides. Samples apply in track
 *  order, so a later track wins where two targets cover the same feature. */
export function appearanceEntriesForFrame(
  samples: readonly AppearanceSample[],
  featureIdsByTarget: ReadonlyMap<string, readonly string[]>,
): FeatureAppearanceEntry[] {
  const byFeature = new Map<string, FeatureAppearanceEntry>();
  for (const sample of samples) {
    for (const featureId of featureIdsByTarget.get(sample.target) ?? []) {
      let entry = byFeature.get(featureId);
      if (!entry) {
        entry = { featureId };
        byFeature.set(featureId, entry);
      }
      setChannel(entry, sample.channel, sample.value);
    }
  }
  return [...byFeature.values()];
}

function setChannel(entry: FeatureAppearanceEntry, channel: AnimationAppearanceChannel, value: string): void {
  if (channel === 'color') entry.color = value;
  else entry.emissive = value;
}
