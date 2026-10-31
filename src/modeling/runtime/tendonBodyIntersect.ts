// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/tendonBodyIntersect.ts
//
// P11 Slice 2 — criterion 8 helper (`mechanism.tendon-body-intersect`).
// A balance tendon's routed path must stay clear of every part except near
// its two endpoint attachments. This is the static authoring
// backstop that runs in `kernelcad validate` BEFORE MuJoCo spins up — it
// red-flags "the spring cuts through the arm" at author time.
//
// Straight route entries are connected by line segments. Wrap geoms expand
// into tangent points and a sampled cylinder arc, matching the routed cable
// mesh and avoiding false intersections through the pulley center.
//
// Exclude parts that own explicit via points or wrap geom guides: a cable is
// expected to meet those components along its route. Other bodies, including
// endpoints away from the attachment margin, stay in the clearance check.
//
// Spec:  docs/specs/2026-06-03-physics-loop-P11-collision-aware-mujoco.md
// Plan:  docs/plans/2026-06-03-physics-loop-P11-slice-2-wrap-geom-routing.md

import type { Assembly } from '../capture/assembly';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from '../mates/mate';
import { wrapArcPoints, type WrapCylinderWorld } from '../capture/tendonSweepMesh';
import { measureGapToBody } from './jointMeshContinuity';
import { anyTriangleWithin, buildMeshPointIndex, pointInsideMesh, type MeshPointIndex } from './meshPointQuery';

/** Polyline sampling pitch (mm) along each tendon segment. */
export const TENDON_SAMPLE_MM = 5;
/**
 * Clearance floor (mm). A sample point whose surface gap to a body
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

type V3 = [number, number, number];
interface Aabb {
  readonly min: V3;
  readonly max: V3;
}

function dist(a: V3, b: V3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
function lerp(a: V3, b: V3, u: number): V3 {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/** Conservative world-space bounds; failures deliberately fall back to exact probing. */
function worldBounds(shape: OcctBackend, transform: Transform): Aabb | undefined {
  try {
    const local = shape.boundingBox();
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const x of [local.min[0], local.max[0]]) {
      for (const y of [local.min[1], local.max[1]]) {
        for (const z of [local.min[2], local.max[2]]) {
          const point = transform.point([x, y, z]) as V3;
          for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], point[axis]);
            max[axis] = Math.max(max[axis], point[axis]);
          }
        }
      }
    }
    if (![...min, ...max].every(Number.isFinite)) return undefined;
    return { min, max };
  } catch {
    return undefined;
  }
}

/** A point outside this expanded AABB is provably farther than `marginMm`. */
function withinExpandedBounds(point: V3, bounds: Aabb, marginMm: number): boolean {
  return point.every((value, axis) =>
    value >= bounds.min[axis] - marginMm && value <= bounds.max[axis] + marginMm,
  );
}

function indexPartsByName(arm: Assembly): Map<string, ReturnType<Assembly['__parts']>[number]> {
  const partByName = new Map<string, ReturnType<Assembly['__parts']>[number]>();
  for (const p of arm.__parts()) partByName.set(p.name, p);
  return partByName;
}

// Resolve a tendon endpoint ("part.connector") to a world point at this
// pose. Returns undefined for topology-query origins (not resolved here,
// same as criterion 7) or a missing transform.
function endpointWorld(
  ref: string,
  partByName: ReadonlyMap<string, ReturnType<Assembly['__parts']>[number]>,
  sample: TendonBodyIntersectSample,
): { partName: string; world: V3 } | undefined {
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
}

function collectTendonPath(
  t: ReturnType<Assembly['__tendons']>[number],
  partByName: ReadonlyMap<string, ReturnType<Assembly['__parts']>[number]>,
  sample: TendonBodyIntersectSample,
  aWorld: V3,
  bWorld: V3,
): { excluded: Set<string>; waypoints: V3[] } {
  const excluded = new Set<string>();
  const routeSteps: ({ kind: 'point'; world: V3 } | { kind: 'wrap'; cylinder: WrapCylinderWorld })[] = [];
  // `via` replaces the legacy `wrapGeoms` (mutually exclusive): connector
  // entries are waypoints on their owner part, wrap entries are tangent arcs.
  const route = t.via.length > 0 ? t.via : t.wrapGeoms.map((w) => ({ wrap: w }));
  for (const entry of route) {
    if (typeof entry === 'string') {
      const via = endpointWorld(entry, partByName, sample);
      if (via !== undefined) {
        excluded.add(via.partName);
        routeSteps.push({ kind: 'point', world: via.world });
      }
      continue;
    }
    const w = entry.wrap;
    excluded.add(w.partName);
    const owner = partByName.get(w.partName);
    const wg = owner?.wrapGeoms.find((g) => g.name === w.wrapName);
    const T = sample.transforms.get(w.partName);
    if (wg !== undefined && T !== undefined) {
      const side = w.sidesite === undefined ? undefined : T.point(w.sidesite) as V3;
      routeSteps.push({
        kind: 'wrap',
        cylinder: {
          center: T.point(wg.origin) as V3,
          axis: T.axisDir(wg.axis) as V3,
          radiusMm: wg.radiusMm,
          ...(side === undefined ? {} : { side }),
        },
      });
    }
  }

  const waypoints: V3[] = [aWorld];
  routeSteps.forEach((step, i) => {
    if (step.kind === 'point') {
      waypoints.push(step.world);
      return;
    }
    const after = routeSteps[i + 1];
    const next = after === undefined
      ? bWorld
      : after.kind === 'point' ? after.world : after.cylinder.center;
    waypoints.push(...wrapArcPoints(waypoints[waypoints.length - 1], next, step.cylinder));
  });
  waypoints.push(bWorld);
  return { excluded, waypoints };
}

// Scan every straight segment of one tendon's polyline; report the first
// offending sample per (tendon, pierced-part) pair.
/**
 * Distance (mm) from the clearance threshold within which a sample is decided
 * by the exact OCCT probe. Covers the analysis mesh's 0.05 mm chord
 * deflection with a wide margin: farther than this from every triangle, the
 * mesh's inside/outside answer cannot disagree with the exact solid.
 */
export const MESH_DECISION_MARGIN_MM = 0.25;

/** Part-local analysis-mesh index, built once per lowered shape. */
const meshIndexByShape = new WeakMap<OcctBackend, MeshPointIndex | null>();

function meshIndexFor(shape: OcctBackend): MeshPointIndex | null {
  let index = meshIndexByShape.get(shape);
  if (index === undefined) {
    try {
      const mesh = shape.getMesh();
      index = mesh.indices.length === 0
        ? null
        : buildMeshPointIndex(mesh.positions, mesh.indices, TENDON_BODY_CLEARANCE_MM + MESH_DECISION_MARGIN_MM);
      if (index !== null && !index.closed) index = null;
    } catch {
      index = null;
    }
    meshIndexByShape.set(shape, index);
  }
  return index;
}

/** True when `t` has no scale or shear, so it preserves distances. */
function isRigid(t: Transform): boolean {
  const o = t.point([0, 0, 0]);
  const axes = [t.point([1, 0, 0]), t.point([0, 1, 0]), t.point([0, 0, 1])]
    .map((p) => [p[0] - o[0], p[1] - o[1], p[2] - o[2]] as const);
  const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return axes.every((a) => Math.abs(dot(a, a) - 1) < 1e-9) &&
    Math.abs(dot(axes[0], axes[1])) < 1e-9 && Math.abs(dot(axes[1], axes[2])) < 1e-9 && Math.abs(dot(axes[0], axes[2])) < 1e-9;
}

/**
 * Surface gap at `pointWorld`, as `measureGapToBody` defines it (0 inside the
 * solid), or `undefined` when the point is provably clear of the threshold.
 * Away from the surface the part's cached mesh answers in microseconds; near
 * it, or for an open mesh or a non-rigid placement, the exact probe decides.
 */
function gapIfNearOrInside(
  shape: OcctBackend,
  worldTransform: Transform,
  inverse: Transform | undefined,
  pointWorld: V3,
): number | undefined {
  const index = inverse === undefined ? null : meshIndexFor(shape);
  if (index === null || inverse === undefined) return measureGapToBody(shape, worldTransform, pointWorld);
  const local = inverse.point(pointWorld) as V3;
  if (anyTriangleWithin(index, local, TENDON_BODY_CLEARANCE_MM + MESH_DECISION_MARGIN_MM)) {
    return measureGapToBody(shape, worldTransform, pointWorld);
  }
  return pointInsideMesh(index, local) ? 0 : undefined;
}

function piercesForTendon(
  t: ReturnType<Assembly['__tendons']>[number],
  partByName: ReadonlyMap<string, ReturnType<Assembly['__parts']>[number]>,
  sample: TendonBodyIntersectSample,
  a: { partName: string; world: V3 },
  b: { partName: string; world: V3 },
  boundsByPart: ReadonlyMap<string, Aabb | undefined>,
  inverseByPart: ReadonlyMap<string, Transform | undefined>,
): TendonBodyIntersectResult[] {
  const { excluded, waypoints } = collectTendonPath(t, partByName, sample, a.world, b.world);
  const fired = new Set<string>(); // one diagnostic per (tendon, part)
  const out: TendonBodyIntersectResult[] = [];
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
        if (!(sp.shape instanceof OcctBackend)) continue;
        const bounds = boundsByPart.get(sp.name);
        if (bounds !== undefined && !withinExpandedBounds(pt, bounds, TENDON_BODY_CLEARANCE_MM)) continue;
        const gap = gapIfNearOrInside(sp.shape, sp.worldTransform, inverseByPart.get(sp.name), pt);
        if (gap !== undefined && gap < TENDON_BODY_CLEARANCE_MM) {
          out.push({ tendonName: t.name, partName: sp.name, pointWorld: pt, gapMm: gap });
          fired.add(sp.name);
        }
      }
    }
  }
  return out;
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
  const partByName = indexPartsByName(arm);
  const boundsByPart = new Map<string, Aabb | undefined>();
  const inverseByPart = new Map<string, Transform | undefined>();
  for (const part of sample.scene.parts) {
    if (part.shape instanceof OcctBackend) {
      boundsByPart.set(part.name, worldBounds(part.shape, part.worldTransform));
      inverseByPart.set(part.name, isRigid(part.worldTransform) ? part.worldTransform.inverse() : undefined);
    }
  }

  for (const t of arm.__tendons()) {
    const a = endpointWorld(t.from, partByName, sample);
    const b = endpointWorld(t.to, partByName, sample);
    if (a === undefined || b === undefined) continue;

    out.push(...piercesForTendon(t, partByName, sample, a, b, boundsByPart, inverseByPart));
  }
  return out;
}
