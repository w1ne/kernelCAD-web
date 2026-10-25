// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P1 stage A — result types and pure helpers for the assembly sequence
// planner. The geometric peel lives in `assemblyPath.ts`; this module keeps
// the shape of the answer stable so stage B can add subassemblies and the
// search fallback without changing the public contract.
import type { Vec3 } from '../../shared/intent/types';

/** A part reference in a sequence step. Stage A always uses the part name. */
export type PartRef = string;

export type UnknownReason = 'budget' | 'needs-multi-part-move' | 'non-straight-path';

/** Never collapse these three states: only `removable` is proven here. */
export type PartState =
    | { kind: 'removable'; direction: Vec3; testedDirections: Vec3[] }
    | { kind: 'blocked'; blockersByDirection: { direction: Vec3; blockers: string[] }[] }
    | { kind: 'unknown'; reason: UnknownReason };

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
    motion: 'straight-line-translation';
    testedDirections: Vec3[];
    gravity: 'not-modelled';
    basis: 'continuous-triangle-mesh';
    tessellation: MeshTessellationStamp;
    clearanceMm: number;
    clearancePolicy: string;
}

export interface Step {
    index: number;
    adds: PartRef[];
    /** Insertion direction: the reverse of the proven removal direction. */
    direction: Vec3;
    /** Reserved for stage B subassemblies. */
    subassembly?: string;
    /** Reserved for P3 / stage B holding. */
    heldBy?: PartRef[];
}

export interface AssemblySequence {
    steps: Step[];
    model: ModelStamp;
    /** Parts not ordered because their state is unknown (never "impossible"). */
    unknown: string[];
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
        testedDirections: directions.map(copyDirection),
        gravity: 'not-modelled',
        basis: 'continuous-triangle-mesh',
        tessellation: { ...tessellation },
        clearanceMm: 0,
        clearancePolicy: 'Zero clearance: any positive-travel triangle contact blocks; t=0 departure is free.',
    };
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
