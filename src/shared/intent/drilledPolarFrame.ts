// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Cut-frame axis of the cylinder a polar `at` hole drilled. `placePolar`
// writes it onto the hole feature while lowering. Replay reads that same
// record. A process-global map keyed by `hole_N` is shared by every capture
// session, so a later model overwrites the radius the first model replays.

import type { FeatureRecord } from './featureRecord';
import type { Vec3 } from './types';

export const DRILLED_POLAR_FRAME_KEY = 'drilledPolarFrame';

export interface DrilledPolarFrame {
  origin: Vec3;
  dir: Vec3;
  radius: number;
}

export function readDrilledPolarFrame(feature: FeatureRecord): DrilledPolarFrame | undefined {
  const raw = feature.metadata?.[DRILLED_POLAR_FRAME_KEY];
  return isDrilledPolarFrame(raw) ? raw : undefined;
}

export function writeDrilledPolarFrame(feature: FeatureRecord, frame: DrilledPolarFrame): void {
  if (feature.metadata === undefined) feature.metadata = {};
  feature.metadata[DRILLED_POLAR_FRAME_KEY] = {
    origin: [frame.origin[0], frame.origin[1], frame.origin[2]],
    dir: [frame.dir[0], frame.dir[1], frame.dir[2]],
    radius: frame.radius,
  };
}

export function clearDrilledPolarFrame(feature: FeatureRecord): void {
  if (feature.metadata === undefined) return;
  delete feature.metadata[DRILLED_POLAR_FRAME_KEY];
}

/** Prefix reuse lowers only the appended tail. Copy the frame onto the new
 *  capture's records so a seeded hole still replays the cylinder it drilled. */
export function copyDrilledPolarFrames(
  prev: readonly FeatureRecord[],
  next: readonly FeatureRecord[],
  ids: readonly string[],
): void {
  const keep = new Set(ids);
  for (const record of prev) {
    if (!keep.has(record.id)) continue;
    const frame = readDrilledPolarFrame(record);
    if (!frame) continue;
    const target = next.find((candidate) => candidate.id === record.id);
    if (target) writeDrilledPolarFrame(target, frame);
  }
}

function isDrilledPolarFrame(value: unknown): value is DrilledPolarFrame {
  if (value === null || typeof value !== 'object') return false;
  const frame = value as DrilledPolarFrame;
  return isVec3(frame.origin) && isVec3(frame.dir) && typeof frame.radius === 'number';
}

function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value)
    && value.length === 3
    && typeof value[0] === 'number'
    && typeof value[1] === 'number'
    && typeof value[2] === 'number';
}
