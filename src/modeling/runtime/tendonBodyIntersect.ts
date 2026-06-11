// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/tendonBodyIntersect.ts
//
// P11 Slice 2 — criterion 8 helper (`mechanism.tendon-body-intersect`).
// A balance tendon's routed path must not pass through the solid interior
// of any part that is not one of its two anchor parts (or a part it
// explicitly routes around via a wrap geom). This is the static authoring
// backstop that runs in `kernelcad validate` BEFORE MuJoCo spins up — it
// red-flags "the spring cuts through the arm" at author time.
//
// The cable polyline is approximated as straight segments through the
// endpoint anchors and each wrap-geom origin (a conservative centerline
// proxy; the tangent-accurate wrap path is a follow-up).
//
// Exclusion model (DEVIATES from the spec's "non-anchor parts only", on
// purpose — see plan note): the spec's literal rule would skip the two
// anchor parts entirely, but on the Luxo lamp every balance spring spans
// two ADJACENT arms, so the straight cable cuts through its OWN anchor
// arm — exactly the reported "spring goes through the structure" bug, yet
// invisible to a non-anchor-only check. So we instead exclude only the
// parts the cable physically routes AROUND (the wrap-geom owners; the
// centerline proxy runs through their interior by construction) and skip
// samples within `ANCHOR_MARGIN_MM` of an anchor attachment point (the
// cable legitimately touches the body surface there). Every other body —
// anchor or not — must stay clear.
//
// Spec:  docs/specs/2026-06-03-physics-loop-P11-collision-aware-mujoco.md
// Plan:  docs/plans/2026-06-03-physics-loop-P11-slice-2-wrap-geom-routing.md

import type { Assembly } from '../capture/assembly';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from '../mates/mate';
import { measureGapToBody } from './jointMeshContinuity';

/** Polyline sampling pitch (mm) along each tendon segment. */
export const TENDON_SAMPLE_MM = 5;
/**
 * Clearance floor (mm). A sample point whose surface gap to a non-anchor
 * body is below this — including 0, the "inside the solid" value
 * `measureGapToBody` returns — counts as a pierce. Tighter than criterion
 * 7's 1.0 mm because tendon clearance is a "must not touch" condition;
 * 0.5 mm absorbs OCCT boolean noise without admitting visible piercing.
 */
export const TENDON_BODY_CLEARANCE_MM = 0.5;
/**
 * Radius (mm) around each anchor attachment point within which samples are
 * ignored — the cable legitimately meets the body surface at its anchor,
 * so a small neighbourhood must not count as a pierce.
 */
export const ANCHOR_MARGIN_MM = 5;

export interface TendonBodyIntersectSample {
  readonly transforms: ReadonlyMap<string, Transform>;
  readonly scene: SceneBackend;
}

export interface TendonBodyIntersectResult {
  readonly tendonName: string;
  readonly partName: string;
  readonly pointWorld: readonly [number, number, number];
  /** Surface gap (mm) at the offending sample; 0 means inside the solid. */
  readonly gapMm: number;
}

type V3 = readonly [number, number, number];

function dist(a: V3, b: V3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
function lerp(a: V3, b: V3, u: number): V3 {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/**
 * Evaluate criterion 8 at a single solved pose. Returns one result per
 * (tendon, pierced-part) pair — the first offending sample for that pair.
 * The caller maps each into a `mechanism.tendon-body-intersect` diagnostic.
 */
export function checkTendonBodyIntersectAtPose(
  arm: Assembly,
  sample: TendonBodyIntersectSample,
): TendonBodyIntersectResult[] {
  const out: TendonBodyIntersectResult[] = [];
  const partByName = new Map<string, ReturnType<Assembly['__parts']>[number]>();
  for (const p of arm.__parts()) partByName.set(p.name, p);

  // Resolve a tendon endpoint ("part.connector") to a world point at this
  // pose. Returns undefined for topology-query origins (not resolved here,
  // same as criterion 7) or a missing transform.
  const endpointWorld = (ref: string): { partName: string; world: V3 } | undefined => {
    let parsed: { partName: string; connectorName: string };
    try {
      parsed = parseConnectorRef(ref);
    } catch {
      return undefined;
    }
    const part = partByName.get(parsed.partName);
    const conn = part?.mateConnectors.find((c) => c.name === parsed.connectorName);
    if (conn === undefined || conn.origin.kind !== 'vec3') return undefined;
    const T = sample.transforms.get(parsed.partName);
    if (T === undefined) return undefined;
    return { partName: parsed.partName, world: T.point(conn.origin.value) as V3 };
  };

  for (const t of arm.__tendons()) {
    const a = endpointWorld(t.from);
    const b = endpointWorld(t.to);
    if (a === undefined || b === undefined) continue;

    // Only the parts the cable routes AROUND are excluded (the centerline
    // proxy runs through their interior by construction). Anchor parts are
    // checked — the anchor-point margin below admits the legitimate surface
    // attachment without admitting a cable that dives through the body.
    const excluded = new Set<string>();
    const waypoints: V3[] = [a.world];
    for (const w of t.wrapGeoms) {
      excluded.add(w.partName);
      const owner = partByName.get(w.partName);
      const wg = owner?.wrapGeoms.find((g) => g.name === w.wrapName);
      const T = sample.transforms.get(w.partName);
      if (wg !== undefined && T !== undefined) waypoints.push(T.point(wg.origin) as V3);
    }
    waypoints.push(b.world);

    const fired = new Set<string>(); // one diagnostic per (tendon, part)
    for (let seg = 0; seg < waypoints.length - 1; seg++) {
      const p0 = waypoints[seg];
      const p1 = waypoints[seg + 1];
      const n = Math.max(1, Math.ceil(dist(p0, p1) / TENDON_SAMPLE_MM));
      for (let k = 0; k <= n; k++) {
        const pt = lerp(p0, p1, k / n);
        // Skip the legitimate attachment neighbourhood around each anchor.
        if (dist(pt, a.world) < ANCHOR_MARGIN_MM || dist(pt, b.world) < ANCHOR_MARGIN_MM) continue;
        for (const sp of sample.scene.parts) {
          if (excluded.has(sp.name) || fired.has(sp.name)) continue;
          const gap = measureGapToBody(sp.shape as OcctBackend, sp.worldTransform, pt);
          if (gap !== undefined && gap < TENDON_BODY_CLEARANCE_MM) {
            out.push({ tendonName: t.name, partName: sp.name, pointWorld: pt, gapMm: gap });
            fired.add(sp.name);
          }
        }
      }
    }
  }
  return out;
}
