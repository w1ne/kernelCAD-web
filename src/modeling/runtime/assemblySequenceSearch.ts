// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Deterministic RRT-style sampling for non-straight removal paths. This is a
// fallback, not a proof: a found polyline is reported as `found-by-search`
// and an exhausted node budget as `budget`.
import type { Vec3 } from '../../shared/intent/types';

export interface SearchVolume {
    min: Vec3;
    max: Vec3;
}

export interface RrtSearchOptions {
    /** Part centre at its authored pose. */
    start: Vec3;
    /** Assembly bounds expanded by a margin. Outside this volume is "escaped". */
    escape: SearchVolume;
    /** Fixed extension length; smaller values follow tighter passages. */
    stepMm: number;
    /** Strict node budget. The search stops after this many extensions. */
    maxNodes: number;
    /** Deterministic seed derived from part names and positions by the caller. */
    seed: number;
    /** True when the straight translation a -> b is collision-free. */
    segmentClear: (a: Vec3, b: Vec3) => boolean;
}

export type RrtSearchResult =
    | { status: 'found'; waypoints: Vec3[]; nodes: number }
    | { status: 'budget'; nodes: number };

const EPS = 1e-9;

function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function distance(a: Vec3, b: Vec3): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function copy(v: Vec3): Vec3 {
    return [v[0], v[1], v[2]];
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function outside(point: Vec3, volume: SearchVolume): boolean {
    return point.some((value, axis) => value < volume.min[axis] - EPS || value > volume.max[axis] + EPS);
}

function centre(volume: SearchVolume): Vec3 {
    return [0, 1, 2].map(axis => (volume.min[axis] + volume.max[axis]) / 2) as Vec3;
}

function span(volume: SearchVolume): number {
    return Math.hypot(volume.max[0] - volume.min[0], volume.max[1] - volume.min[1], volume.max[2] - volume.min[2]);
}

function randomInside(volume: SearchVolume, random: () => number): Vec3 {
    return [0, 1, 2].map(axis => volume.min[axis] + random() * (volume.max[axis] - volume.min[axis])) as Vec3;
}

function randomOutside(volume: SearchVolume, random: () => number): Vec3 {
    const point = randomInside(volume, random);
    const axis = Math.floor(random() * 3) % 3;
    const spanMm = (volume.max[axis] - volume.min[axis]) * (0.05 + random() * 0.25);
    point[axis] = random() < 0.5 ? volume.min[axis] - spanMm : volume.max[axis] + spanMm;
    return point;
}

function goalDirection(node: Vec3, volume: SearchVolume): Vec3 {
    const middle = centre(volume);
    const delta = [node[0] - middle[0], node[1] - middle[1], node[2] - middle[2]];
    const length = Math.hypot(...delta);
    return length > EPS ? delta.map(value => value / length) as Vec3 : [0, 0, 1];
}

function tryExtend(
    from: Vec3,
    to: Vec3,
    stepMm: number,
    segmentClear: (a: Vec3, b: Vec3) => boolean,
): Vec3 | undefined {
    const length = distance(from, to);
    if (length < EPS)
        return undefined;
    const step = Math.min(stepMm, length);
    for (const factor of [1, 0.5, 0.25]) {
        const next = lerp(from, to, (step * factor) / length);
        if (segmentClear(from, next))
            return next;
    }
    return undefined;
}

function reconstruct(nodes: readonly Vec3[], parents: readonly number[], last: number): Vec3[] {
    const path: Vec3[] = [];
    let index = last;
    while (index >= 0) {
        path.push(copy(nodes[index]));
        index = parents[index];
    }
    return path.reverse();
}

/** Run a deterministic RRT in a bounded volume. Never throws on budget exhaustion. */
export function rrtNonStraightPath(options: RrtSearchOptions): RrtSearchResult {
    const random = mulberry32(options.seed);
    const nodes: Vec3[] = [copy(options.start)];
    const parents: number[] = [-1];
    const escapeSpan = Math.max(span(options.escape), options.stepMm * 4);
    const middle = centre(options.escape);
    for (let iteration = 0; iteration < options.maxNodes; iteration++) {
        const sample = random() < 0.2
            ? randomOutside(options.escape, random)
            : randomInside(options.escape, random);
        let nearest = 0;
        let nearestDistance = Infinity;
        for (let i = 0; i < nodes.length; i++) {
            const d = distance(nodes[i], sample);
            if (d < nearestDistance) {
                nearestDistance = d;
                nearest = i;
            }
        }
        const next = tryExtend(nodes[nearest], sample, options.stepMm, options.segmentClear);
        if (!next)
            continue;
        if (nodes.some(node => distance(node, next) < EPS))
            continue;
        nodes.push(next);
        parents.push(nearest);
        const final = next[0] === middle[0] && next[1] === middle[1] && next[2] === middle[2]
            ? next
            : (() => {
                const direction = goalDirection(next, options.escape);
                return [next[0] + direction[0] * escapeSpan * 2, next[1] + direction[1] * escapeSpan * 2, next[2] + direction[2] * escapeSpan * 2] as Vec3;
            })();
        if (outside(next, options.escape) && options.segmentClear(next, final))
            return { status: 'found', waypoints: [...reconstruct(nodes, parents, nodes.length - 1), final], nodes: nodes.length };
    }
    return { status: 'budget', nodes: nodes.length };
}
