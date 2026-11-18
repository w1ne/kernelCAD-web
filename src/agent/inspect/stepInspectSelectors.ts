// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Edit selectors for one STEP import. A positional `fN` listing id is rejected
// by face edits. A fresh import also has no lineage snapshots, so
// `@kcq[face(closestTo(...))]` does not see those faces. The selector face
// edits accept is the FaceQuery `{ near: <centroid> }`.

const POSITIONAL_FACE = /^f\d+$/;

export type FaceEditRef = string | { near: [number, number, number] };

export interface ListedFace {
  id: string;
  ref: string;
  centroid: [number, number, number];
}

export interface InspectFaceRow {
  id: string;
  /** Selector `hole` / `offsetFaces` accept on this import. */
  ref: FaceEditRef;
  /** Same string `inspect({ of: 'faces' })` emits. Not an edit selector when it ends in `fN`. */
  listRef: string;
  surfaceType: string;
  area: number;
  normal: [number, number, number];
  centroid: [number, number, number];
}

function faceSegment(listRef: string, id: string): string {
  const match = /\/face\/([^/\]]+)/.exec(listRef);
  return match?.[1] ?? id;
}

function roundMm(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function editFaceRef(face: ListedFace): FaceEditRef {
  const segment = faceSegment(face.ref, face.id);
  if (!POSITIONAL_FACE.test(segment)) return face.ref;
  return {
    near: [roundMm(face.centroid[0]), roundMm(face.centroid[1]), roundMm(face.centroid[2])],
  };
}

export function sameEditRef(a: FaceEditRef, b: string): boolean {
  if (typeof a === 'string') return a === b;
  return JSON.stringify(a) === b;
}

export function matchListedFace<T extends { id: string; ref: FaceEditRef; listRef: string }>(
  faces: readonly T[],
  requested: string,
): T | undefined {
  return faces.find((face) => face.id === requested || face.listRef === requested || sameEditRef(face.ref, requested));
}
