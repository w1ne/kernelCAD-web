// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepSameDomain.ts
//
// Runtime guard for the optional face-unification pass on large STEP imports:
// measures the largest connected cluster of adjacent same-surface faces so the
// wasm `ShapeUpgrade_UnifySameDomain` is only asked to merge small clusters.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

import type { OcctHealApi } from './healStepOcct';

/**
 * Above this size a face-unification pass is expensive enough that leaving
 * redundant patches in the import has a visible downstream cost.  Very large
 * valid imports get one bounded attempt, but only when the same-surface
 * adjacency graph is small (see `MAX_SAFE_SAME_DOMAIN_CLUSTER`).
 */
export const LARGE_FACE_UNIFY = 1000;
/**
 * The wasm unifier's runtime grows sharply with the size of a connected
 * same-surface cluster.  On the corpus inputs, every shape that stalled had a
 * cluster of 12 or more adjacent faces (206: 12, 238: 33, 243: 15); every
 * shape that completed, including 247, stayed at four or fewer.  A large
 * import is only face-unified when its largest cluster is in the mergeable
 * range and small enough to finish quickly.
 */
const MAX_SAFE_SAME_DOMAIN_CLUSTER = 8;
/** Maximum distance between two samples of the same underlying surface (mm). */
const SURFACE_SAMPLE_TOL = 1e-6;

/** Pure decision rule for the bounded large-import face pass. */
export function largeFaceUnifyDecision(faceCount: number, valid: boolean, cluster: number): boolean {
  return (
    faceCount > LARGE_FACE_UNIFY &&
    valid &&
    cluster > 1 &&
    cluster <= MAX_SAFE_SAME_DOMAIN_CLUSTER
  );
}

/**
 * Size of the largest connected group of adjacent faces that lie on the same
 * surface.  Only exact analytic surfaces and a sampled fallback are needed:
 * the value is a runtime guard, not a geometric repair.
 */
export function maxSameDomainCluster(oc: OcctHealApi, facesOfShape: () => unknown[]): number {
  if (typeof oc.BRepAdaptor_Surface_2 !== 'function') return Number.POSITIVE_INFINITY;
  const faces = facesOfShape();
  const adaptors: any[] = [];
  try {
    const owners = new Map<number, number[]>();
    faces.forEach((face, index) => {
      for (const edge of (face as any).edges as any[]) {
        const hash = edge.hashCode as number;
        const list = owners.get(hash);
        if (list) list.push(index);
        else owners.set(hash, [index]);
      }
    });
    const bounds = faces.map((face) => (face as any).UVBounds);
    for (const face of faces) {
      adaptors.push(new oc.BRepAdaptor_Surface_2((face as any).wrapped, false));
    }
    const parent = faces.map((_, index) => index);
    const find = (value: number): number => {
      let root = value;
      while (parent[root] !== root) root = parent[root];
      while (parent[value] !== value) {
        const next = parent[value];
        parent[value] = root;
        value = next;
      }
      return root;
    };
    const union = (a: number, b: number): void => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootA] = rootB;
    };
    for (const pair of owners.values()) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      if (a !== b && sameDomainSurface(oc, adaptors[a], adaptors[b], bounds[a])) {
        union(a, b);
      }
    }
    const sizes = new Map<number, number>();
    for (let index = 0; index < faces.length; index++) {
      const root = find(index);
      sizes.set(root, (sizes.get(root) ?? 0) + 1);
    }
    let largest = 1;
    for (const size of sizes.values()) if (size > largest) largest = size;
    return largest;
  } finally {
    for (const adaptor of adaptors) adaptor?.delete?.();
  }
}

function sameDomainSurface(
  oc: OcctHealApi,
  a: any,
  b: any,
  bounds: { uMin: number; uMax: number; vMin: number; vMax: number },
): boolean {
  if (a.GetType() !== b.GetType()) return false;
  const types = oc.GeomAbs_SurfaceType as Record<string, number> | undefined;
  const type = a.GetType();
  if (types && type === types.GeomAbs_Plane) return samePlane(a, b);
  if (types && type === types.GeomAbs_Cylinder) return sameCylinder(a, b);
  if (types && type === types.GeomAbs_Sphere) return sameSphere(a, b);
  // Cones, tori, and B-splines: compare a grid of absolute surface samples.
  return sameSampledSurface(a, b, bounds);
}

function samePlane(a: any, b: any): boolean {
  const pa = a.Plane();
  const pb = b.Plane();
  const axA = pa.Axis();
  const axB = pb.Axis();
  const dirA = axA.Direction();
  const dirB = axB.Direction();
  try {
    const dot = dirA.X() * dirB.X() + dirA.Y() * dirB.Y() + dirA.Z() * dirB.Z();
    return Math.abs(pa.Distance_3(pb)) < SURFACE_SAMPLE_TOL && Math.abs(Math.abs(dot) - 1) < 1e-7;
  } finally {
    dirA.delete?.();
    dirB.delete?.();
    axA.delete?.();
    axB.delete?.();
    pa.delete?.();
    pb.delete?.();
  }
}

function sameCylinder(a: any, b: any): boolean {
  const ca = a.Cylinder();
  const cb = b.Cylinder();
  const axA = ca.Axis();
  const axB = cb.Axis();
  try {
    return (
      Math.abs(ca.Radius() - cb.Radius()) < SURFACE_SAMPLE_TOL &&
      axA.IsCoaxial(axB, 1e-7, 1e-7)
    );
  } finally {
    axA.delete?.();
    axB.delete?.();
    ca.delete?.();
    cb.delete?.();
  }
}

function sameSphere(a: any, b: any): boolean {
  const ca = a.Sphere();
  const cb = b.Sphere();
  const pa = ca.Location();
  const pb = cb.Location();
  try {
    return (
      Math.abs(ca.Radius() - cb.Radius()) < SURFACE_SAMPLE_TOL &&
      pa.Distance(pb) < SURFACE_SAMPLE_TOL
    );
  } finally {
    pa.delete?.();
    pb.delete?.();
    ca.delete?.();
    cb.delete?.();
  }
}

function sameSampledSurface(
  a: any,
  b: any,
  bounds: { uMin: number; uMax: number; vMin: number; vMax: number },
): boolean {
  const uStep = (bounds.uMax - bounds.uMin) / 3;
  const vStep = (bounds.vMax - bounds.vMin) / 3;
  for (let i = 0; i <= 3; i++) {
    for (let j = 0; j <= 3; j++) {
      const p = a.Value(bounds.uMin + uStep * i, bounds.vMin + vStep * j);
      const q = b.Value(bounds.uMin + uStep * i, bounds.vMin + vStep * j);
      const dx = p.X() - q.X();
      const dy = p.Y() - q.Y();
      const dz = p.Z() - q.Z();
      p.delete?.();
      q.delete?.();
      if (dx * dx + dy * dy + dz * dz > SURFACE_SAMPLE_TOL * SURFACE_SAMPLE_TOL) return false;
    }
  }
  return true;
}
