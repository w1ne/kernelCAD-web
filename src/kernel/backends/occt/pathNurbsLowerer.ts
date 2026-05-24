// src/kernel/backends/occt/pathNurbsLowerer.ts
//
// NURBS Slice D Task 3 — mixed-source path-NURBS lowerer.
//
// Walks a SketchCommand[] that contains at least one of the three Slice D NURBS
// segment kinds (`spline`, `nurbsSegment`, `hermiteG2_2d`) and assembles a
// `replicad.Sketch` on the supplied target plane via:
//
//   1. Pen-compatible runs (lineTo, tangentArc, threePointsArc, sagittaArc,
//      bulgeArc, radiusArc, smoothSpline) are accumulated in a Replicad
//      `DrawingPen`, then committed by calling `pen.done().sketchOnPlane(plane)`
//      and harvesting `wire.edges`. This preserves the pen's tangent-state
//      tracking (so `tangentArc` keeps doing the right thing) and reuses the
//      existing pen-side implementations of every arc kind.
//
//   2. NURBS segments (`spline`, `nurbsSegment`, `hermiteG2_2d`) are lowered
//      directly via OCCT WASM:
//        - `spline` → `replicad.makeBSplineApproximation(points, { tolerance,
//          degMax: 3, degMin: 3 })`, which returns a `replicad.Edge` whose
//          `wrapped` is a `TopoDS_Edge` backed by a `Geom_BSplineCurve`. The
//          edge is lifted onto the target plane by interpreting its 2D coords
//          as `(x, y) → planeMap(x, y)`.
//        - `nurbsSegment` → `Geom_BSplineCurve_1` (no weights) or `_2`
//          (rational), wrapped via `BRepBuilderAPI_MakeEdge_24`. Reuses
//          `clampedUniformKnots(n, degree)` and `decomposeKnots(knots)` from
//          the Slice B surface lowerer.
//        - `hermiteG2_2d` → `solveHermiteG2` (lifted to 3D with Z=0 on a
//          target-plane-agnostic basis, then the 6 Bezier poles are mapped
//          onto the target plane), then a degree-5 `Geom_BSplineCurve_1` with
//          `clampedUniformKnots(6, 5)` matching Slice C Task 5.
//
//   3. Edges from both sources are composed via `replicad.assembleWire(edges)`
//      — accepts a mixed `(Edge | Wire)[]` list. The resulting `replicad.Wire`
//      is wrapped as a `replicad.Sketch` with `defaultDirection = plane.zDir`
//      so the consumer's `extrude(d)` / `revolve(axis)` / `face()` calls
//      Just Work.
//
// The lowerer is invoked lazily by `OcctBackend.extrudeFromSketch`,
// `revolveFromSketch`, `liftSketchToFace`, and `loftFromSketches` when the
// underlying SketchCommand[] contains NURBS commands. For pure pen-compatible
// paths the existing `_drawing` path is kept unchanged.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import nurbsJs from 'verb-nurbs';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { solveHermiteG2 } from '../../../modeling/capture/hermiteG2';
import type { Vec3 } from '../../../shared/intent/types';
import { clampedUniformKnots, decomposeKnots } from './nurbsSurfaceLowerer';
import { fromVerb } from '../verb/curveBridge';

/**
 * Plane identifier — matches the planes accepted by `Drawing.sketchOnPlane`.
 * For target=XY the path's (x, y) maps to world (x, y, 0); for XZ it maps to
 * (x, 0, y); for YZ to (0, x, y). This mirrors Replicad's own plane lifting
 * — see `node_modules/replicad/dist/replicad.js:5538-5546` for the reference.
 */
export type PlaneName = 'XY' | 'XZ' | 'YZ';

/** Lift a 2D path coord onto the target plane, returning a 3D point. */
function liftCoord(plane: PlaneName, x: number, y: number): Vec3 {
  if (plane === 'XY') return [x, y, 0];
  if (plane === 'XZ') return [x, 0, y];
  return [0, x, y];
}

/** True iff `cmd` is one of the three Slice D NURBS segment kinds. */
function isNurbsCommand(cmd: SketchCommand): boolean {
  return cmd.kind === 'spline' || cmd.kind === 'nurbsSegment' || cmd.kind === 'hermiteG2_2d';
}

/** True iff any command in `commands` is a NURBS segment. */
export function hasNurbsSegments(commands: SketchCommand[]): boolean {
  for (const c of commands) if (isNurbsCommand(c)) return true;
  return false;
}

/**
 * Build a `replicad.Edge` wrapping a `TopoDS_Edge` from a Slice D `nurbsSegment`
 * command, with control points lifted onto the target plane.
 *
 * Constructor selection (matches `curve3dLowerer`):
 *  - Non-rational (no weights): `Geom_BSplineCurve_1(Poles, Knots, Mults,
 *    Degree, Periodic)`.
 *  - Rational (weights present): `Geom_BSplineCurve_2(Poles, Weights, Knots,
 *    Mults, Degree, Periodic, CheckRational)`.
 *
 * Knot handling: explicit knots are decomposed into (distinct, multiplicities);
 * otherwise `clampedUniformKnots(n, degree)` is used. Same shared helpers as
 * Slice B's curve3d and nurbsSurface lowerers.
 */
function buildNurbsSegmentEdge(
  cmd: Extract<SketchCommand, { kind: 'nurbsSegment' }>,
  plane: PlaneName,
): replicad.Edge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const n = cmd.controlPoints.length;
  const degree = cmd.degree.evaluated;
  const polesArr = new oc.TColgp_Array1OfPnt_2(1, n);
  for (let i = 0; i < n; i++) {
    const [px, py, pz] = liftCoord(plane, cmd.controlPoints[i].x.evaluated, cmd.controlPoints[i].y.evaluated);
    polesArr.SetValue(i + 1, new oc.gp_Pnt_3(px, py, pz));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let weightsArr: any | undefined;
  if (cmd.weights !== undefined) {
    weightsArr = new oc.TColStd_Array1OfReal_2(1, n);
    for (let i = 0; i < n; i++) weightsArr.SetValue(i + 1, cmd.weights[i].evaluated);
  }

  const decomposed = cmd.knots !== undefined
    ? decomposeKnots(cmd.knots.map(k => k.evaluated))
    : clampedUniformKnots(n, degree);

  const knotsArr = new oc.TColStd_Array1OfReal_2(1, decomposed.knots.length);
  const multsArr = new oc.TColStd_Array1OfInteger_2(1, decomposed.mults.length);
  for (let i = 0; i < decomposed.knots.length; i++) {
    knotsArr.SetValue(i + 1, decomposed.knots[i]);
    multsArr.SetValue(i + 1, decomposed.mults[i]);
  }

  const bspline = weightsArr !== undefined
    ? new oc.Geom_BSplineCurve_2(polesArr, weightsArr, knotsArr, multsArr, degree, false, false)
    : new oc.Geom_BSplineCurve_1(polesArr, knotsArr, multsArr, degree, false);

  const handle = new oc.Handle_Geom_Curve_2(bspline);
  const edgeBuilder = new oc.BRepBuilderAPI_MakeEdge_24(handle);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (replicad as any).Edge(edgeBuilder.Edge());
}

/**
 * Build a `replicad.Edge` from a Slice D `hermiteG2_2d` command. Uses
 * `solveHermiteG2` to produce 6 quintic Bezier control points (with curvature
 * default to zero when not supplied), then builds a degree-5 non-rational
 * B-spline edge with a clamped uniform knot vector — exactly matching Slice C
 * Task 5's 3D `hermiteG2` lowering, just lifted onto the target plane.
 */
function buildHermiteG2Edge(
  cmd: Extract<SketchCommand, { kind: 'hermiteG2_2d' }>,
  plane: PlaneName,
): replicad.Edge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const a = {
    point: liftCoord(plane, cmd.ax.evaluated, cmd.ay.evaluated),
    tangent: liftCoord(plane, cmd.atx.evaluated, cmd.aty.evaluated),
    curvature: cmd.acx !== undefined && cmd.acy !== undefined
      ? liftCoord(plane, cmd.acx.evaluated, cmd.acy.evaluated)
      : ([0, 0, 0] as Vec3),
  };
  const b = {
    point: liftCoord(plane, cmd.bx.evaluated, cmd.by.evaluated),
    tangent: liftCoord(plane, cmd.btx.evaluated, cmd.bty.evaluated),
    curvature: cmd.bcx !== undefined && cmd.bcy !== undefined
      ? liftCoord(plane, cmd.bcx.evaluated, cmd.bcy.evaluated)
      : ([0, 0, 0] as Vec3),
  };
  const bezier = solveHermiteG2(a, b);

  const polesArr = new oc.TColgp_Array1OfPnt_2(1, 6);
  for (let i = 0; i < 6; i++) {
    const [px, py, pz] = bezier[i];
    polesArr.SetValue(i + 1, new oc.gp_Pnt_3(px, py, pz));
  }
  const k = clampedUniformKnots(6, 5);
  const knotsArr = new oc.TColStd_Array1OfReal_2(1, k.knots.length);
  const multsArr = new oc.TColStd_Array1OfInteger_2(1, k.mults.length);
  for (let i = 0; i < k.knots.length; i++) {
    knotsArr.SetValue(i + 1, k.knots[i]);
    multsArr.SetValue(i + 1, k.mults[i]);
  }
  const bspline = new oc.Geom_BSplineCurve_1(polesArr, knotsArr, multsArr, 5, false);
  const handle = new oc.Handle_Geom_Curve_2(bspline);
  const edgeBuilder = new oc.BRepBuilderAPI_MakeEdge_24(handle);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (replicad as any).Edge(edgeBuilder.Edge());
}

/**
 * Build a `replicad.Edge` from a Slice D `spline` command.
 *
 * Two paths:
 *
 * 1. No tangent constraints (default, backward-compatible): calls
 *    `replicad.makeBSplineApproximation` with the points lifted onto the
 *    target plane; tolerance is 1e-4 and degree is clamped to cubic (3) to
 *    keep the result SVG-exportable and OCCT-friendly.
 *
 * 2. V slice — at least one of startTangent / endTangent is set: routes
 *    through the JS-side `Make.rationalInterpCurve` tangent-constrained
 *    interpolator (degree 3, chord-length parameterised), then rebuilds the
 *    resulting curve as an OCCT-backed `Geom_BSplineCurve` via the
 *    `fromVerb` bridge so the authoritative geometry stays kernel-native.
 *
 *    The interpolator expects both tangents (the underlying linear system
 *    is well-posed only when both endpoint tangent rows are present); when
 *    the caller supplies only one, the missing tangent is derived from the
 *    chord between the relevant endpoint and its neighbour. This keeps the
 *    one-sided-constraint case usable without leaking the upstream
 *    requirement.
 */
function buildSplineEdge(
  cmd: Extract<SketchCommand, { kind: 'spline' }>,
  plane: PlaneName,
): replicad.Edge {
  const lifted: Vec3[] = cmd.points.map(p => liftCoord(plane, p.x.evaluated, p.y.evaluated));
  if (cmd.startTangent === undefined && cmd.endTangent === undefined) {
    return replicad.makeBSplineApproximation(
      lifted as unknown as Parameters<typeof replicad.makeBSplineApproximation>[0],
      { tolerance: 1e-4, degMax: 3, degMin: 3 },
    );
  }
  // Tangent-constrained path. The 2D tangent direction is lifted onto the
  // plane via `liftDirection` (no origin translation — directions are
  // basis-relative).
  const startTangent2D = cmd.startTangent ?? deriveChordTangent2D(cmd.points, 'start');
  const endTangent2D = cmd.endTangent ?? deriveChordTangent2D(cmd.points, 'end');
  const startTangent3D = liftDirection(plane, startTangent2D.x.evaluated, startTangent2D.y.evaluated);
  const endTangent3D = liftDirection(plane, endTangent2D.x.evaluated, endTangent2D.y.evaluated);
  // `rationalInterpCurve` does NOT internally normalise tangent magnitude:
  // larger magnitudes produce more aggressive endpoint excursions. Scale
  // each tangent to the chord length between the corresponding endpoint and
  // its neighbour so the constraint magnitude is geometry-sensible
  // regardless of what units the caller provided.
  const startChord = vec3Distance(lifted[0], lifted[1]);
  const endChord = vec3Distance(lifted[lifted.length - 2], lifted[lifted.length - 1]);
  const startScaled = vec3Scale(vec3Normalise(startTangent3D), Math.max(1e-9, startChord));
  const endScaled = vec3Scale(vec3Normalise(endTangent3D), Math.max(1e-9, endChord));
  // `rationalInterpCurve` requires `points.length >= degree + 1`. Clamp the
  // requested cubic degree down when the waypoint count is too low. Degree
  // 2 needs ≥ 3 points; degree 1 needs ≥ 2. PathBuilder already rejected
  // the < 2 case, so this clamp is always safe.
  const interpDegree = Math.min(3, Math.max(1, lifted.length - 1));
  const data = nurbsJs.eval.Make.rationalInterpCurve(
    lifted as unknown as number[][],
    interpDegree,
    false,
    startScaled,
    endScaled,
  );
  const built = nurbsJs.geom.NurbsCurve.byKnotsControlPointsWeights(
    data.degree,
    data.knots,
    data.controlPoints.map((row) => [row[0], row[1], row[2]]),
  );
  return fromVerb(built);
}

/**
 * Lift a 2D direction vector onto the named axis-aligned plane. Mirrors
 * `liftCoord` but treats the input as a direction (no origin translation —
 * the plane normal passes through the world origin for XY / XZ / YZ).
 */
function liftDirection(plane: PlaneName, x: number, y: number): Vec3 {
  if (plane === 'XY') return [x, y, 0];
  if (plane === 'XZ') return [x, 0, y];
  return [0, x, y];
}

function vec3Distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function vec3Normalise(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]);
  if (m < 1e-12) return [0, 0, 0];
  return [v[0] / m, v[1] / m, v[2] / m];
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Fallback tangent for the one-sided-constraint case: use the chord between
 * the endpoint and its nearest neighbour. The result is a Param-shaped
 * 2D direction so it slots into the same lift pipeline as the user-supplied
 * tangent.
 */
function deriveChordTangent2D(
  points: Array<{ x: { evaluated: number }; y: { evaluated: number } }>,
  end: 'start' | 'end',
): { x: { evaluated: number }; y: { evaluated: number } } {
  if (end === 'start') {
    const dx = points[1].x.evaluated - points[0].x.evaluated;
    const dy = points[1].y.evaluated - points[0].y.evaluated;
    return { x: { evaluated: dx }, y: { evaluated: dy } };
  }
  const n = points.length;
  const dx = points[n - 1].x.evaluated - points[n - 2].x.evaluated;
  const dy = points[n - 1].y.evaluated - points[n - 2].y.evaluated;
  return { x: { evaluated: dx }, y: { evaluated: dy } };
}

/**
 * Lower a `SketchCommand[]` containing at least one NURBS segment into a
 * `replicad.Sketch` on the requested plane.
 *
 * Caller must have already validated the command list (non-empty, first is
 * moveTo, contains a `close`). This function only builds geometry — it does
 * not re-validate inputs.
 *
 * The returned Sketch has `defaultDirection` set to the plane's normal so the
 * consumer's `extrude(depth)` produces an axis-aligned solid; `revolve(axis)`
 * still takes an explicit axis argument as before.
 */
export function buildNurbsSketchOnPlane(
  commands: SketchCommand[],
  plane: PlaneName,
): replicad.Sketch {
  if (commands.length === 0) {
    throw new Error('buildNurbsSketchOnPlane: empty commands array.');
  }
  const closeIdx = commands.findIndex(c => c.kind === 'close');
  if (closeIdx === -1) {
    throw new Error('buildNurbsSketchOnPlane: missing close command.');
  }
  const first = commands[0];
  if (first.kind !== 'moveTo') {
    throw new Error('buildNurbsSketchOnPlane: first command must be moveTo.');
  }

  const startX = first.x.evaluated;
  const startY = first.y.evaluated;
  let currentX = startX;
  let currentY = startY;

  const edges: replicad.Edge[] = [];

  // Pen-run state. `pen` is null when no pen-run is open. When we hit a
  // pen-compatible command we (re)open a pen at the current (currentX,
  // currentY); when we hit a NURBS command we commit the pen-run by closing
  // it with `done()`, lifting onto the target plane, and harvesting its
  // edges.
  let pen: replicad.DrawingPen | null = null;

  function commitPenRun(): void {
    if (pen === null) return;
    const drawing = pen.done();
    // `Drawing.sketchOnPlane` lifts the 2D curves onto the target plane,
    // then assembles a wire. For an OPEN polyline (which is what `done()`
    // returns), the result is a `Sketch` whose wire is open — harvest its
    // edges.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lifted = drawing.sketchOnPlane(plane) as any;
    // For a single open polyline `sketchOnPlane` returns a `Sketch`, not
    // `Sketches`. Its `wires()` method (line 2062 of replicad.d.ts) returns
    // the underlying `Wire`.
    const wire: replicad.Wire = typeof lifted.wires === 'function' ? lifted.wires() : lifted.wire;
    for (const e of wire.edges) edges.push(e);
    pen = null;
  }

  function ensurePen(): replicad.DrawingPen {
    if (pen === null) {
      pen = replicad.draw([currentX, currentY]);
    }
    return pen;
  }

  for (let i = 1; i < closeIdx; i++) {
    const c = commands[i];
    if (c.kind === 'lineTo') {
      const p = ensurePen();
      pen = p.lineTo([c.x.evaluated, c.y.evaluated]) as replicad.DrawingPen;
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    } else if (c.kind === 'tangentArc') {
      const p = ensurePen();
      pen = p.tangentArcTo([c.x.evaluated, c.y.evaluated]) as replicad.DrawingPen;
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    } else if (c.kind === 'threePointsArc') {
      const p = ensurePen();
      pen = p.threePointsArcTo(
        [c.x.evaluated, c.y.evaluated],
        [c.midX.evaluated, c.midY.evaluated],
      ) as replicad.DrawingPen;
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    } else if (c.kind === 'sagittaArc') {
      const p = ensurePen();
      pen = p.sagittaArcTo([c.x.evaluated, c.y.evaluated], c.sagitta.evaluated) as replicad.DrawingPen;
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    } else if (c.kind === 'bulgeArc') {
      const p = ensurePen();
      pen = p.bulgeArcTo([c.x.evaluated, c.y.evaluated], c.bulge.evaluated) as replicad.DrawingPen;
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    } else if (c.kind === 'radiusArc') {
      // Convert radiusArc → sagittaArc via the same math as `fromSketchCommands`.
      const cx = c.x.evaluated;
      const cy = c.y.evaluated;
      const cr = c.radius.evaluated;
      const chord = Math.hypot(cx - currentX, cy - currentY);
      if (chord < 1e-9) {
        throw new Error(`radiusArc: degenerate chord (start ≈ end) at point (${cx}, ${cy})`);
      }
      if (Math.abs(cr) < chord / 2) {
        throw new Error(`radiusArc: radius (${cr}) too small for chord length ${chord.toFixed(3)} — needs |radius| >= chord/2`);
      }
      const halfChord = chord / 2;
      const sagittaMagnitude = Math.abs(cr) - Math.sqrt(cr * cr - halfChord * halfChord);
      const signedSagitta = Math.sign(cr) * sagittaMagnitude;
      const p = ensurePen();
      pen = p.sagittaArcTo([cx, cy], signedSagitta) as replicad.DrawingPen;
      currentX = cx;
      currentY = cy;
    } else if (c.kind === 'smoothSpline') {
      const p = ensurePen();
      pen = p.smoothSplineTo([c.x.evaluated, c.y.evaluated]) as replicad.DrawingPen;
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    } else if (c.kind === 'spline' || c.kind === 'nurbsSegment' || c.kind === 'hermiteG2_2d') {
      commitPenRun();
      let edge: replicad.Edge;
      if (c.kind === 'spline') {
        edge = buildSplineEdge(c, plane);
        const last = c.points[c.points.length - 1];
        currentX = last.x.evaluated;
        currentY = last.y.evaluated;
      } else if (c.kind === 'nurbsSegment') {
        edge = buildNurbsSegmentEdge(c, plane);
        const last = c.controlPoints[c.controlPoints.length - 1];
        currentX = last.x.evaluated;
        currentY = last.y.evaluated;
      } else {
        edge = buildHermiteG2Edge(c, plane);
        currentX = c.bx.evaluated;
        currentY = c.by.evaluated;
      }
      edges.push(edge);
    }
  }

  // Close the loop. If we have an open pen run, send it to the start point
  // before committing. Otherwise, add an explicit closing line edge from the
  // last NURBS endpoint back to the path start.
  const isAtStart = Math.hypot(currentX - startX, currentY - startY) < 1e-9;
  if (pen !== null) {
    if (!isAtStart) {
      pen = pen.lineTo([startX, startY]) as replicad.DrawingPen;
    }
    commitPenRun();
  } else if (!isAtStart) {
    const a = liftCoord(plane, currentX, currentY);
    const b = liftCoord(plane, startX, startY);
    edges.push(replicad.makeLine(
      a as unknown as Parameters<typeof replicad.makeLine>[0],
      b as unknown as Parameters<typeof replicad.makeLine>[1],
    ));
  }
  if (edges.length === 0) {
    throw new Error('buildNurbsSketchOnPlane: produced zero edges (degenerate path).');
  }

  // Compose all edges into a single closed wire. `replicad.assembleWire`
  // accepts mixed `(Edge | Wire)[]` and orients adjacent edges head-to-tail
  // — it will throw OCCT's wire-discontinuity error if endpoints don't match
  // within OCCT's default tolerance.
  const wire = replicad.assembleWire(edges);

  // Wrap as a `replicad.Sketch` on the target plane. Set `defaultDirection`
  // to the plane normal so `Sketch.extrude(depth)` produces an axis-aligned
  // solid; `revolve(axis)` already passes its axis explicitly so the default
  // direction is informational there.
  const planeNormal: Vec3 = plane === 'XY' ? [0, 0, 1] : plane === 'XZ' ? [0, 1, 0] : [1, 0, 0];
  return new replicad.Sketch(wire, {
    defaultOrigin: [0, 0, 0],
    defaultDirection: planeNormal,
  });
}
