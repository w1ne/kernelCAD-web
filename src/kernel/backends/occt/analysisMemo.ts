// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Read-only OCCT analyses (volume, padded bounds, mass properties) memoised
// on the shape object and, when the shape is stamped with one, on that
// feature's input fingerprint. A rigid placement copies the volume and shifts
// the box; it does not integrate the solid again.

import type { ShapeBackend } from '../backend';
import type { MassProperties } from '../../properties/massProperties';
import type { Vec3 } from '../../../shared/intent/types';
import { registerOcctResetHook } from './backendInit';

export interface Motion {
  x: number;
  y: number;
  z: number;
}

type Box = { min: Vec3; max: Vec3 };

interface FingerprintSlot {
  volume?: number;
  box?: Box;
  exact?: Box;
  mass?: Map<number, MassProperties>;
}

const volumes = new WeakMap<ShapeBackend, number>();
const boxes = new WeakMap<ShapeBackend, Box>();
const exactBoxes = new WeakMap<ShapeBackend, Box>();
const masses = new WeakMap<ShapeBackend, Map<number, MassProperties>>();
const fingerprints = new WeakMap<ShapeBackend, string>();
const byFingerprint = new Map<string, FingerprintSlot>();

const FINGERPRINT_CAP = 256;

registerOcctResetHook(() => {
  byFingerprint.clear();
});

function slot(fp: string): FingerprintSlot {
  const existing = byFingerprint.get(fp);
  if (existing) {
    byFingerprint.delete(fp);
    byFingerprint.set(fp, existing);
    return existing;
  }
  const created: FingerprintSlot = {};
  byFingerprint.set(fp, created);
  while (byFingerprint.size > FINGERPRINT_CAP) {
    const oldest = byFingerprint.keys().next().value;
    if (oldest === undefined) break;
    byFingerprint.delete(oldest);
  }
  return created;
}

export function memoVolume(shape: ShapeBackend, compute: () => number): number {
  const hit = volumes.get(shape);
  if (hit !== undefined) return hit;
  const value = compute();
  volumes.set(shape, value);
  const fp = fingerprints.get(shape);
  if (fp) slot(fp).volume = value;
  return value;
}

export function memoBox(shape: ShapeBackend, exact: boolean, compute: () => Box): Box {
  const table = exact ? exactBoxes : boxes;
  const hit = table.get(shape);
  if (hit) return hit;
  const value = compute();
  table.set(shape, value);
  const fp = fingerprints.get(shape);
  if (fp) {
    const saved = slot(fp);
    if (exact) saved.exact = value;
    else saved.box = value;
  }
  return value;
}

export function memoMass(
  shape: ShapeBackend,
  density: number,
  compute: () => MassProperties,
): MassProperties {
  let table = masses.get(shape);
  const hit = table?.get(density);
  if (hit) return hit;
  const value = compute();
  if (!table) {
    table = new Map();
    masses.set(shape, table);
  }
  table.set(density, value);
  const fp = fingerprints.get(shape);
  if (fp) {
    const saved = slot(fp);
    if (!saved.mass) saved.mass = new Map();
    saved.mass.set(density, value);
  }
  return value;
}

/** Remember `fp` on `shape` and copy any analysis already stored for it. */
export function stampFingerprint(shape: ShapeBackend, fp: string): void {
  fingerprints.set(shape, fp);
  const known = byFingerprint.get(fp);
  if (!known) return;
  if (known.volume !== undefined) volumes.set(shape, known.volume);
  if (known.box) boxes.set(shape, known.box);
  if (known.exact) exactBoxes.set(shape, known.exact);
  if (known.mass) masses.set(shape, new Map(known.mass));
}

function shiftBox(box: Box, motion: Motion): Box {
  return {
    min: [box.min[0] + motion.x, box.min[1] + motion.y, box.min[2] + motion.z],
    max: [box.max[0] + motion.x, box.max[1] + motion.y, box.max[2] + motion.z],
  };
}

/** Drop memoised volume, box, and mass for a disposed wrapper. */
export function forgetAnalysis(shape: ShapeBackend): void {
  volumes.delete(shape);
  boxes.delete(shape);
  exactBoxes.delete(shape);
  masses.delete(shape);
  fingerprints.delete(shape);
}

/** Volume is placement-invariant. A box moves with `motion`. */
export function copyRigidAnalysis(from: ShapeBackend, to: ShapeBackend, motion: Motion): void {
  const volume = volumes.get(from);
  if (volume !== undefined) volumes.set(to, volume);
  const box = boxes.get(from);
  if (box) boxes.set(to, shiftBox(box, motion));
  const exact = exactBoxes.get(from);
  if (exact) exactBoxes.set(to, shiftBox(exact, motion));
}
