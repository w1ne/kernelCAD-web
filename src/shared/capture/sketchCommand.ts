// src/shared/capture/sketchCommand.ts
//
// Leaf module for the SketchCommand discriminated union.
//
// SketchCommand is the wire format for path segments captured by
// modeling/capture/sketch.ts (PathBuilder) and consumed at lowering time by
// the kernel/ OCCT backend (occtBackend.ts, cutoutLowerer.ts) and by
// authoring/validation/cutoutValidation.ts.
//
// It is extracted here — into shared/, the lowest layer — so the kernel can
// type-import it without depending on modeling/. The runtime classes
// (PathBuilder, Sketch) and the `makePath` factory stay in
// modeling/capture/sketch.ts; only the data-shape type lives here.
import type { Param } from '../intent/types';

export type SketchCommand =
  | { kind: 'moveTo'; x: Param; y: Param }
  | { kind: 'lineTo'; x: Param; y: Param }
  | { kind: 'tangentArc'; x: Param; y: Param }
  | { kind: 'threePointsArc'; x: Param; y: Param; midX: Param; midY: Param }
  | { kind: 'sagittaArc'; x: Param; y: Param; sagitta: Param }
  | { kind: 'bulgeArc'; x: Param; y: Param; bulge: Param }
  | { kind: 'radiusArc'; x: Param; y: Param; radius: Param }
  // C1-smooth spline segment from current pen position to (x, y). The
  // tangent at the start is inherited from the prior segment (so the join
  // is smooth), and the end tangent is chosen automatically by replicad's
  // smoothSplineTo. Useful for organic outlines (Wayfarer brow, ergonomic
  // grips) where chained arcs hit OCCT BlendChain solver cliffs.
  | { kind: 'smoothSpline'; x: Param; y: Param }
  | { kind: 'close' };
