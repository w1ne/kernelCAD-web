// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRef, Vec3 } from './types';

/**
 * Capture-time metadata for a `variableSweep` feature. A variable-section
 * sweep blends N profile sketches along a 3D spine curve, parameterized by
 * `t ∈ [0, 1]` along the spine. Lowering hands the spine + each section to
 * `BRepOffsetAPI_MakePipeShell::Add(profile, location)` and calls
 * `Build()` — direct OCCT, bypassing replicad.
 *
 * Section authoring rules (enforced by `isVariableSweepMetadata`):
 * - At least two sections (a one-section sweep is just a regular sweep).
 * - Sections in strictly increasing `t` order (so the lowerer can walk
 *   them without sorting).
 * - The first section must sit at `t === 0`; the last at `t === 1`.
 *   Intermediate sections may live anywhere in (0, 1). This anchors the
 *   sweep to the full spine extent — partial-coverage sweeps would
 *   require a spine sub-range parameter that we don't model today.
 * - Profile refs must point at a Sketch feature; the lowerer resolves
 *   them through the existing sketch lifter.
 *
 * `closed` / `continuity` / `orientation` are optional knobs the lowerer
 * reads when building the pipe shell. `'frenet'` rotates the profile
 * with the curve's tangent + curvature; `{ up: Vec3 }` keeps a fixed
 * up-vector reference frame; `'discrete'` and `'corrected-frenet'` are
 * OCCT escape hatches for fast-twisting spines.
 */

export interface VariableSweepSection {
  t: number;
  profileRef: FeatureRef;
}

export type SweepOrientation =
  | 'frenet'
  | 'corrected-frenet'
  | 'discrete'
  | { up: Vec3 };

export interface VariableSweepMetadata {
  spineRef: FeatureRef;
  sections: VariableSweepSection[];
  closed?: boolean;
  continuity?: 'C0' | 'C1' | 'C2';
  orientation?: SweepOrientation;
}

function isOrientation(v: unknown): v is SweepOrientation {
  if (v === 'frenet' || v === 'corrected-frenet' || v === 'discrete') return true;
  if (typeof v === 'object' && v !== null) {
    const o = v as { up?: unknown };
    if (!Array.isArray(o.up) || o.up.length !== 3) return false;
    return o.up.every((c) => typeof c === 'number' && Number.isFinite(c));
  }
  return false;
}

function isSection(v: unknown): v is VariableSweepSection {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as VariableSweepSection;
  if (typeof s.t !== 'number' || !Number.isFinite(s.t)) return false;
  if (typeof s.profileRef !== 'object' || s.profileRef === null) return false;
  if (typeof (s.profileRef as { kind?: unknown }).kind !== 'string') return false;
  return true;
}

export function isVariableSweepMetadata(value: unknown): value is VariableSweepMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as VariableSweepMetadata;

  if (typeof m.spineRef !== 'object' || m.spineRef === null) return false;
  if (typeof (m.spineRef as { kind?: unknown }).kind !== 'string') return false;

  if (!Array.isArray(m.sections) || m.sections.length < 2) return false;
  for (const s of m.sections) {
    if (!isSection(s)) return false;
  }
  for (let i = 1; i < m.sections.length; i++) {
    if (m.sections[i].t <= m.sections[i - 1].t) return false;
  }
  if (Math.abs(m.sections[0].t - 0) > 1e-9) return false;
  if (Math.abs(m.sections[m.sections.length - 1].t - 1) > 1e-9) return false;

  if (m.closed !== undefined && typeof m.closed !== 'boolean') return false;
  if (m.continuity !== undefined &&
      m.continuity !== 'C0' && m.continuity !== 'C1' && m.continuity !== 'C2') return false;
  if (m.orientation !== undefined && !isOrientation(m.orientation)) return false;

  return true;
}
