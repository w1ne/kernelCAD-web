// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P1 — result types and pure helpers for the assembly sequence planner. The
// geometric peel lives in `assemblyPath.ts`; this module keeps the shape of
// the answer stable.
import type { Vec3 } from '../../shared/intent/types';
import type { FastenerHandedness, FitKind, ToolEnvelope } from './assemblyFastener';

/** A part reference in a sequence step. A subassembly install step uses its name. */
export type PartRef = string;

export type UnknownReason = 'budget' | 'needs-multi-part-move' | 'non-straight-path';

/** How a part is ordered. `requires-force` and `helical` are never a
 *  straight-line clearance proof; `straight` is the P1 proof. */
export type PartMotion = 'straight' | 'helical' | 'requires-force';

/** Never collapse these states. Only `removable` is proven by a straight
 *  sweep; a helical path is a separate declared motion, and `requires-force`
 *  is declared (press/snap) rather than simulated. */
export type PartState =
    | { kind: 'removable'; direction: Vec3; testedDirections: Vec3[]; motion?: PartMotion }
    | { kind: 'requires-force'; fit: FitKind; direction: Vec3; testedDirections: Vec3[] }
    | { kind: 'blocked'; blockersByDirection: { direction: Vec3; blockers: string[] }[] }
    | { kind: 'unknown'; reason: UnknownReason };

/** Motion models the answer is allowed to use, in addition to the P1 straight
 *  sweep. Listed on every stamp so a helical or forced step is never read as
 *  a straight-line proof. */
export type MotionModel =
    | 'straight-line-translation'
    | 'helical-screw'
    | 'requires-force'
    | 'sampling-search';

/** What a fastener's helical removal did, recorded on its step. */
export interface HelicalMotionSummary {
    /** Removal/approach axis in world space. */
    axis: Vec3;
    pitchMm: number;
    handedness: FastenerHandedness;
    /** Axial distance unthreaded before the free translation. */
    threadLengthMm: number;
    /** Full turns of the modelled helical segment. */
    turns: number;
    standard?: string;
}

/** A tool envelope that could not reach a fastener at its step. */
export interface ToolBlockFinding {
    fastener: string;
    status: 'tool-blocked';
    blockers: string[];
    tool: ToolEnvelope;
    basis: 'assembled-parts';
}

export interface ToolClearFinding {
    fastener: string;
    status: 'clear';
    blockers: [];
    tool: ToolEnvelope;
    basis: 'assembled-parts';
}

export type ToolReachFinding = ToolBlockFinding | ToolClearFinding;

/** A press or snap fit ordered as a declared force step. */
export interface RequiresForceFinding {
    part: string;
    kind: FitKind;
}

export interface MeshTessellationStamp {
    /** Linear deflection. Null when the caller supplied a mesh without stating it. */
    linearMm: number | null;
    /** True when `linearMm` is relative to each edge length. Null when unstated. */
    relative: boolean | null;
    angularRad: number | null;
    source: string;
}

/** What the sequence is allowed to assume. Part of every answer. */
export interface ModelStamp {
    rigidParts: true;
    /** P1's proven straight sweep. Kept literal for existing consumers. */
    motion: 'straight-line-translation';
    /** Every motion model used by this answer. Always includes the straight
     *  sweep; adds helical, requires-force and sampling-search when present. */
    motionModels: MotionModel[];
    testedDirections: Vec3[];
    gravity: 'not-modelled';
    basis: 'continuous-triangle-mesh';
    tessellation: MeshTessellationStamp;
    clearanceMm: number;
    clearancePolicy: string;
    /** `swept-envelope` when tool reach ran against declared/default envelopes. */
    toolReach: 'not-modelled' | 'swept-envelope';
}

export interface Step {
    index: number;
    adds: PartRef[];
    /** Insertion direction: the reverse of the proven/declared removal direction. */
    direction: Vec3;
    /** How this step is justified. Absent on P1 steps for compatibility;
     *  treat absent as `straight`. A `helical` step is proven along the
     *  declared screw axis, not by the straight sweep. */
    motion?: 'straight' | 'helical' | 'requires-force' | 'search';
    /** Recorded for a helical fastener step. */
    fastener?: HelicalMotionSummary;
    /** Present when a press/snap fit is declared; never simulated. */
    requiresForce?: { kind: FitKind };
    /** Present when a declared/default tool envelope was swept and blocked. */
    tool?: ToolBlockFinding;
    /** Name of the subassembly this step belongs to, or the unit it installs. */
    subassembly?: string;
    /** Reserved for P3 stability/holding; stage B does not assign fixtures. */
    heldBy?: PartRef[];
}

/** A caller-declared or mate-derived subassembly candidate. */
export interface SubassemblyInput {
    name: string;
    /** Leaf part names. A part may belong to at most one non-nested candidate. */
    parts: readonly string[];
}

/**
 * A non-straight path found by the sampling fallback. This is evidence that a
 * path was found inside a finite sampling budget, never a proof of clearance.
 */
export interface SearchFinding {
    part: string;
    status: 'found-by-search';
    /** Sequenced translations from the part's start pose to outside the assembly. */
    waypoints: Vec3[];
}

export interface AssemblySequence {
    steps: Step[];
    model: ModelStamp;
    /** Parts not ordered because their state is unknown (never "impossible"). */
    unknown: string[];
    /** Non-straight paths found by search; these steps are not proven. */
    search?: SearchFinding[];
    /** Press/snap fits ordered as declared force steps (never proven). */
    requiresForce?: RequiresForceFinding[];
    /** Fasteners whose declared/default tool envelope is obstructed. */
    toolBlocked?: ToolBlockFinding[];
}

/** One directed edge of the directional blocking graph. */
export interface BlockingEdge {
    /** Part that cannot move in `direction` without hitting `blocker`. */
    part: string;
    blocker: string;
    direction: Vec3;
}

export interface DirectionalBlockingGraph {
    parts: string[];
    directions: Vec3[];
    edges: BlockingEdge[];
}

export interface DirectionReport {
    direction: Vec3;
    clear: boolean;
    blockingParts: string[];
}

export interface GraphPartReport {
    part: string;
    directions: DirectionReport[];
}

const DIRECTION_TOLERANCE = 1e-9;

function sameDirection(a: Vec3, b: Vec3): boolean {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < DIRECTION_TOLERANCE;
}

function copyDirection(v: Vec3): Vec3 {
    return [v[0] === 0 ? 0 : v[0], v[1] === 0 ? 0 : v[1], v[2] === 0 ? 0 : v[2]];
}

export function negateDirection(v: Vec3): Vec3 {
    return copyDirection([-v[0], -v[1], -v[2]]);
}

/**
 * Build the directional blocking graph from per-part direction reports.
 * Edges are deduplicated, so two triangles hitting the same part in one
 * direction produce one edge. The graph is the union of the per-direction
 * blocker sets; the removal order is a topological peel of that graph.
 */
export function buildDirectionalBlockingGraph(parts: readonly GraphPartReport[]): DirectionalBlockingGraph {
    const directions: Vec3[] = [];
    const edges: BlockingEdge[] = [];
    const seen = new Set<string>();
    for (const part of parts) {
        for (const report of part.directions) {
            if (!directions.some(d => sameDirection(d, report.direction)))
                directions.push(copyDirection(report.direction));
            for (const blocker of report.blockingParts) {
                const key = [part.part, blocker, ...report.direction].join('\t');
                if (seen.has(key))
                    continue;
                seen.add(key);
                edges.push({ part: part.part, blocker, direction: copyDirection(report.direction) });
            }
        }
    }
    return { parts: parts.map(p => p.part), directions, edges };
}

/**
 * Classify a part from its tested directions. A threaded fastener is
 * `unknown: non-straight-path` even when a straight translation happens to
 * look clear: this stage does not model the helical removal (P2 does).
 */
export function partState(directions: readonly DirectionReport[], threadedFastener: boolean): PartState {
    if (threadedFastener)
        return { kind: 'unknown', reason: 'non-straight-path' };
    const testedDirections = directions.map(d => copyDirection(d.direction));
    const clear = directions.find(d => d.clear);
    if (clear)
        return { kind: 'removable', direction: copyDirection(clear.direction), testedDirections };
    return {
        kind: 'blocked',
        blockersByDirection: directions.map(d => ({
            direction: copyDirection(d.direction),
            blockers: [...d.blockingParts],
        })),
    };
}

export function makeModelStamp(
    directions: readonly Vec3[],
    tessellation: MeshTessellationStamp,
): ModelStamp {
    return {
        rigidParts: true,
        motion: 'straight-line-translation',
        motionModels: ['straight-line-translation'],
        testedDirections: directions.map(copyDirection),
        gravity: 'not-modelled',
        basis: 'continuous-triangle-mesh',
        tessellation: { ...tessellation },
        clearanceMm: 0,
        clearancePolicy: 'Zero clearance: any positive-travel triangle contact blocks; t=0 departure is free.',
        toolReach: 'not-modelled',
    };
}

/** Add a motion model to a stamp exactly once, preserving deterministic order. */
export function addMotionModel(model: ModelStamp, motion: MotionModel): void {
    if (!model.motionModels.includes(motion))
        model.motionModels.push(motion);
}

export function sequenceFromRemovalOrder(
    removal: readonly { part: string; direction: Vec3 }[],
    model: ModelStamp,
    unknown: readonly string[],
): AssemblySequence {
    const steps: Step[] = [];
    for (let i = removal.length - 1; i >= 0; i--) {
        steps.push({
            index: steps.length + 1,
            adds: [removal[i].part],
            direction: negateDirection(removal[i].direction),
        });
    }
    return { steps, model, unknown: [...unknown] };
}

/** Classify the final stuck set without inventing a reason it cannot prove. */
export function stuckUnknownNames(
    assemblyOrder: readonly string[],
    threaded: ReadonlySet<string>,
    budgetExceeded: boolean,
    remaining: ReadonlySet<string>,
): string[] {
    return assemblyOrder.filter(name => threaded.has(name) || (budgetExceeded && remaining.has(name)));
}
