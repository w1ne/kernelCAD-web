// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SolverState } from "./types";
import {
    compileConstraints, dot, evaluateJacobian, evaluateResiduals, maxAbs, type Program,
} from "./residualProgram";
import {
    assembleNormalEquations, buildSkyline, factorSkyline, jacobianRank, skylineDiagonal, solveSkyline,
    type Skyline,
} from "./normalEquations";

/** Newton stop criterion: the solve is finished once the largest scalar
 *  residual is below this. */
export const CONSTRAINT_RESIDUAL_TOL = 1e-10;

/** Tolerance for the CONVERGENCE VERDICT (`converged`), applied to the largest
 *  scalar residual (`residual`).
 *
 *  Every scalar residual the solver builds is either a length (sketch units) or
 *  a dimensionless angle quantity (radians, sin, cos), so one absolute
 *  tolerance is meaningful for all of them. It is an engineering tolerance, not
 *  a numerical one: a satisfiable system lands ~7 orders of magnitude below it
 *  (Newton converges quadratically), a contradictory one plateaus far above it,
 *  and only an over-constrained set that is *nearly* consistent sits in
 *  between. The rocket-keychain fixture is one: its mirrored fin implies an
 *  angle of -31.9734 deg while the sketch also demands -32 deg, a 4.6e-4 rad
 *  conflict. That is a usable sketch, so it must not be rejected; the conflict
 *  is still visible in `residual` and `dependentEquations`. */
export const SKETCH_CONVERGENCE_RESIDUAL_TOL = 1e-3;

export interface ConstraintSolveResult {
    /** True when the largest scalar residual fell below
     *  `SKETCH_CONVERGENCE_RESIDUAL_TOL`. False means the constraints could not
     *  be satisfied (contradictory / over-constrained / stalled). */
    converged: boolean;
    /** Largest remaining scalar residual (worst constraint violation). Lengths
     *  are in sketch units; angular quantities are dimensionless. 0 when there
     *  are no constraints. */
    residual: number;
    /** Number of Newton iterations (Jacobian evaluations) actually run. */
    iterations: number;
    /** Free variables the constraints leave undetermined at the solution
     *  (variables minus Jacobian rank). 0 means the sketch is fully
     *  constrained. Undefined when the system is too large to analyse. */
    degreesOfFreedom?: number;
    /** Scalar equations that are linearly dependent on the others (equations
     *  minus Jacobian rank): redundant if consistent, conflicting otherwise.
     *  Undefined when the system is too large to analyse. */
    dependentEquations?: number;
}

const MAX_ITERATIONS = 200;
const MAX_DAMPING_RETRIES = 40;
const MAX_DAMPING = 1e14;
const MIN_DAMPING = 1e-15;
/** Smallest pivot ratio at which an undamped Gauss-Newton step is trusted. */
const WELL_CONDITIONED = 1e-6;

/** Current iterate of the minimisation. */
interface Iterate {
    X: Float64Array;
    r: Float64Array;
    /** 0.5 * |r|^2 */
    cost: number;
    /** Levenberg-Marquardt damping, relative to the size of J^T J. */
    lambda: number;
}

/** Buffers reused across iterations. */
interface Workspace {
    prog: Program;
    sky: Skyline;
    nVars: number;
    g: Float64Array;
    step: Float64Array;
    trial: Float64Array;
    trialR: Float64Array;
    scratch: Float64Array;
}

function createWorkspace(prog: Program): Workspace {
    const nVars = prog.x0.length;
    return {
        prog,
        sky: buildSkyline(prog),
        nVars,
        g: new Float64Array(nVars),
        step: new Float64Array(nVars),
        trial: new Float64Array(nVars),
        trialR: new Float64Array(prog.residualCount),
        scratch: new Float64Array(prog.constraints.reduce((acc, c) => Math.max(acc, c.n), 1)),
    };
}

/** Factor J^T J + damping into the skyline, restoring it from `pristine` first.
 *  Returns the conditioning estimate (see factorSkyline). */
function factorDamped(w: Workspace, pristine: Float64Array[], damping: number): number {
    for (let i = 0; i < w.nVars; i++) {
        const d = i - w.sky.first[i];
        w.sky.rows[i].set(pristine[i]);
        // A variable no residual depends on has an all-zero row and column and a
        // zero gradient: pin its diagonal so it stays put without making A singular.
        if (pristine[i][d] === 0) w.sky.rows[i][d] = 1;
        else w.sky.rows[i][d] += damping;
    }
    return factorSkyline(w.sky);
}

/** Solve for the step with the factored system and accept it if it lowers the cost. */
function acceptIfBetter(w: Workspace, it: Iterate): boolean {
    for (let i = 0; i < w.nVars; i++) w.step[i] = -w.g[i];
    solveSkyline(w.sky, w.step);
    for (let i = 0; i < w.nVars; i++) w.trial[i] = it.X[i] + w.step[i];
    evaluateResiduals(w.prog, w.trial, w.trialR, w.scratch);
    const trialCost = 0.5 * dot(w.trialR, w.trialR);
    if (!Number.isFinite(trialCost) || trialCost >= it.cost) return false;
    it.X = Float64Array.from(w.trial);
    it.r = Float64Array.from(w.trialR);
    it.cost = trialCost;
    return true;
}

/** One Levenberg-Marquardt iteration. Returns false when no step lowers the cost. */
function levenbergMarquardtStep(w: Workspace, it: Iterate): boolean {
    evaluateJacobian(w.prog, it.X, it.r, w.scratch);
    assembleNormalEquations(w.prog, w.sky, it.r, w.g);
    // One shared damping value (scaled to the system) rather than per-variable
    // Marquardt scaling: with per-variable scaling a variable the constraints
    // barely touch is almost free to move, so finite-difference noise in its
    // near-zero Jacobian column turns into a huge step. Shared damping gives
    // the minimum-movement (minimum-norm) step for under-constrained sketches.
    let trace = 0;
    for (let i = 0; i < w.nVars; i++) trace += skylineDiagonal(w.sky, i);
    const scale = Math.max(trace / w.nVars, 1e-12);
    const pristine = w.sky.rows.map(row => Float64Array.from(row));

    for (let attempt = 0; attempt < MAX_DAMPING_RETRIES; attempt++) {
        // Attempt 0 is a pure Gauss-Newton step, taken only when the system is
        // well conditioned: it lands exactly on linear constraints and converges
        // quadratically on the rest. Anything rank-deficient (under-constrained)
        // falls through to the damped, minimum-movement step.
        const undamped = attempt === 0;
        const conditioning = factorDamped(w, pristine, undamped ? 0 : it.lambda * scale);
        if (conditioning > (undamped ? WELL_CONDITIONED : 0) && acceptIfBetter(w, it)) {
            it.lambda = Math.max(it.lambda / 4, MIN_DAMPING);
            return true;
        }
        if (!undamped) it.lambda *= 4;
        if (it.lambda > MAX_DAMPING) return false;
    }
    return false;
}

/** Counts of what the constraints leave open, from the Jacobian rank at the solution. */
function analyseFreedom(w: Workspace, it: Iterate): Pick<ConstraintSolveResult, 'degreesOfFreedom' | 'dependentEquations'> {
    const equations = w.prog.residualCount;
    if (w.nVars === 0) return { degreesOfFreedom: 0, dependentEquations: equations };
    evaluateJacobian(w.prog, it.X, it.r, w.scratch);
    const rank = jacobianRank(w.prog, w.nVars);
    if (rank === null) return {};
    return { degreesOfFreedom: w.nVars - rank, dependentEquations: equations - rank };
}

/** Constraint solver: damped Gauss-Newton (Levenberg-Marquardt) on a system of
 *  normalised scalar residuals with a sparse finite-difference Jacobian.
 *
 *  Unlike the relaxation loop it replaced, information propagates through the
 *  whole constraint graph in every step, so long chains and closed loops
 *  converge in a handful of iterations rather than stalling at the iteration
 *  cap. Under-constrained sketches get the minimum-movement solution (LM's
 *  damped step is the least-squares / minimum-norm step), and the rank of the
 *  Jacobian gives the remaining degrees of freedom. Entities are updated in
 *  place; fixed points never move.
 *
 *  It is a local method: it finds the solution nearest the starting geometry.
 *  A sketch that starts very far from any solution (say a closed chain drawn
 *  straight and stretched far past its closing distance) can stall in a local
 *  minimum, which is reported as `converged: false`. */
export class ConstraintSolver {
    private maxIterations = MAX_ITERATIONS;

    solve(state: SolverState): ConstraintSolveResult {
        const prog = compileConstraints(state);
        const nVars = prog.x0.length;
        if (prog.residualCount === 0) {
            return { converged: true, residual: 0, iterations: 0, degreesOfFreedom: nVars, dependentEquations: 0 };
        }

        const w = createWorkspace(prog);
        const X = Float64Array.from(prog.x0);
        const r = new Float64Array(prog.residualCount);
        evaluateResiduals(prog, X, r, w.scratch);
        const it: Iterate = { X, r, cost: 0.5 * dot(r, r), lambda: 1e-3 };

        let iterations = 0;
        while (nVars > 0 && iterations < this.maxIterations && maxAbs(it.r) >= CONSTRAINT_RESIDUAL_TOL) {
            iterations++;
            // No descent direction left: stalled (or converged to numerical noise).
            if (!levenbergMarquardtStep(w, it)) break;
        }

        for (let i = 0; i < nVars; i++) prog.writers[i](it.X[i]);
        const residual = maxAbs(it.r);
        return {
            converged: residual < SKETCH_CONVERGENCE_RESIDUAL_TOL,
            residual,
            iterations,
            ...analyseFreedom(w, it),
        };
    }
}
