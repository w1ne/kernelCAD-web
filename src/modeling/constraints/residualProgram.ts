// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Turns a sketch (entities + constraints) into a flat nonlinear least-squares
// problem: a vector of unknowns X (the free point coordinates, plus the radius
// of any circle a RADIUS constraint drives) and a list of scalar residual
// functions r(X) that are all zero exactly when every constraint holds.
//
// Residuals are normalised so one tolerance suits all of them: lengths are in
// sketch units, angle-type quantities are dimensionless (radians, sin, cos).
import type { Constraint, ConstraintType, SketchEntity, SolverState } from "./types";

export type Evaluator = (X: Float64Array, out: Float64Array) => void;

/** A point: variable indices for its free coordinates (-1 when fixed) and its
 *  initial / fixed coordinates. */
export interface PRef { ix: number; iy: number; x0: number; y0: number }
export interface LRef { a: PRef; b: PRef }
/** A circle: its centre, and the variable index of its radius (-1 = constant). */
export interface CRef { c: PRef; ir: number; r0: number }
type Ref = PRef | LRef | CRef;

export interface CompiledConstraint {
    /** Number of scalar residuals this constraint contributes. */
    n: number;
    /** Offset of its first residual in the global residual vector. */
    row: number;
    /** Distinct variable indices its residuals depend on, ascending. */
    vars: number[];
    evaluate: Evaluator;
    /** n x vars.length Jacobian block, refreshed every iteration. */
    block: Float64Array;
    /** True when the block is constant (linear residuals) and was filled
     *  analytically at compile time, so it is never re-estimated. */
    exact: boolean;
}

export interface Program {
    x0: number[];
    /** Writes variable i back into its entity. */
    writers: Array<(value: number) => void>;
    constraints: CompiledConstraint[];
    residualCount: number;
}

type Put = (i: number, variable: number, value: number) => void;
type LinearBlock = (put: Put) => void;

export const gx = (X: Float64Array, p: PRef): number => (p.ix >= 0 ? X[p.ix] : p.x0);
export const gy = (X: Float64Array, p: PRef): number => (p.iy >= 0 ? X[p.iy] : p.y0);
export const gr = (X: Float64Array, c: CRef): number => (c.ir >= 0 ? X[c.ir] : c.r0);

/** Wrap an angle difference into [-PI, PI]. */
function wrapAngle(a: number): number {
    return a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
}

/** Guard divisions by a (near-)zero length. */
const safeLen = (v: number): number => (v < 1e-12 ? 1e-12 : v);

function lineVector(X: Float64Array, l: LRef): [number, number] {
    return [gx(X, l.b) - gx(X, l.a), gy(X, l.b) - gy(X, l.a)];
}

function collectVars(refs: Ref[]): number[] {
    const out = new Set<number>();
    const addPoint = (p: PRef) => {
        if (p.ix >= 0) out.add(p.ix);
        if (p.iy >= 0) out.add(p.iy);
    };
    for (const r of refs) {
        if ('a' in r) { addPoint(r.a); addPoint(r.b); }
        else if ('c' in r) { addPoint(r.c); if (r.ir >= 0) out.add(r.ir); }
        else addPoint(r);
    }
    return [...out].sort((a, b) => a - b);
}

class ProgramBuilder {
    readonly entities: Map<string, SketchEntity>;
    readonly x0: number[] = [];
    readonly writers: Array<(value: number) => void> = [];
    readonly constraints: CompiledConstraint[] = [];
    residualCount = 0;
    private readonly points = new Map<string, PRef>();
    private readonly circles = new Map<string, CRef>();
    private readonly radiusDriven = new Set<string>();

    constructor(state: SolverState) {
        this.entities = state.entities;
        for (const c of state.constraints) {
            if (c.type === 'RADIUS' && c.entities.length === 1 && c.value !== undefined) {
                this.radiusDriven.add(c.entities[0]);
            }
        }
    }

    private newVar(initial: number, write: (value: number) => void): number {
        this.x0.push(initial);
        this.writers.push(write);
        return this.x0.length - 1;
    }

    point(id: string): PRef | null {
        const cached = this.points.get(id);
        if (cached) return cached;
        const e = this.entities.get(id);
        if (e?.type !== 'POINT') return null;
        const ref: PRef = {
            ix: e.fixed ? -1 : this.newVar(e.x, v => { e.x = v; }),
            iy: e.fixed ? -1 : this.newVar(e.y, v => { e.y = v; }),
            x0: e.x,
            y0: e.y,
        };
        this.points.set(id, ref);
        return ref;
    }

    line(id: string): LRef | null {
        const e = this.entities.get(id);
        if (e?.type !== 'LINE') return null;
        const a = this.point(e.p1);
        const b = this.point(e.p2);
        return a && b ? { a, b } : null;
    }

    circle(id: string): CRef | null {
        const cached = this.circles.get(id);
        if (cached) return cached;
        const e = this.entities.get(id);
        if (e?.type !== 'CIRCLE') return null;
        const c = this.point(e.center);
        if (!c) return null;
        const ref: CRef = {
            c,
            ir: this.radiusDriven.has(id) ? this.newVar(e.radius, v => { e.radius = v; }) : -1,
            r0: e.radius,
        };
        this.circles.set(id, ref);
        return ref;
    }

    /** Register `n` residuals over `refs`. `linear`, when given, declares them
     *  linear and reports their exact constant partials via
     *  `put(residualIndex, variableIndex, value)`; a fixed coordinate has no
     *  variable (index -1) and is ignored. */
    add(n: number, refs: Ref[], evaluate: Evaluator, linear?: LinearBlock): void {
        const vars = collectVars(refs);
        const block = new Float64Array(n * vars.length);
        linear?.((i, variable, value) => {
            if (variable >= 0) block[i * vars.length + vars.indexOf(variable)] += value;
        });
        this.constraints.push({ n, row: this.residualCount, vars, evaluate, block, exact: linear !== undefined });
        this.residualCount += n;
    }

    toProgram(): Program {
        return { x0: this.x0, writers: this.writers, constraints: this.constraints, residualCount: this.residualCount };
    }
}

type Handler = (b: ProgramBuilder, c: Constraint) => void;

function pointPair(b: ProgramBuilder, c: Constraint): [PRef, PRef] | null {
    if (c.entities.length !== 2) return null;
    const p = b.point(c.entities[0]);
    const q = b.point(c.entities[1]);
    return p && q ? [p, q] : null;
}

function linePair(b: ProgramBuilder, c: Constraint): [LRef, LRef] | null {
    if (c.entities.length !== 2) return null;
    const l1 = b.line(c.entities[0]);
    const l2 = b.line(c.entities[1]);
    return l1 && l2 ? [l1, l2] : null;
}

function circlePair(b: ProgramBuilder, ids: string[]): [CRef, CRef] | null {
    const c1 = b.circle(ids[0]);
    const c2 = b.circle(ids[1]);
    return c1 && c2 ? [c1, c2] : null;
}

const coincident: Handler = (b, c) => {
    const pair = pointPair(b, c);
    if (!pair) return;
    const [p, q] = pair;
    b.add(2, [p, q],
        (X, o) => { o[0] = gx(X, q) - gx(X, p); o[1] = gy(X, q) - gy(X, p); },
        put => { put(0, q.ix, 1); put(0, p.ix, -1); put(1, q.iy, 1); put(1, p.iy, -1); });
};

const distance: Handler = (b, c) => {
    const pair = pointPair(b, c);
    if (!pair || c.value === undefined) return;
    const [p, q] = pair;
    const target = c.value;
    b.add(1, [p, q], (X, o) => { o[0] = Math.hypot(gx(X, q) - gx(X, p), gy(X, q) - gy(X, p)) - target; });
};

/** HORIZONTAL equates the Y coordinates, VERTICAL the X coordinates. */
const aligned = (axis: 'x' | 'y'): Handler => (b, c) => {
    const pair = pointPair(b, c);
    if (!pair) return;
    const [p, q] = pair;
    const get = axis === 'x' ? gx : gy;
    const slot = (r: PRef) => (axis === 'x' ? r.ix : r.iy);
    b.add(1, [p, q], (X, o) => { o[0] = get(X, q) - get(X, p); },
        put => { put(0, slot(q), 1); put(0, slot(p), -1); });
};

/** sin(theta) between two lines (parallel) or cos(theta) (perpendicular):
 *  dimensionless, independent of the line lengths. */
const lineRelation = (perpendicular: boolean): Handler => (b, c) => {
    const pair = linePair(b, c);
    if (!pair) return;
    const [l1, l2] = pair;
    b.add(1, [l1, l2], (X, o) => {
        const [dx1, dy1] = lineVector(X, l1);
        const [dx2, dy2] = lineVector(X, l2);
        const scale = safeLen(Math.hypot(dx1, dy1)) * safeLen(Math.hypot(dx2, dy2));
        o[0] = (perpendicular ? dx1 * dx2 + dy1 * dy2 : dx1 * dy2 - dx2 * dy1) / scale;
    });
};

const equalLength: Handler = (b, c) => {
    const pair = linePair(b, c);
    if (!pair) return;
    const [l1, l2] = pair;
    b.add(1, [l1, l2], (X, o) => {
        const [dx1, dy1] = lineVector(X, l1);
        const [dx2, dy2] = lineVector(X, l2);
        o[0] = Math.hypot(dx1, dy1) - Math.hypot(dx2, dy2);
    });
};

/** External tangency of two circles: centre distance = r1 + r2. */
function tangentCircles(b: ProgramBuilder, ids: string[]): void {
    const pair = circlePair(b, ids);
    if (!pair) return;
    const [c1, c2] = pair;
    b.add(1, [c1, c2], (X, o) => {
        o[0] = Math.hypot(gx(X, c2.c) - gx(X, c1.c), gy(X, c2.c) - gy(X, c1.c)) - (gr(X, c1) + gr(X, c2));
    });
}

/** Circle tangent to a line: centre-to-line distance = radius, kept on the
 *  side of the line the circle starts on (the +normal when it starts exactly on
 *  the line) so |distance| needs no kink. */
function tangentCircleLine(b: ProgramBuilder, circleId: string, lineId: string): void {
    const ci = b.circle(circleId);
    const li = b.line(lineId);
    if (!ci || !li) return;
    const signedDistance = (X: Float64Array): number => {
        const [dx, dy] = lineVector(X, li);
        return ((gx(X, ci.c) - gx(X, li.a)) * -dy + (gy(X, ci.c) - gy(X, li.a)) * dx) / safeLen(Math.hypot(dx, dy));
    };
    const side = signedDistance(Float64Array.from(b.x0)) < 0 ? -1 : 1;
    b.add(1, [ci, li], (X, o) => { o[0] = side * signedDistance(X) - gr(X, ci); });
}

const tangent: Handler = (b, c) => {
    if (c.entities.length !== 2) return;
    const [id1, id2] = c.entities;
    const t1 = b.entities.get(id1)?.type;
    const t2 = b.entities.get(id2)?.type;
    if (t1 === 'CIRCLE' && t2 === 'CIRCLE') tangentCircles(b, c.entities);
    else if (t1 === 'CIRCLE' && t2 === 'LINE') tangentCircleLine(b, id1, id2);
    else if (t1 === 'LINE' && t2 === 'CIRCLE') tangentCircleLine(b, id2, id1);
};

const radius: Handler = (b, c) => {
    if (c.entities.length !== 1 || c.value === undefined) return;
    const ci = b.circle(c.entities[0]);
    if (!ci) return;
    const target = c.value;
    b.add(1, [ci], (X, o) => { o[0] = gr(X, ci) - target; });
};

/** Angle of one line against the +X axis. */
function absoluteAngle(b: ProgramBuilder, lineId: string, target: number): void {
    const l = b.line(lineId);
    if (!l) return;
    b.add(1, [l], (X, o) => {
        const [dx, dy] = lineVector(X, l);
        o[0] = wrapAngle(Math.atan2(dy, dx) - target);
    });
}

/** Angle between two lines. The angle between two lines is unsigned; keep the
 *  orientation the pair starts in so the residual has no sign flip mid-solve. */
function angleBetween(b: ProgramBuilder, c: Constraint, target: number): void {
    const pair = linePair(b, c);
    if (!pair) return;
    const [l1, l2] = pair;
    const signedAngle = (X: Float64Array): number => {
        const [dx1, dy1] = lineVector(X, l1);
        const [dx2, dy2] = lineVector(X, l2);
        return Math.atan2(dx1 * dy2 - dx2 * dy1, dx1 * dx2 + dy1 * dy2);
    };
    const orientation = signedAngle(Float64Array.from(b.x0)) < 0 ? -1 : 1;
    b.add(1, [l1, l2], (X, o) => { o[0] = wrapAngle(signedAngle(X) - orientation * target); });
}

const angle: Handler = (b, c) => {
    if (c.value === undefined) return;
    const target = c.value * (Math.PI / 180);
    if (c.entities.length === 1) absoluteAngle(b, c.entities[0], target);
    else if (c.entities.length === 2) angleBetween(b, c, target);
};

const concentric: Handler = (b, c) => {
    if (c.entities.length !== 2) return;
    const pair = circlePair(b, c.entities);
    if (!pair) return;
    const [c1, c2] = pair;
    b.add(2, [c1, c2],
        (X, o) => { o[0] = gx(X, c2.c) - gx(X, c1.c); o[1] = gy(X, c2.c) - gy(X, c1.c); },
        put => { put(0, c2.c.ix, 1); put(0, c1.c.ix, -1); put(1, c2.c.iy, 1); put(1, c1.c.iy, -1); });
};

/** q must be the reflection of p across the axis line. */
const symmetric: Handler = (b, c) => {
    if (c.entities.length !== 3) return;
    const p = b.point(c.entities[0]);
    const q = b.point(c.entities[1]);
    const axis = b.line(c.entities[2]);
    if (!p || !q || !axis) return;
    b.add(2, [p, q, axis], (X, o) => {
        const ax = gx(X, axis.a);
        const ay = gy(X, axis.a);
        const [dx, dy] = lineVector(X, axis);
        const lenSq = dx * dx + dy * dy;
        const px = gx(X, p);
        const py = gy(X, p);
        const t = lenSq < 1e-12 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
        o[0] = 2 * (ax + t * dx) - px - gx(X, q);
        o[1] = 2 * (ay + t * dy) - py - gy(X, q);
    });
};

const HANDLERS: Record<ConstraintType, Handler> = {
    COINCIDENT: coincident,
    DISTANCE: distance,
    HORIZONTAL: aligned('y'),
    VERTICAL: aligned('x'),
    PARALLEL: lineRelation(false),
    PERPENDICULAR: lineRelation(true),
    EQUAL_LENGTH: equalLength,
    TANGENT: tangent,
    RADIUS: radius,
    ANGLE: angle,
    CONCENTRIC: concentric,
    SYMMETRIC: symmetric,
};

/** Compile the constraint list into scalar residual functions. Constraints that
 *  reference missing / wrongly-typed entities, or that are malformed, contribute
 *  no residuals (they were silently inert before too; input validation reports
 *  them). */
export function compileConstraints(state: SolverState): Program {
    const builder = new ProgramBuilder(state);
    for (const c of state.constraints) HANDLERS[c.type]?.(builder, c);
    return builder.toProgram();
}

export function evaluateResiduals(prog: Program, X: Float64Array, r: Float64Array, scratch: Float64Array): void {
    for (const c of prog.constraints) {
        c.evaluate(X, scratch);
        for (let i = 0; i < c.n; i++) r[c.row + i] = scratch[i];
    }
}

/** Refresh every non-linear constraint's Jacobian block by forward finite
 *  differences over just the variables that constraint touches (the matrix is
 *  sparse). Linear constraints keep their exact analytic block. */
export function evaluateJacobian(prog: Program, X: Float64Array, r: Float64Array, scratch: Float64Array): void {
    for (const c of prog.constraints) {
        if (c.exact) continue;
        const k = c.vars.length;
        for (let j = 0; j < k; j++) {
            const v = c.vars[j];
            const saved = X[v];
            const h = 1e-7 * Math.max(1, Math.abs(saved));
            X[v] = saved + h;
            c.evaluate(X, scratch);
            X[v] = saved;
            for (let i = 0; i < c.n; i++) c.block[i * k + j] = (scratch[i] - r[c.row + i]) / h;
        }
    }
}

/** Largest absolute entry (NaN-propagating, so a broken residual is never "small"). */
export function maxAbs(v: Float64Array): number {
    let m = 0;
    for (let i = 0; i < v.length; i++) {
        const a = Math.abs(v[i]);
        if (a > m || Number.isNaN(a)) m = a;
    }
    return m;
}

export function dot(a: Float64Array, b: Float64Array): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}
