// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRef } from './types';

/**
 * Capture-time metadata for a `surfaceFromBoundary` feature (a Coons patch).
 * A Coons patch fills the interior of 4 boundary curves to produce a NURBS
 * surface, lowered via OCCT's `BRepOffsetAPI_MakeFilling` (audited 2026-05-18
 * — see `docs/audit/2026-05-18-slice-c-occt-symbols.md`; the plan's
 * `BRepFill_Filling` is not exposed by the current bundle but
 * `BRepOffsetAPI_MakeFilling` is identical in behaviour).
 *
 * The 4 boundary curves must form a closed loop with endpoints coincident
 * within `1e-6` mm: `curveRefs[0].end === curveRefs[1].start`,
 * `curveRefs[1].end === curveRefs[2].start`, and so on round to
 * `curveRefs[3].end === curveRefs[0].start`. Corner-coincidence is checked
 * lazily during the corresponding Task 3 capture step; this record only
 * enforces that the array has exactly 4 entries, every entry is a
 * structurally valid `FeatureRef`, and the optional continuity / degree /
 * neighbour fields are well-typed.
 *
 * Continuity flag is `'C0' | 'C1' | 'C2'` and maps to
 * `GeomAbs_C0 | GeomAbs_C1 | GeomAbs_C2` at lower time. `'G1'` and `'G2'`
 * are intentionally NOT accepted here — the OCCT `GeomAbs_Shape` enum
 * exposes them, but for a Coons patch on free-floating boundary curves
 * G-continuity is geometrically indistinguishable from C-continuity
 * (there is no neighbour surface to be tangent to). Future iterations
 * may surface a `'G1' | 'G2'` flag when `neighbors` is populated — the
 * `neighbors` field is reserved here so the record shape does not need
 * to break later.
 *
 * `uvDegree` defaults to `{ u: 3, v: 3 }` (bi-cubic) at lower time when
 * absent. Valid degrees are `1..8` per OCCT's `MaxDeg` ceiling.
 */
export interface CoonsPatchMetadata {
  /** 4 boundary curves in walk order (bottom, right, top, left). */
  curveRefs: [FeatureRef, FeatureRef, FeatureRef, FeatureRef];
  /** Continuity grade at the boundary curves. Default C0. */
  continuity: 'C0' | 'C1' | 'C2';
  /** Optional u/v polynomial degree for the fitted NURBS surface. */
  uvDegree?: { u: number; v: number };
  /** Optional per-side neighbour surface refs for future tangency
   *  constraints (Task 3 does not consume them; reserved for a follow-up
   *  iteration when surfaceFromBoundary stitches into an existing patch). */
  neighbors?: {
    bottom?: FeatureRef;
    right?: FeatureRef;
    top?: FeatureRef;
    left?: FeatureRef;
  };
}

function isFeatureRef(v: unknown): v is FeatureRef {
  if (typeof v !== 'object' || v === null) return false;
  const k = (v as { kind?: unknown }).kind;
  return typeof k === 'string';
}

function isDegreePair(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { u?: unknown; v?: unknown };
  if (typeof o.u !== 'number' || !Number.isInteger(o.u) || o.u < 1 || o.u > 8) return false;
  if (typeof o.v !== 'number' || !Number.isInteger(o.v) || o.v < 1 || o.v > 8) return false;
  return true;
}

function isNeighbourMap(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  const allowed = ['bottom', 'right', 'top', 'left'];
  for (const key of Object.keys(o)) {
    if (!allowed.includes(key)) return false;
    const val = o[key];
    if (val !== undefined && !isFeatureRef(val)) return false;
  }
  return true;
}

export function isCoonsPatchMetadata(value: unknown): value is CoonsPatchMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as CoonsPatchMetadata;

  if (!Array.isArray(m.curveRefs) || m.curveRefs.length !== 4) return false;
  for (const ref of m.curveRefs) {
    if (!isFeatureRef(ref)) return false;
  }

  if (m.continuity !== 'C0' && m.continuity !== 'C1' && m.continuity !== 'C2') return false;

  if (m.uvDegree !== undefined && !isDegreePair(m.uvDegree)) return false;
  if (m.neighbors !== undefined && !isNeighbourMap(m.neighbors)) return false;

  return true;
}
