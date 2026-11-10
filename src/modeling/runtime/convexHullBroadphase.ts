// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/convexHullBroadphase.ts
//
// Conservative separation proof for interference pairs. Each analysis body
// is covered by the union of its face bounding boxes (OCCT's
// tolerance-inclusive boxes, padded outward). If no face-box of A overlaps
// any face-box of B, the solids cannot share volume and the exact Common
// boolean is skipped. A convex hull of those boxes would fill concavities
// (an L becomes a rectangle) and miss this proof; the union does not.
// Any bound failure falls through to the exact probe.

import { analysisBodyOf, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { collectSweepProxyCandidates, type SweepProxy } from './sweepCollisionProxy';
import { toleranceInclusiveBounds } from '../../kernel/backends/occt/backendBounds';
import { Transform, type Vec3 } from '../../shared/runtime/se3';

/** Same outward pad the sweep OBB proxies use. Never a shrink. */
const BOX_MARGIN_MM = 1e-3;

interface LocalBox {
  readonly min: Vec3;
  readonly max: Vec3;
}

interface WorldAabb {
  readonly min: Vec3;
  readonly max: Vec3;
}

const faceBoxCache = new WeakMap<object, readonly LocalBox[]>();

export function hullsProveSeparated(
  aSource: object,
  aTransform: Transform,
  bSource: object,
  bTransform: Transform,
): boolean {
  try {
    if (!(aSource instanceof OcctBackend) || !(bSource instanceof OcctBackend)) return false;
    const aBoxes = faceBoxes(aSource);
    const bBoxes = faceBoxes(bSource);
    if (aBoxes === undefined || bBoxes === undefined) return false;
    const aWorld = aBoxes.map((box) => worldAabb(box, aTransform));
    const bWorld = bBoxes.map((box) => worldAabb(box, bTransform));
    for (const a of aWorld) {
      for (const b of bWorld) {
        if (aabbOverlap(a, b)) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Local-frame face boxes whose union contains the solid. */
export function hullCoverPoints(body: OcctBackend): readonly Vec3[] | undefined {
  const boxes = faceBoxes(body);
  if (boxes === undefined) return undefined;
  const points: Vec3[] = [];
  for (const box of boxes) {
    for (const x of [box.min[0], box.max[0]]) {
      for (const y of [box.min[1], box.max[1]]) {
        for (const z of [box.min[2], box.max[2]]) points.push([x, y, z]);
      }
    }
  }
  return points;
}

function faceBoxes(body: OcctBackend): readonly LocalBox[] | undefined {
  const cached = faceBoxCache.get(body);
  if (cached !== undefined) return cached;
  let faces: Array<{ boundingBox: { bounds: [number[], number[]] }; wrapped?: unknown }>;
  try {
    faces = body.getReplicadShape().faces as typeof faces;
  } catch {
    return undefined;
  }
  if (!Array.isArray(faces) || faces.length === 0) return undefined;
  const boxes: LocalBox[] = [];
  for (const face of faces) {
    const bounds = boundsOfFace(face);
    if (bounds === undefined) return undefined;
    const expanded = expandOutward(bounds.min, bounds.max, BOX_MARGIN_MM);
    if (expanded === undefined) return undefined;
    boxes.push(expanded);
  }
  faceBoxCache.set(body, boxes);
  return boxes;
}

function boundsOfFace(face: { boundingBox: { bounds: [number[], number[]] }; wrapped?: unknown }): { min: Vec3; max: Vec3 } | undefined {
  try {
    if (face.wrapped !== undefined) {
      const inclusive = toleranceInclusiveBounds(face.wrapped);
      if (inclusive !== undefined) return inclusive;
    }
    const [min, max] = face.boundingBox.bounds;
    return { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] };
  } catch {
    return undefined;
  }
}

function expandOutward(min: Vec3, max: Vec3, margin: number): LocalBox | undefined {
  if (!(margin >= 0) || !Number.isFinite(margin)) return undefined;
  const expandedMin: Vec3 = [min[0] - margin, min[1] - margin, min[2] - margin];
  const expandedMax: Vec3 = [max[0] + margin, max[1] + margin, max[2] + margin];
  for (let axis = 0; axis < 3; axis++) {
    if (!(expandedMin[axis]! <= min[axis]!)) return undefined;
    if (!(expandedMax[axis]! >= max[axis]!)) return undefined;
    if (!Number.isFinite(expandedMin[axis]!) || !Number.isFinite(expandedMax[axis]!)) return undefined;
  }
  return { min: expandedMin, max: expandedMax };
}

function worldAabb(box: LocalBox, transform: Transform): WorldAabb {
  const centerLocal: Vec3 = [
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2,
  ];
  const half: Vec3 = [
    (box.max[0] - box.min[0]) / 2,
    (box.max[1] - box.min[1]) / 2,
    (box.max[2] - box.min[2]) / 2,
  ];
  const center = transform.point(centerLocal);
  const x = transform.axisDir([1, 0, 0]);
  const y = transform.axisDir([0, 1, 0]);
  const z = transform.axisDir([0, 0, 1]);
  const worldHalf: Vec3 = [
    Math.abs(x[0]) * half[0] + Math.abs(y[0]) * half[1] + Math.abs(z[0]) * half[2],
    Math.abs(x[1]) * half[0] + Math.abs(y[1]) * half[1] + Math.abs(z[1]) * half[2],
    Math.abs(x[2]) * half[0] + Math.abs(y[2]) * half[1] + Math.abs(z[2]) * half[2],
  ];
  return {
    min: [center[0] - worldHalf[0], center[1] - worldHalf[1], center[2] - worldHalf[2]],
    max: [center[0] + worldHalf[0], center[1] + worldHalf[1], center[2] + worldHalf[2]],
  };
}

function aabbOverlap(a: WorldAabb, b: WorldAabb): boolean {
  return (
    a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
  );
}

/** OBB proxy candidates whose face-box unions still might touch. */
export function proxyPairsNeedingExactConfirm(
  proxies: readonly SweepProxy[],
  scene: SceneBackend,
  ignored: ReadonlySet<string> = new Set<string>(),
): Array<readonly [number, number]> {
  const parts = scene.parts.filter((part) => part.shape instanceof OcctBackend);
  const kept: Array<readonly [number, number]> = [];
  for (const pair of collectSweepProxyCandidates(proxies, scene, ignored)) {
    const a = parts[pair.i];
    const b = parts[pair.j];
    if (a === undefined || b === undefined) {
      kept.push([pair.i, pair.j]);
      continue;
    }
    if (!hullsProveSeparated(
      analysisBodyOf(a.shape) as object,
      a.worldTransform,
      analysisBodyOf(b.shape) as object,
      b.worldTransform,
    )) {
      kept.push([pair.i, pair.j]);
    }
  }
  return kept;
}
