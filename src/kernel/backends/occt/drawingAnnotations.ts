// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAnnotations.ts
//
// User-authored annotations for the engineering-drawing sheet: linear,
// radius, diameter and angular dimensions plus notes with leader lines.
//
// The exporter's built-in dimensions can only ever state the overall bounding
// box. This module is the surface through which a script says "dimension THIS
// hole" / "call out THAT slot". It owns three jobs:
//
//   1. ADDRESSING — annotations name geometry with the same `EdgeQuery` /
//      `FaceQuery` vocabulary that `fillet` / `chamfer` / `selectEdge` use, so
//      there is one way to point at geometry in kernelCAD, not two. An
//      explicit model-space point is accepted as the escape hatch.
//   2. ANCHORING — every annotation resolves to MODEL-space 3D points, which
//      are then pushed through exactly the transform the geometry took:
//      3D → model-2D (`projectPointForDrawing`, shared basis with the HLR
//      camera) → sheet mm (`ViewPlacement`). Nothing is anchored in sheet
//      coordinates, so annotations stay welded to their features when the
//      drawing scale changes.
//   3. HONESTY — an annotation whose geometry cannot be resolved is never
//      dropped. Every failure is collected and thrown as one `KernelError`
//      naming each annotation and why it failed. A drawing that quietly omits
//      a dimension the author asked for is worse than one that errors.
//
// Scale invariance: positions scale with the drawing, TEXT AND LEADERS DO NOT.
// Every constant below is sheet millimetres and is applied after the model→
// sheet transform, so a 1:5 sheet and a 2:1 sheet get identical text height,
// arrowheads, leader stems and dimension-line spacing.

import type { Edge, Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery } from './edgeQueries';
import { KernelError } from '../../../shared/intent/kernelError';
import type { Vec3 } from '../../../shared/intent/types';
import type { EdgeQuery, FaceQuery } from '../../../shared/intent/queryTypes';
import type { WorldFramePart } from './sceneToWorldFrame';
import { projectPointForDrawing } from './drawingProjection';
import {
  angularDimensionToSvg,
  dimensionToSvg,
  formatDimValue,
  leaderNoteToSvg,
  radialDimensionToSvg,
  type DrawingViewName,
  type LinearDimension,
  type Pt2,
  type ViewPlacement,
} from './drawingLayout';

// ---------------------------------------------------------------------------
// Authoring surface
// ---------------------------------------------------------------------------

/**
 * Where an annotation attaches. Either an explicit model-space point, or a
 * query naming geometry the way every other kernelCAD selector does.
 * An edge resolves to its curve midpoint, a face to its centre.
 */
export type DrawingAnchor =
  | Vec3
  | { edge: EdgeQuery }
  | { face: FaceQuery };

/**
 * One authored annotation. Deliberately one flat discriminated union with a
 * single shared `view` / `text` / `offset` triple — the fewest fields that can
 * express all five annotation kinds.
 *
 * - `view` — which sheet view to draw on. Default `'front'`.
 * - `text` — override the computed label (units and prefixes are then yours).
 * - `offset` — push the annotation further away from the geometry, in SHEET
 *   millimetres, on top of the automatic placement: extra dimension-line
 *   distance for `linear`/`angular`, extra leader-stem length for
 *   `radius`/`diameter`/`note`.
 */
export type DrawingAnnotation =
  | {
      kind: 'linear';
      from: DrawingAnchor;
      to: DrawingAnchor;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'radius' | 'diameter';
      /** A circular edge — the hole rim, boss rim or fillet arc to call out. */
      edge: EdgeQuery;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'angular';
      /** The two straight edges whose included angle is measured. */
      from: EdgeQuery;
      to: EdgeQuery;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'note';
      at: DrawingAnchor;
      text: string;
      view?: DrawingViewName;
      offset?: number;
    };

// ---------------------------------------------------------------------------
// Placement constants (all SHEET millimetres — never multiplied by the scale)
// ---------------------------------------------------------------------------

/** First dimension line sits this far outside the view's sheet bbox. Matches
 *  the built-in bounding-box dimensions so authored and automatic sheets read
 *  the same. */
export const DIM_BASE = 8;
/** Each further dimension on the same view+side stacks out by this much. */
export const DIM_STEP = 8;
/** Arc radius for the first angular dimension on a view. */
const ANGULAR_RADIUS = 12;
/** First leader points up-and-right (sheet coords are y-down, hence −45°). */
const LEADER_BASE_ANGLE = -Math.PI / 4;
/** Successive leaders in the same view rotate by this much so two callouts on
 *  nearby features never lie on top of each other. */
const LEADER_STEP_ANGLE = -Math.PI / 6;

// ---------------------------------------------------------------------------
// Geometry resolution
// ---------------------------------------------------------------------------

/** Author-supplied label text lands directly in the SVG, so it must be
 *  escaped here — the built-in dimension labels are numeric and never needed
 *  it, which is exactly why the renderer does not escape for us. */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isVec3 = (a: DrawingAnchor): a is Vec3 =>
  Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number');

/** Describe an annotation compactly enough to name it in a diagnostic. */
function describe(a: DrawingAnnotation, index: number): string {
  return `annotations[${index}] (${a.kind}${a.view ? `, view '${a.view}'` : ''})`;
}

/**
 * Resolve a query across every part on the sheet. Parts arrive in world frame,
 * so a query is answered against the same coordinates the projection sees.
 * Matches are pooled across parts because the author addresses "the sheet",
 * not "part 3".
 */
function resolveAcrossParts<Q, R>(
  parts: readonly WorldFramePart[],
  query: Q,
  resolve: (shape: OcctBackend, q: Q) => R[],
): R[] {
  const out: R[] = [];
  for (const p of parts) {
    try {
      out.push(...resolve(p.shape as OcctBackend, query));
    } catch {
      // A query key that a particular part's topology cannot answer (e.g. a
      // face type that body has none of) is not an error for the sheet — the
      // caller's "zero total matches" check is the real gate.
    }
  }
  return out;
}

class Unresolved extends Error {}

const fail = (why: string): never => {
  throw new Unresolved(why);
};

function oneEdge(parts: readonly WorldFramePart[], q: EdgeQuery, role: string): Edge {
  const matches = resolveAcrossParts(parts, q, resolveEdgeQuery);
  if (matches.length === 0) fail(`${role}: no edge matched ${JSON.stringify(q)}`);
  // `near` is the documented disambiguator throughout the selector API — it
  // sorts closest-first, so honouring it here keeps the same contract.
  if (matches.length > 1 && q.near === undefined) {
    fail(`${role}: ${matches.length} edges matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

function oneFace(parts: readonly WorldFramePart[], q: FaceQuery, role: string): Face {
  const matches = resolveAcrossParts(parts, q, resolveFaceQuery);
  if (matches.length === 0) fail(`${role}: no face matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    fail(`${role}: ${matches.length} faces matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

/**
 * Curve midpoint of an edge. Deliberately `pointAt(0.5)` rather than the
 * endpoint average used by the selector summary: for a CLOSED circular edge
 * the endpoints coincide, so the endpoint average degenerates to a single
 * point on the rim and an annotation anchored there would sit in the wrong
 * place entirely.
 */
function edgeMid(e: Edge): Vec3 {
  const p = e.pointAt(0.5);
  return [p.x, p.y, p.z];
}

function resolveAnchor(
  parts: readonly WorldFramePart[],
  anchor: DrawingAnchor,
  role: string,
): Vec3 {
  if (isVec3(anchor)) return anchor;
  if ('edge' in anchor) return edgeMid(oneEdge(parts, anchor.edge, role));
  if ('face' in anchor) {
    const c = oneFace(parts, anchor.face, role).center;
    return [c.x, c.y, c.z];
  }
  return fail(`${role}: anchor must be a [x,y,z] point, { edge: … } or { face: … }`);
}

/**
 * Centre and radius of a circular edge, in model space.
 *
 * Solved from three points sampled on the curve (the circumcentre / circum-
 * radius of the triangle they form) — the same technique the selector's
 * `radius` summary uses, and it needs no OCCT symbol beyond `pointAt`.
 * Non-circular edges are rejected rather than approximated.
 */
function circleOf(e: Edge, role: string): { center: Vec3; radius: number } {
  const geom = (e as unknown as { geomType?: string }).geomType;
  if (geom !== 'CIRCLE') {
    fail(`${role}: edge is a ${geom ?? 'UNKNOWN'}, not a CIRCLE — radius/diameter needs a circular edge`);
  }
  const a = e.pointAt(0);
  const b = e.pointAt(1 / 3);
  const c = e.pointAt(2 / 3);
  const A: Vec3 = [a.x, a.y, a.z];
  const ab: Vec3 = [b.x - a.x, b.y - a.y, b.z - a.z];
  const ac: Vec3 = [c.x - a.x, c.y - a.y, c.z - a.z];
  const n: Vec3 = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const n2 = n[0] * n[0] + n[1] * n[1] + n[2] * n[2];
  if (n2 < 1e-18) fail(`${role}: circular edge samples are collinear — cannot solve a centre`);
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const ac2 = ac[0] * ac[0] + ac[1] * ac[1] + ac[2] * ac[2];
  // Circumcentre relative to A: (|ab|²·(ac×n) + |ac|²·(n×ab)) / 2|n|².
  const t1: Vec3 = [
    ac[1] * n[2] - ac[2] * n[1],
    ac[2] * n[0] - ac[0] * n[2],
    ac[0] * n[1] - ac[1] * n[0],
  ];
  const t2: Vec3 = [
    n[1] * ab[2] - n[2] * ab[1],
    n[2] * ab[0] - n[0] * ab[2],
    n[0] * ab[1] - n[1] * ab[0],
  ];
  const k = 1 / (2 * n2);
  const rel: Vec3 = [
    (ab2 * t1[0] + ac2 * t2[0]) * k,
    (ab2 * t1[1] + ac2 * t2[1]) * k,
    (ab2 * t1[2] + ac2 * t2[2]) * k,
  ];
  return {
    center: [A[0] + rel[0], A[1] + rel[1], A[2] + rel[2]],
    radius: Math.hypot(rel[0], rel[1], rel[2]),
  };
}

// ---------------------------------------------------------------------------
// Model → sheet
// ---------------------------------------------------------------------------

/** The one transform every annotation goes through, identical to the one
 *  `bakePath` applies to projected geometry: model 3D → model 2D (y up) →
 *  sheet mm (y down). */
export function modelToSheet(
  p: Vec3,
  view: DrawingViewName,
  placement: ViewPlacement,
  scale: number,
): Pt2 {
  const [mx, my] = projectPointForDrawing(p, view);
  return [placement.tx + mx * scale, placement.ty - my * scale];
}

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------

export interface AnnotationRenderInput {
  parts: readonly WorldFramePart[];
  annotations: readonly DrawingAnnotation[];
  placements: Record<DrawingViewName, ViewPlacement>;
  scale: number;
}

export interface AnnotationRenderResult {
  /** SVG fragments, one `<g class="dim…">` per annotation, in author order. */
  svg: string[];
  /** Sheet-mm depth reserved below each view by bottom-stacked dimensions.
   *  The exporter pushes view labels below this so they never collide. */
  bottomReserve: Record<DrawingViewName, number>;
}

/**
 * Stacking rule (deterministic, geometry-independent):
 *
 * Annotations are bucketed by (view, side). A `linear` dimension whose
 * projected span is wider than it is tall is drawn BELOW its view; otherwise
 * it is drawn to the RIGHT of it. Angular dimensions bucket as `arc`, leader
 * kinds as `leader`. Within a bucket, the Nth annotation *in author order*
 * steps one `DIM_STEP` further out (linear), one `DIM_STEP` larger in arc
 * radius (angular), or one `LEADER_STEP_ANGLE` further round (leaders).
 *
 * Order therefore depends only on how the author wrote them, never on model
 * coordinates — reordering the model cannot reshuffle the sheet.
 */
export function renderAnnotations(input: AnnotationRenderInput): AnnotationRenderResult {
  const { parts, annotations, placements, scale } = input;
  const svg: string[] = [];
  const failures: string[] = [];
  const stack = new Map<string, number>();
  const bottomReserve: Record<DrawingViewName, number> = {
    front: 0, top: 0, left: 0, iso: 0,
  };

  const nextIndex = (view: DrawingViewName, side: string): number => {
    const key = `${view}:${side}`;
    const i = stack.get(key) ?? 0;
    stack.set(key, i + 1);
    return i;
  };

  annotations.forEach((a, i) => {
    const view = a.view ?? 'front';
    const placement = placements[view];
    const role = describe(a, i);
    if (!placement) {
      failures.push(`${role}: unknown view '${view}' (expected front | top | left | iso)`);
      return;
    }
    const toSheet = (p: Vec3): Pt2 => modelToSheet(p, view, placement, scale);
    const extra = a.offset ?? 0;

    try {
      switch (a.kind) {
        case 'linear': {
          const model0 = resolveAnchor(parts, a.from, `${role}.from`);
          const model1 = resolveAnchor(parts, a.to, `${role}.to`);
          const p0 = toSheet(model0);
          const p1 = toSheet(model1);
          // Orientation is read off the SHEET span so the dimension reads the
          // way the feature looks in this view; the LABEL is the true model
          // distance along that same axis, so it is scale-independent.
          const horizontal = Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]);
          const m0 = projectPointForDrawing(model0, view);
          const m1 = projectPointForDrawing(model1, view);
          const measured = horizontal
            ? Math.abs(m1[0] - m0[0])
            : Math.abs(m1[1] - m0[1]);
          const side = horizontal ? 'bottom' : 'right';
          const dist = DIM_BASE + nextIndex(view, side) * DIM_STEP + extra;
          const box = placement.box;
          const dim: LinearDimension = horizontal
            ? {
                kind: 'horizontal',
                from: [p0[0], p0[1]],
                to: [p1[0], p1[1]],
                linePos: box.y + box.h + dist,
                label: a.text ? esc(a.text) : formatDimValue(measured),
              }
            : {
                kind: 'vertical',
                from: [p0[0], p0[1]],
                to: [p1[0], p1[1]],
                linePos: box.x + box.w + dist,
                label: a.text ? esc(a.text) : formatDimValue(measured),
              };
          if (horizontal) {
            bottomReserve[view] = Math.max(bottomReserve[view], dist);
          }
          svg.push(dimensionToSvg(dim));
          break;
        }

        case 'radius':
        case 'diameter': {
          const edge = oneEdge(parts, a.edge, role);
          const { center, radius } = circleOf(edge, role);
          const value = a.kind === 'diameter' ? radius * 2 : radius;
          const prefix = a.kind === 'diameter' ? '⌀' : 'R';
          svg.push(
            radialDimensionToSvg({
              kind: a.kind,
              center: toSheet(center),
              // Model radius through the same scale as every other length.
              radius: radius * scale,
              angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
              label: a.text ? esc(a.text) : `${prefix}${formatDimValue(value)}`,
              stemExtra: extra,
            }),
          );
          break;
        }

        case 'angular': {
          const eA = oneEdge(parts, a.from, `${role}.from`);
          const eB = oneEdge(parts, a.to, `${role}.to`);
          const ray = (e: Edge) => {
            const s = e.startPoint;
            const t = e.endPoint;
            const p = projectPointForDrawing([s.x, s.y, s.z], view);
            const q = projectPointForDrawing([t.x, t.y, t.z], view);
            return { p, d: [q[0] - p[0], q[1] - p[1]] as const };
          };
          const A = ray(eA);
          const B = ray(eB);
          const det = A.d[0] * B.d[1] - A.d[1] * B.d[0];
          if (Math.abs(det) < 1e-9) {
            fail(`${role}: the two edges are parallel in view '${view}' — no apex to measure from`);
          }
          // Apex = intersection of the two infinite lines in model-2D, so it
          // survives the scale change exactly like every other anchor.
          const t = ((B.p[0] - A.p[0]) * B.d[1] - (B.p[1] - A.p[1]) * B.d[0]) / det;
          const apex2: Pt2 = [A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t];
          const apexSheet: Pt2 = [
            placement.tx + apex2[0] * scale,
            placement.ty - apex2[1] * scale,
          ];
          // Point each direction AWAY from the apex, toward its edge's far end,
          // so the arc lands inside the physical corner rather than opposite it.
          const away = (r: { p: readonly [number, number]; d: readonly [number, number] }) => {
            const far = Math.hypot(r.p[0] - apex2[0], r.p[1] - apex2[1]) >
              Math.hypot(r.p[0] + r.d[0] - apex2[0], r.p[1] + r.d[1] - apex2[1])
              ? [-r.d[0], -r.d[1]]
              : [r.d[0], r.d[1]];
            // Sheet y is down: flip y so the drawn angle matches the sheet.
            return Math.atan2(-far[1], far[0]);
          };
          const a0 = away(A);
          let a1 = away(B);
          // Normalise to the SHORT sweep — an angular dimension states the
          // included angle, and the arc must agree with the number printed.
          let sweep = a1 - a0;
          while (sweep <= -Math.PI) sweep += 2 * Math.PI;
          while (sweep > Math.PI) sweep -= 2 * Math.PI;
          a1 = a0 + sweep;
          const idx = nextIndex(view, 'arc');
          svg.push(
            angularDimensionToSvg({
              apex: apexSheet,
              startAngle: a0,
              endAngle: a1,
              radius: ANGULAR_RADIUS + idx * DIM_STEP + extra,
              label: a.text ? esc(a.text) : `${formatDimValue(Math.abs(sweep) * 180 / Math.PI)}°`,
            }),
          );
          break;
        }

        case 'note': {
          const target = toSheet(resolveAnchor(parts, a.at, `${role}.at`));
          svg.push(
            leaderNoteToSvg({
              target,
              angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
              text: esc(a.text),
              stemExtra: extra,
            }),
          );
          break;
        }
      }
    } catch (e) {
      if (e instanceof Unresolved) failures.push(e.message);
      else throw e;
    }
  });

  if (failures.length > 0) {
    throw new KernelError(
      'feature.selection.no-match',
      `svg-drawing: ${failures.length} annotation(s) could not be resolved:\n` +
        failures.map(f => `  - ${f}`).join('\n'),
      undefined,
      'Every authored annotation must resolve, or the drawing would silently ' +
        'omit a dimension. Tighten each query (inspect the model with ' +
        "inspect({ of: 'edges' }) to see what is selectable) or pass an " +
        'explicit [x, y, z] anchor.',
    );
  }

  return { svg, bottomReserve };
}
