// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CornerReliefOpts, EdgeFlangeOpts, HemOpts } from './sheetMetalFlange';
import type { Shape } from './capture/proxy';
import type { CanonicalFace, FaceSelector } from './faceEditCapture';

/** Mirror of EdgeSelector used by bend/edgeFlange without importing the value. */
type EdgeRef =
  | import('../kernel/backends/occt/edgeQueries').EdgeQuery
  | { face: FaceSelector | CanonicalFace | string }
  | FaceSelector
  | CanonicalFace
  | string;

declare module './capture/proxy' {
  interface Shape {
    edgeFlange(edgeRef: EdgeRef, opts: EdgeFlangeOpts): Shape;
    hem(edgeRef: EdgeRef, opts: HemOpts): Shape;
    cornerRelief(opts: CornerReliefOpts): Shape;
  }
}

export {};
