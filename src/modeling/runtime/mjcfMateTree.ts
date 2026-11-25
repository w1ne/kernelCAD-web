// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Undirected spanning tree over the mate graph for MJCF body/joint emission.
//
// Mate edges are undirected: `mate(name, child, base)` and
// `mate(name, base, child)` describe the same topological edge, exactly as
// `solveMates` and `reviewJointTopology` treat them. A directed reading made
// every star assembly with two or more children on one base fail with
// "part '<base>' has multiple parents".
//
// Only genuine undirected cycles are rejected: the MuJoCo physics gate at
// v0.7 emits a tree and cannot express a closed loop (issue #361).

import type { AssemblyPartStored, VirtualJointRecord } from '../capture/assemblyTypes';
import type { MateRecord } from '../mates/mate';
import { parseConnectorRef } from '../mates/mate';
import { solverGroundedParts } from '../mates/solverRoot';

export interface MateTreeChild {
    readonly childName: string;
    readonly mate: MateRecord;
}

export interface MateTree {
    readonly partByName: Map<string, AssemblyPartStored>;
    readonly childrenByParent: Map<string, MateTreeChild[]>;
    readonly roots: readonly AssemblyPartStored[];
    /** True when the spanning tree traverses a mate as `a → b`, false when flipped `b → a`. */
    readonly partIsAByMate: ReadonlyMap<string, boolean>;
}

interface UndirectedMateEdge {
    readonly mateIndex: number;
    readonly neighbor: string;
    readonly mate: MateRecord;
    readonly partIsA: boolean;
}

function cycleError(mate: MateRecord, partName: string, detail: string): Error {
    return new Error(
        `assemblyToMjcf: mate graph has a cycle reaching '${partName}' (mate '${mate.name}' ${detail}). ` +
            'MuJoCo physics gate only supports tree-shaped mate graphs at v0.7; ' +
            'closed loops require an <equality>/tendon API (issue #361).',
    );
}

function buildUndirectedAdjacency(
    partByName: ReadonlyMap<string, AssemblyPartStored>,
    mates: readonly MateRecord[],
): Map<string, UndirectedMateEdge[]> {
    const adjacency = new Map<string, UndirectedMateEdge[]>();
    for (const name of partByName.keys()) adjacency.set(name, []);
    for (let mateIndex = 0; mateIndex < mates.length; mateIndex++) {
        const mate = mates[mateIndex]!;
        const aName = parseConnectorRef(mate.a).partName;
        const bName = parseConnectorRef(mate.b).partName;
        if (aName === bName) throw cycleError(mate, aName, 'links a part to itself');
        if (!partByName.has(aName) || !partByName.has(bName)) continue;
        adjacency.get(aName)!.push({ mateIndex, neighbor: bName, mate, partIsA: true });
        adjacency.get(bName)!.push({ mateIndex, neighbor: aName, mate, partIsA: false });
    }
    return adjacency;
}

/**
 * Build the MJCF body tree from the undirected mate graph.
 *
 * Seeding: world-fixed virtual joints ground their parts; without one the
 * first part is assumed grounded (the same rule `solveMates` uses). Each
 * remaining connected component roots at its first not-yet-visited part.
 * BFS orients every tree edge away from its root and records the flip state
 * so `resolveMateFrames` can swap the parent and child connectors.
 */
export function buildMateTree(
    parts: readonly AssemblyPartStored[],
    mates: readonly MateRecord[],
    virtualJoints: readonly VirtualJointRecord[] = [],
): MateTree {
    const partByName = new Map<string, AssemblyPartStored>();
    for (const p of parts) partByName.set(p.name, p);

    const adjacency = buildUndirectedAdjacency(partByName, mates);
    const childrenByParent = new Map<string, MateTreeChild[]>();
    for (const p of parts) childrenByParent.set(p.name, []);
    const partIsAByMate = new Map<string, boolean>();
    const roots: AssemblyPartStored[] = [];
    const visited = new Set<string>();
    const seenMates = new Set<number>();

    let componentRoots = solverGroundedParts(parts, virtualJoints);
    while (componentRoots.length > 0) {
        const queue: string[] = [];
        for (const root of componentRoots) {
            if (visited.has(root.name)) continue;
            visited.add(root.name);
            roots.push(root);
            queue.push(root.name);
        }
        while (queue.length > 0) {
            const parentName = queue.shift()!;
            for (const edge of adjacency.get(parentName) ?? []) {
                if (seenMates.has(edge.mateIndex)) continue;
                seenMates.add(edge.mateIndex);
                if (visited.has(edge.neighbor)) throw cycleError(edge.mate, edge.neighbor, 'closes a loop');
                visited.add(edge.neighbor);
                partIsAByMate.set(edge.mate.name, edge.partIsA);
                childrenByParent.get(parentName)!.push({ childName: edge.neighbor, mate: edge.mate });
                queue.push(edge.neighbor);
            }
        }
        const nextUnvisited = parts.find((p) => !visited.has(p.name));
        componentRoots = nextUnvisited !== undefined ? [nextUnvisited] : [];
    }

    return { partByName, childrenByParent, roots, partIsAByMate };
}
