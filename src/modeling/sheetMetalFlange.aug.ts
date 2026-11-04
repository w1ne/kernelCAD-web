// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CornerReliefOpts, EdgeFlangeOpts, HemOpts } from "./sheetMetalFlange";
import type { CanonicalFace, FaceSelector } from "./capture/faceEditCapture";

/** Mirror of EdgeSelector used by bend/edgeFlange without importing the value. */
type EdgeRef =
  | import("../kernel/backends/occt/edgeQueries").EdgeQuery
  | { face: FaceSelector | CanonicalFace | string }
  | FaceSelector
  | CanonicalFace
  | string;

declare module "./capture/proxy" {
  interface Shape {
    edgeFlange(edgeRef: EdgeRef, opts: EdgeFlangeOpts): import("./capture/proxy").Shape;
    hem(edgeRef: EdgeRef, opts: HemOpts): import("./capture/proxy").Shape;
    cornerRelief(opts: CornerReliefOpts): import("./capture/proxy").Shape;
  }
}

export {};
