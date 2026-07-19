// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/tangencySolver.ts
//
// Resolve 2D tangency constructions with OCCT's `Geom2dGcc_*` solvers.
//
// `PathBuilder.tangentCircle` / `.tangentLine` record a spec at capture time;
// this module is where it becomes geometry. It runs at LOWERING time because
// that is the only layer with `getOC()` — `modeling/capture/` is deliberately
// engine-free, and a capture-time solve would break every context that parses
// a script without an initialised kernel (codegen, studio, MCP analysis).
//
// The output is not a special shape: `resolveTangency` rewrites each tangency
// command into ordinary `moveTo`/`lineTo`/`threePointsArc` commands, exactly
// as `PathBuilder.circle()` desugars itself at capture time. Every existing
// consumer (replicad pen, NURBS lowerer, cutout validation) therefore keeps
// working untouched, and there is exactly one place where tangency geometry
// is computed.
//
// ── THE SELECTION RULE ────────────────────────────────────────────────────
// These solvers return N solutions, not one (a circle of radius r tangent to
// two perpendicular lines has FOUR — one per quadrant). Picking `ThisSolution(1)`
// and hoping is the bug this rule exists to prevent. In order:
//
//   1. Each entity's `side` becomes a `GccEnt_Position` qualifier on its
//      `Geom2dGcc_QualifiedCurve`. This is the primary filter and it happens
//      INSIDE OCCT — the solver only ever enumerates solutions that satisfy
//      it. Default `'outside'` collapses the two-perpendicular-lines case from
//      4 solutions to 1 on its own.
//   2. If `near` was supplied, score every remaining solution by distance from
//      `near` — to the circle's CENTRE for `tangentCircle`, to the infinite
//      line for `tangentLine` — and keep the minimum. If the two best scores
//      are within TANGENCY_TIE_EPSILON the hint did not actually discriminate,
//      and we report ambiguity rather than let float noise choose.
//   3. If exactly one solution remains, that is the answer.
//   4. Otherwise FAIL with `sketch.tangency.ambiguous`, listing every
//      candidate, and tell the author to add `near` or tighten `side`.
//
// Step 4 is the point of the whole design: an ambiguous construction is an
// authoring error, and silently resolving it would produce a profile that
// looks right in one revision and flips in the next.
//
// ── HOW "NO SOLUTION" ARRIVES ─────────────────────────────────────────────
// NOT (only) as `IsDone() == false`. Measured against the bundled wasm: two
// parallel lines 20 apart with radius 5 — a construction with provably no
// answer — returns `IsDone() == true` and `NbSolutions() == 0`. Checking
// `IsDone()` alone would sail past it and then throw on `ThisSolution(1)`.
// Both conditions are checked, and both surface as
// `sketch.tangency.no-solution` naming the geometric reason.
//
// Worth knowing before writing a test around it: `Circ2d2TanRad` reports zero
// solutions for two PARALLEL lines at EVERY radius and every qualifier
// combination, including a radius that exactly fits between them. That is an
// OCCT limitation, not a kernelCAD one, and it is why the no-solution
// diagnostic leads with the parallel-lines case.

import { getOC } from 'replicad';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import {
  TANGENCY_TOLERANCE,
  TANGENCY_TIE_EPSILON,
  type TangentEntitySpec,
  type TangentNearSpec,
  type TangentSide,
} from '../../../shared/capture/tangency';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Message prefix on every error this module throws. `occtLowerer` matches it
 * to route the failure to the `sketch.tangency.*` diagnostic codes instead of
 * the generic `feature.kernel-failed` bucket — the same mechanism the
 * `radiusArc:` prefix already uses for degenerate arcs.
 */
export const TANGENCY_ERROR_PREFIX = 'tangency:';

/** Sub-classifier appended after the prefix so the lowerer can distinguish
 *  "no such geometry exists" from "you did not say which one you meant". */
export type TangencyFailureKind = 'no-solution' | 'ambiguous';

export class TangencyError extends Error {
  readonly failureKind: TangencyFailureKind;
  constructor(failureKind: TangencyFailureKind, detail: string) {
    super(`${TANGENCY_ERROR_PREFIX} ${failureKind}: ${detail}`);
    this.name = 'TangencyError';
    this.failureKind = failureKind;
  }
}

/** Map a kernelCAD `side` onto the OCCT enum value. */
function gccPosition(oc: any, side: TangentSide): unknown {
  switch (side) {
    case 'outside': return oc.GccEnt_Position.GccEnt_outside;
    case 'enclosed': return oc.GccEnt_Position.GccEnt_enclosed;
    case 'enclosing': return oc.GccEnt_Position.GccEnt_enclosing;
    case 'unqualified': return oc.GccEnt_Position.GccEnt_unqualified;
  }
}

/** Human-readable entity description, used in every failure message so the
 *  author can see which input made the construction impossible. */
function describeEntity(e: TangentEntitySpec): string {
  return e.kind === 'line'
    ? `line (${e.x1.evaluated}, ${e.y1.evaluated})->(${e.x2.evaluated}, ${e.y2.evaluated}) [${e.side}]`
    : `circle centre (${e.cx.evaluated}, ${e.cy.evaluated}) r=${e.r.evaluated} [${e.side}]`;
}

/**
 * Build the `Geom2dGcc_QualifiedCurve` for one entity, plus the list of OCCT
 * objects that must be freed afterwards.
 *
 * Overload notes worth keeping (each of these throws a runtime type error if
 * you guess wrong — the .d.ts numbering is not intuitive):
 *   `Geom2d_Line_2`   takes a gp_Lin2d.  `Geom2d_Line_1` takes a gp_Ax2d.
 *   `Geom2d_Circle_1` takes a gp_Circ2d. `gp_Circ2d_3` takes (gp_Ax22d, R).
 *   `Geom2dAdaptor_Curve_2` takes a Handle_Geom2d_Curve.
 */
//
// OWNERSHIP — read before adding a `.delete()` here. Only objects this module
// owns outright go into `owned`: the adaptors, the qualified curves, the
// solver, and any gp_Pnt2d WE allocate as an out-param. Deliberately NOT freed:
//   * the gp_* / Geom2d_* inputs, which the Handle_Geom2d_Curve refcounts —
//     deleting both the raw curve and its handle is a double free;
//   * anything returned by an accessor (`Location()`, `Direction()`), which
//     embind wraps as a REFERENCE into memory OCCT still owns.
// Both mistakes corrupt the wasm heap silently: the first two tests in this
// module's suite still passed, and the *third* died with "memory access out of
// bounds" inside an unrelated gp_Pnt2d constructor. This matches the local
// convention in surfaceTrimLowerer/sheetMetalLowerer, which free algorithm
// objects and leave value wrappers alone.
function qualifiedCurve(oc: any, e: TangentEntitySpec, owned: any[]): any {
  let geom: any;
  if (e.kind === 'line') {
    const dx = e.x2.evaluated - e.x1.evaluated;
    const dy = e.y2.evaluated - e.y1.evaluated;
    if (Math.hypot(dx, dy) < TANGENCY_TIE_EPSILON) {
      throw new TangencyError(
        'no-solution',
        `a tangency line entity has coincident from/to points (${e.x1.evaluated}, ${e.y1.evaluated}) — it defines no direction.`,
      );
    }
    const origin = new oc.gp_Pnt2d_3(e.x1.evaluated, e.y1.evaluated);
    const dir = new oc.gp_Dir2d_4(dx, dy);
    const lin = new oc.gp_Lin2d_3(origin, dir);
    geom = new oc.Geom2d_Line_2(lin);
  } else {
    if (!(e.r.evaluated > 0)) {
      throw new TangencyError(
        'no-solution',
        `a tangency circle entity has non-positive radius ${e.r.evaluated}.`,
      );
    }
    const centre = new oc.gp_Pnt2d_3(e.cx.evaluated, e.cy.evaluated);
    const xdir = new oc.gp_Dir2d_4(1, 0);
    const ax = new oc.gp_Ax22d_3(centre, xdir, true);
    const circ = new oc.gp_Circ2d_3(ax, e.r.evaluated);
    geom = new oc.Geom2d_Circle_1(circ);
  }
  const handle = new oc.Handle_Geom2d_Curve_2(geom);
  const adaptor = new oc.Geom2dAdaptor_Curve_2(handle);
  const qual = new oc.Geom2dGcc_QualifiedCurve(adaptor, gccPosition(oc, e.side));
  owned.push(adaptor, qual);
  return qual;
}

/**
 * Run an OCCT `Geom2dGcc_*` constructor, converting a raw wasm abort into a
 * diagnosable failure.
 *
 * These constructors do not always throw a JS `Error`: some qualifier
 * combinations (`side: 'enclosing'` on a line, measured) abort out of C++ and
 * surface in JS as a bare NUMBER — an exception pointer. Left alone it escapes
 * every `instanceof Error` check between here and the lowerer and reaches the
 * agent as `[object Number]`, so it is caught and named at the source.
 */
function runSolver<T>(build: () => T, listed: string): T {
  try {
    return build();
  } catch (e) {
    if (e instanceof TangencyError) throw e;
    const detail = e instanceof Error ? e.message : `OCCT aborted (exception ${String(e)})`;
    throw new TangencyError(
      'no-solution',
      `the Geom2dGcc solver rejected this construction outright on ${listed}: ${detail}. ` +
      `The usual cause is a 'side' qualifier the solver does not accept for that entity type — ` +
      `'enclosing' is meaningless for a line, which has no interior. Use 'outside', 'enclosed', or 'unqualified'.`,
    );
  }
}

/** LIFO, so a container is destroyed before anything it may reference. */
function freeAll(owned: any[]): void {
  for (const o of owned.slice().reverse()) {
    try { o?.delete?.(); } catch { /* already freed / not owned */ }
  }
}

/** One solved circle, in plain numbers — OCCT handles never escape this file. */
export interface SolvedCircle { cx: number; cy: number; r: number }
/** One solved tangent line, as the two tangency points. */
export interface SolvedTangentLine { t1: [number, number]; t2: [number, number] }

/**
 * Apply steps 2-4 of the selection rule to an already-qualifier-filtered
 * candidate list. `score` is the distance from the `near` hint; callers pass
 * `undefined` when no hint was given.
 */
function pickSolution<T>(
  candidates: T[],
  describe: (t: T) => string,
  score: ((t: T) => number) | undefined,
  what: string,
): T {
  if (candidates.length === 1) return candidates[0];

  if (score) {
    const scored = candidates
      .map((c) => ({ c, d: score(c) }))
      .sort((a, b) => a.d - b.d);
    // A hint that cannot separate the top two has not disambiguated anything.
    if (scored.length > 1 && Math.abs(scored[1].d - scored[0].d) < TANGENCY_TIE_EPSILON) {
      throw new TangencyError(
        'ambiguous',
        `${what}: the 'near' hint is equidistant from ${scored.length} solutions ` +
        `(${candidates.map(describe).join('; ')}). Move 'near' toward the solution you want, or tighten the 'side' qualifiers.`,
      );
    }
    return scored[0].c;
  }

  throw new TangencyError(
    'ambiguous',
    `${what}: ${candidates.length} solutions satisfy the given 'side' qualifiers ` +
    `(${candidates.map(describe).join('; ')}). Pass 'near: [x, y]' to select one, or tighten 'side' on the entities.`,
  );
}

/**
 * Circle tangent to two entities with a given radius (Geom2dGcc_Circ2d2TanRad)
 * or to three entities (Geom2dGcc_Circ2d3Tan).
 */
export function solveTangentCircle(
  entities: readonly TangentEntitySpec[],
  radius: number | undefined,
  near: [number, number] | undefined,
): SolvedCircle {
  const oc = getOC() as any;
  const owned: any[] = [];
  try {
    const quals = entities.map((e) => qualifiedCurve(oc, e, owned));
    const listed = entities.map(describeEntity).join('; ');

    const solver: any = runSolver(() => (
      quals.length === 2
        // radius presence is validated at capture time; assert rather than guess.
        ? new oc.Geom2dGcc_Circ2d2TanRad_1(quals[0], quals[1], radius as number, TANGENCY_TOLERANCE)
        // Param1/2/3 are approximate-parameter seeds on each curve. For the
        // analytic curves we accept (line, circle) OCCT routes through GccAna
        // and enumerates every solution regardless, so 0 is a safe seed.
        : new oc.Geom2dGcc_Circ2d3Tan_1(quals[0], quals[1], quals[2], TANGENCY_TOLERANCE, 0, 0, 0)
    ), listed);
    owned.push(solver);

    // BOTH checks are load-bearing — see the header note: an impossible
    // construction commonly reports IsDone()==true with zero solutions.
    if (!solver.IsDone()) {
      throw new TangencyError(
        'no-solution',
        `the Geom2dGcc circle solver did not converge on ${listed}` +
        (radius !== undefined ? ` at radius ${radius}` : '') + '.',
      );
    }
    const n = solver.NbSolutions();
    if (n === 0) {
      throw new TangencyError(
        'no-solution',
        radius !== undefined
          ? `no circle of radius ${radius} is tangent to all of: ${listed}. ` +
            `The classic cause is a radius too small to bridge the entities (e.g. two parallel lines further apart than 2*radius) ` +
            `or 'side' qualifiers that describe a configuration which cannot exist.`
          : `no circle is tangent to all of: ${listed}. Concentric or coincident entities, or contradictory 'side' qualifiers, admit no solution.`,
      );
    }

    const candidates: SolvedCircle[] = [];
    for (let i = 1; i <= n; i++) {              // OCCT indices are 1-BASED
      const c = solver.ThisSolution(i);
      const loc = c.Location();
      candidates.push({ cx: loc.X(), cy: loc.Y(), r: c.Radius() });
    }

    return pickSolution(
      candidates,
      (c) => `centre (${c.cx.toFixed(6)}, ${c.cy.toFixed(6)}) r=${c.r.toFixed(6)}`,
      near ? (c) => Math.hypot(c.cx - near[0], c.cy - near[1]) : undefined,
      'tangentCircle',
    );
  } finally {
    freeAll(owned);
  }
}

/**
 * Line tangent to two circles (Geom2dGcc_Lin2d2Tan) — the belt/pulley move.
 * Returns the two tangency points, which bound the useful segment.
 */
export function solveTangentLine(
  a: TangentEntitySpec,
  b: TangentEntitySpec,
  near: [number, number] | undefined,
): SolvedTangentLine {
  const oc = getOC() as any;
  const owned: any[] = [];
  try {
    const qa = qualifiedCurve(oc, a, owned);
    const qb = qualifiedCurve(oc, b, owned);
    const listed = `${describeEntity(a)}; ${describeEntity(b)}`;

    const solver = runSolver(() => new oc.Geom2dGcc_Lin2d2Tan_1(qa, qb, TANGENCY_TOLERANCE), listed);
    owned.push(solver);

    if (!solver.IsDone()) {
      throw new TangencyError('no-solution', `the Geom2dGcc line solver did not converge on ${listed}.`);
    }
    const n = solver.NbSolutions();
    if (n === 0) {
      throw new TangencyError(
        'no-solution',
        `no line is tangent to both of: ${listed}. An outside/outside tangent line does not exist when one circle ` +
        `contains the other, and no tangent line at all exists for coincident circles.`,
      );
    }

    // Solution geometry plus the two tangency points. `Tangency1/2` write
    // their gp_Pnt2d out-param in place; the two Standard_Real& out-params
    // are passed as `{ current: 0 }` boxes, which is how embind surfaces
    // primitive references (verified against the bundled wasm).
    interface LineCand { t1: [number, number]; t2: [number, number]; lx: number; ly: number; dx: number; dy: number }
    const candidates: LineCand[] = [];
    for (let i = 1; i <= n; i++) {
      const lin = solver.ThisSolution(i);
      const loc = lin.Location();
      const dir = lin.Direction();
      const p1 = new oc.gp_Pnt2d_1();
      const p2 = new oc.gp_Pnt2d_1();
      owned.push(p1, p2);
      const parSol = { current: 0 };
      const parArg = { current: 0 };
      solver.Tangency1(i, parSol, parArg, p1);
      solver.Tangency2(i, parSol, parArg, p2);
      candidates.push({
        t1: [p1.X(), p1.Y()],
        t2: [p2.X(), p2.Y()],
        lx: loc.X(), ly: loc.Y(), dx: dir.X(), dy: dir.Y(),
      });
    }

    // `near` scores distance to the INFINITE line (perpendicular distance),
    // not to a tangency point: for a belt the author is pointing at the side
    // of the pulley pair they want, not at a specific contact point.
    const picked = pickSolution(
      candidates,
      (c) => `tangency points (${c.t1[0].toFixed(6)}, ${c.t1[1].toFixed(6)}) -> (${c.t2[0].toFixed(6)}, ${c.t2[1].toFixed(6)})`,
      near ? (c) => Math.abs((near[0] - c.lx) * c.dy - (near[1] - c.ly) * c.dx) : undefined,
      'tangentLine',
    );
    return { t1: picked.t1, t2: picked.t2 };
  } finally {
    freeAll(owned);
  }
}

/** Wrap a solved number as a Param the downstream pen can read. Solved
 *  coordinates are concrete by construction — a tangency result cannot stay
 *  symbolic, exactly as `Sketch.reflect` collapses ParamRefs. */
function num(v: number): { expression: string; unit: 'mm'; evaluated: number } {
  return { expression: String(v), unit: 'mm', evaluated: v };
}

function nearOf(spec: TangentNearSpec | undefined): [number, number] | undefined {
  return spec ? [spec.x.evaluated, spec.y.evaluated] : undefined;
}

/**
 * Rewrite every tangency command in `commands` into primitive commands.
 * Returns the input array unchanged (same reference) when there is nothing to
 * resolve, so the common path pays no allocation and no OCCT call.
 *
 * Call this at the top of any function that consumes a SketchCommand[] as
 * geometry. Everything after it sees only kinds that predate this feature.
 */
export function resolveTangency(commands: readonly SketchCommand[]): SketchCommand[] {
  if (!commands.some((c) => c.kind === 'tangentCircle' || c.kind === 'tangentLine')) {
    return commands as SketchCommand[];
  }

  const out: SketchCommand[] = [];
  for (const c of commands) {
    if (c.kind === 'tangentCircle') {
      const { cx, cy, r } = solveTangentCircle(
        c.entities,
        c.radius?.evaluated,
        nearOf(c.near),
      );
      // Exact circle as two semicircular threePointsArcs — not a polyline.
      // `PathBuilder.circle` approximates with 48 chords because it has no
      // kernel available at capture time; here the arcs are exact and every
      // downstream consumer already handles threePointsArc.
      out.push({ kind: 'moveTo', x: num(cx + r), y: num(cy) });
      out.push({ kind: 'threePointsArc', x: num(cx - r), y: num(cy), midX: num(cx), midY: num(cy + r) });
      out.push({ kind: 'threePointsArc', x: num(cx + r), y: num(cy), midX: num(cx), midY: num(cy - r) });
    } else if (c.kind === 'tangentLine') {
      const { t1, t2 } = solveTangentLine(c.a, c.b, nearOf(c.near));
      // When the pen already exists we join it to the first tangency point
      // with a straight run, then draw the tangent span itself. Documented on
      // the PathBuilder method: a tangentLine after another segment inserts a
      // connecting line, it does not teleport.
      out.push({ kind: c.startsPath ? 'moveTo' : 'lineTo', x: num(t1[0]), y: num(t1[1]) });
      out.push({ kind: 'lineTo', x: num(t2[0]), y: num(t2[1]) });
    } else {
      out.push(c);
    }
  }
  return out;
}
