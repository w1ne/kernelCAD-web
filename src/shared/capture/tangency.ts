// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/capture/tangency.ts
//
// Leaf module for 2D tangency-construction types.
//
// These describe the INPUT to OCCT's `Geom2dGcc_*` solvers — "the circle of
// radius 5 tangent to these two lines", "the belt line tangent to these two
// pulleys". Nothing here computes geometry: `PathBuilder.tangentCircle` /
// `.tangentLine` record a spec, and `kernel/backends/occt/tangencySolver.ts`
// resolves it into concrete segments at lowering time (that is the only layer
// where `getOC()` is available).
//
// It lives in shared/ — the lowest layer — so both the capture side
// (modeling/capture/sketch.ts) and the kernel side can import it without a
// modeling/ -> kernel/ dependency.
//
// ENTITIES ARE CURVES ONLY (lines and circles). OCCT's point-tangency
// overloads (`Geom2dGcc_Circ2d2TanRad_2/_3`, `Geom2dGcc_Circ2d3Tan_2/_3/_4`)
// take a `Handle_Geom2d_Point`, and neither `Geom2d_CartesianPoint` nor
// `Handle_Geom2d_Point` is bound in the bundled wasm (`kcad-v0.25.0`) — they
// appear in the .d.ts only as parameter types, and `oc.Geom2d_CartesianPoint_1`
// is `undefined` at runtime. "Circle through a point tangent to a curve" is
// therefore unavailable until the wasm exports the point classes; we say so
// rather than approximating a point as a tiny circle.

import type { Param } from '../intent/types';

/**
 * OCCT `GccEnt_Position` qualifier — the PRINCIPAL control over which of the
 * several mathematically valid solutions you meant.
 *
 * - `'outside'`     — the solution touches this entity from outside it.
 *                     For a CIRCLE this is the intuitive reading. For a LINE
 *                     it means "on the right of the directed line", so it is
 *                     sensitive to the `from`->`to` order you supply — swap
 *                     `from` and `to` to flip which side you get.
 * - `'enclosed'`    — the solution lies inside this entity.
 * - `'enclosing'`   — the solution contains this entity.
 * - `'unqualified'` — no constraint; admits every solution. Expect several,
 *                     and pass `near` to pick between them.
 *
 * Default is `'outside'`, which is the sketch-fillet reading and is often
 * enough on its own to make the answer unique (two perpendicular lines with a
 * given radius: 4 solutions unqualified, exactly 1 with outside/outside).
 */
export type TangentSide = 'outside' | 'enclosed' | 'enclosing' | 'unqualified';

export const TANGENT_SIDES: readonly TangentSide[] = ['outside', 'enclosed', 'enclosing', 'unqualified'];

/**
 * An entity a tangency construction can touch, as authored.
 *
 * `line` is treated as an INFINITE line through `from` and `to` — the two
 * points fix the line and its direction, not its extent. `circle` is a full
 * circle.
 */
export type TangentEntity2D =
  | { kind: 'line'; from: [number, number]; to: [number, number]; side?: TangentSide }
  | { kind: 'circle'; center: [number, number]; radius: number; side?: TangentSide };

/** Wire form of `TangentEntity2D` — same shape with `Param`-boxed scalars and
 *  `side` defaulted, so the lowerer reads `.evaluated` uniformly. */
export type TangentEntitySpec =
  | { kind: 'line'; x1: Param; y1: Param; x2: Param; y2: Param; side: TangentSide }
  | { kind: 'circle'; cx: Param; cy: Param; r: Param; side: TangentSide };

/** Optional disambiguation hint — see the selection rule in
 *  `kernel/backends/occt/tangencySolver.ts`. */
export interface TangentNearSpec { x: Param; y: Param }

/**
 * Tolerance handed to the `Geom2dGcc_*` constructors. OCCT treats this as an
 * angular/linear solver tolerance, not a modelling tolerance; 1e-7 is what the
 * OCCT samples use for mm-scale 2D work.
 */
export const TANGENCY_TOLERANCE = 1e-7;

/**
 * Two solution centres closer together than this are treated as the same
 * solution when the `near` hint is scoring them, and the construction is
 * reported ambiguous rather than resolved by floating-point noise.
 */
export const TANGENCY_TIE_EPSILON = 1e-9;
