// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P1 stage B — subassembly grouping, deterministic ordering heuristics,
// blocking-reduction multi-part moves and the sampling fallback. Geometry is
// supplied by the caller so this module stays independent of mesh validation.
import type { Vec3 } from '../../shared/intent/types';
import type { Triangle } from './assemblyPathSweep';
import {
    type PartState,
    type SearchFinding,
    type Step,
    type SubassemblyInput,
} from './assemblySequence';
import { negateDirection } from './assemblySequence';
import { rrtNonStraightPath } from './assemblySequenceSearch';

export interface PlanBounds {
    min: Vec3;
    max: Vec3;
}
/** The subset of a prepared part the planner needs. */
export interface PlanPrepared {
    name: string;
    mesh: { vertices: readonly number[]; triangles: readonly number[] };
    bbox: PlanBounds;
    triangles: readonly Triangle[];
    triangleBounds: readonly PlanBounds[];
}
export interface PlanDirection {
    direction: Vec3;
    distanceMm: number;
    clear: boolean;
    blockingParts: string[];
}
export interface PlanClassification {
    state: PartState;
    directions: PlanDirection[];
}
export interface PlanGeometry {
    /** Validate and prepare an aggregate mesh (subassembly or multi-part move). */
    prepare(name: string, mesh: { vertices: number[]; triangles: number[] }): PlanPrepared;
    /** Classify one entity against the remaining entities. */
    classify(part: PlanPrepared, remaining: PlanPrepared[], threaded: boolean): PlanClassification;
    /** True when the straight segment a -> b collides, for the sampling fallback. */
    blocked(a: PlanPrepared, b: PlanPrepared, direction: Vec3, distanceMm: number): boolean;
    /** Cheaper sweep-only variant for the fallback; falls back to `blocked`. */
    searchBlocked?(a: PlanPrepared, b: PlanPrepared, direction: Vec3, distanceMm: number): boolean;
}
export interface PlanOptions {
    subassemblies?: readonly SubassemblyInput[];
    search?: boolean;
    searchBudget?: number;
    partitionBudget?: number;
    tools?: Readonly<Record<string, string>>;
}
export interface AssemblyPlan {
    steps: Step[];
    removalOrder: { part: string; direction: Vec3 }[];
    search: SearchFinding[];
    unknownReasons: Map<string, 'budget' | 'needs-multi-part-move'>;
    ordered: Set<string>;
    remaining: string[];
    ok: boolean;
}
const DEFAULT_SEARCH_BUDGET = 4096;
const SEARCH_NODES_PER_PART = 512;
const DEFAULT_PARTITION_BUDGET = 4096;

interface SequenceEntity {
    name: string;
    subassembly: boolean;
    leaves: PlanPrepared[];
    prepared: PlanPrepared;
    tool: string;
    buildable: boolean;
    internal?: LevelPlan;
}
interface RemovalEntry {
    entities: SequenceEntity[];
    direction: Vec3;
    search?: SearchFinding;
}
interface LevelPlan {
    removal: RemovalEntry[];
    remaining: SequenceEntity[];
    search: SearchFinding[];
    searchBudgetExceeded: boolean;
    partitionBudgetExceeded: boolean;
}
interface PlanContext {
    geometry: PlanGeometry;
    threaded: ReadonlySet<string>;
    options: PlanOptions;
    searchBudgetLeft: number;
    partitionBudgetLeft: number;
}
interface EntityCandidate {
    entity: SequenceEntity;
    direction: Vec3;
    travelMm: number;
}
function sameVec(a: Vec3, b: Vec3): boolean {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9;
}
function mergePlanPrepared(name: string, leaves: PlanPrepared[], context: PlanContext): PlanPrepared {
    const vertices: number[] = [];
    const triangles: number[] = [];
    for (const leaf of leaves) {
        const offset = vertices.length / 3;
        vertices.push(...leaf.mesh.vertices);
        triangles.push(...leaf.mesh.triangles.map(index => index + offset));
    }
    return context.geometry.prepare(name, { vertices, triangles });
}
function entityTool(leaves: PlanPrepared[], threaded: ReadonlySet<string>, tools: Readonly<Record<string, string>> | undefined): string {
    const names = new Set(leaves.map(leaf => tools?.[leaf.name] ?? (threaded.has(leaf.name) ? 'fastener' : 'hand')));
    return names.size === 1 ? [...names][0] : 'mixed';
}
function singletonEntity(part: PlanPrepared, context: PlanContext): SequenceEntity {
    return {
        name: part.name,
        subassembly: false,
        leaves: [part],
        prepared: part,
        tool: entityTool([part], context.threaded, context.options.tools),
        buildable: true,
    };
}
function planGroups(prepared: PlanPrepared[], context: PlanContext): SequenceEntity[] {
    const byName = new Map(prepared.map(part => [part.name, part]));
    const groups = [...(context.options.subassemblies ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const grouped = new Set<string>();
    const entities: SequenceEntity[] = [];
    for (const group of groups) {
        const leaves = [...group.parts].sort((a, b) => a.localeCompare(b)).map(name => {
            const part = byName.get(name);
            if (!part)
                throw new Error(`subassembly '${group.name}' names unknown part '${name}'.`);
            grouped.add(name);
            return part;
        });
        const internalEntities = leaves.map(leaf => singletonEntity(leaf, context));
        const internal = planLevel(internalEntities, context);
        entities.push({
            name: group.name,
            subassembly: true,
            leaves,
            prepared: mergePlanPrepared(group.name, leaves, context),
            tool: entityTool(leaves, context.threaded, context.options.tools),
            buildable: internal.remaining.length === 0,
            internal,
        });
    }
    for (const part of prepared)
        if (!grouped.has(part.name))
            entities.push(singletonEntity(part, context));
    return entities.sort((a, b) => a.name.localeCompare(b.name));
}
function classifyEntity(entity: SequenceEntity, remaining: SequenceEntity[], context: PlanContext): PlanClassification {
    const others = remaining.filter(other => other !== entity).map(other => other.prepared);
    return context.geometry.classify(entity.prepared, others, entity.leaves.some(leaf => context.threaded.has(leaf.name)));
}
function bestClearDirection(report: PlanClassification, previous: Vec3 | undefined): { direction: Vec3; travelMm: number } | undefined {
    const clear = report.directions
        .map((entry, order) => ({ entry, order }))
        .filter(({ entry }) => entry.clear)
        .sort((a, b) => {
            const travel = a.entry.distanceMm - b.entry.distanceMm;
            if (travel !== 0)
                return travel;
            if (previous) {
                const aSame = sameVec(a.entry.direction, previous) ? 0 : 1;
                const bSame = sameVec(b.entry.direction, previous) ? 0 : 1;
                if (aSame !== bSame)
                    return aSame - bSame;
            }
            return a.order - b.order;
        })[0];
    return clear ? { direction: clear.entry.direction, travelMm: clear.entry.distanceMm } : undefined;
}
function removableCandidates(remaining: SequenceEntity[], context: PlanContext, previous: Vec3 | undefined): EntityCandidate[] {
    const candidates: EntityCandidate[] = [];
    for (const entity of remaining) {
        if (!entity.buildable)
            continue;
        const report = classifyEntity(entity, remaining, context);
        if (report.state.kind !== 'removable')
            continue;
        const best = bestClearDirection(report, previous);
        if (best)
            candidates.push({ entity, direction: best.direction, travelMm: best.travelMm });
    }
    return candidates;
}
/** Pure ordering key for deterministic heuristic selection. */
export interface RemovalCandidateKey {
    name: string;
    subassembly: boolean;
    travelMm: number;
    direction: Vec3;
    tool: string;
}
/** Subassemblies first, then outside-in, fewest reorientations, fewest tool changes. */
export function compareRemovalCandidates(
    a: RemovalCandidateKey,
    b: RemovalCandidateKey,
    previousDirection?: Vec3,
    previousTool?: string,
): number {
    const group = Number(!a.subassembly) - Number(!b.subassembly);
    if (group !== 0)
        return group;
    if (a.travelMm !== b.travelMm)
        return a.travelMm - b.travelMm;
    const reorient = Number(!previousDirection || !sameVec(a.direction, previousDirection))
        - Number(!previousDirection || !sameVec(b.direction, previousDirection));
    if (reorient !== 0)
        return reorient;
    const tool = Number(previousTool !== undefined && a.tool !== previousTool)
        - Number(previousTool !== undefined && b.tool !== previousTool);
    if (tool !== 0)
        return tool;
    return a.name.localeCompare(b.name);
}
function chooseCandidate(candidates: EntityCandidate[], previous: Vec3 | undefined, previousTool: string | undefined): EntityCandidate {
    return [...candidates].sort((a, b) => compareRemovalCandidates(
        { name: a.entity.name, subassembly: a.entity.subassembly, travelMm: a.travelMm, direction: a.direction, tool: a.entity.tool },
        { name: b.entity.name, subassembly: b.entity.subassembly, travelMm: b.travelMm, direction: b.direction, tool: b.entity.tool },
        previous,
        previousTool,
    ))[0];
}
function* combinations<T>(items: readonly T[], size: number, start = 0, prefix: T[] = []): Generator<T[]> {
    if (prefix.length === size) {
        yield prefix;
        return;
    }
    for (let i = start; i <= items.length - (size - prefix.length); i++)
        yield* combinations(items, size, i + 1, [...prefix, items[i]]);
}
function findMultiPartMove(remaining: SequenceEntity[], context: PlanContext): { group?: SequenceEntity[]; direction?: Vec3; budgetExceeded: boolean } {
    const singles = remaining.filter(entity => !entity.subassembly && entity.buildable && !entity.leaves.some(leaf => context.threaded.has(leaf.name)));
    const maxSize = Math.min(6, singles.length - 1);
    for (let size = 2; size <= maxSize; size++) {
        for (const group of combinations(singles, size)) {
            if (context.partitionBudgetLeft <= 0)
                return { budgetExceeded: true };
            context.partitionBudgetLeft -= 1;
            const names = new Set(group.map(entity => entity.name));
            const aggregate = mergePlanPrepared(`multi:${group.map(entity => entity.name).join('+')}`, group.flatMap(entity => entity.leaves), context);
            const others = remaining.filter(entity => !names.has(entity.name)).map(entity => entity.prepared);
            const report = context.geometry.classify(aggregate, others, false);
            if (report.state.kind === 'removable') {
                const best = bestClearDirection(report, undefined);
                if (best)
                    return { group, direction: best.direction, budgetExceeded: false };
            }
        }
    }
    return { budgetExceeded: false };
}
function entityBounds(entities: SequenceEntity[]): PlanBounds {
    return {
        min: [0, 1, 2].map(axis => Math.min(...entities.map(entity => entity.prepared.bbox.min[axis]))) as Vec3,
        max: [0, 1, 2].map(axis => Math.max(...entities.map(entity => entity.prepared.bbox.max[axis]))) as Vec3,
    };
}
function searchSeed(entity: SequenceEntity, context: PlanContext): number {
    const text = [entity.name, entity.prepared.bbox.min.join(','), entity.prepared.bbox.max.join(','), context.options.subassemblies?.length ?? 0].join('|');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++)
        hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return hash >>> 0;
}
function translatedPart(part: PlanPrepared, offset: Vec3): PlanPrepared {
    const shift = (point: Vec3): Vec3 => [point[0] + offset[0], point[1] + offset[1], point[2] + offset[2]];
    return {
        ...part,
        bbox: { min: shift(part.bbox.min), max: shift(part.bbox.max) },
        mesh: {
            vertices: part.mesh.vertices.map((value, index) => value + offset[index % 3]),
            triangles: part.mesh.triangles,
        },
        triangles: part.triangles.map(triangle => triangle.map(shift) as unknown as Triangle),
        triangleBounds: part.triangleBounds.map(bounds => ({ min: shift(bounds.min), max: shift(bounds.max) })),
    };
}
function searchEntityPath(
    entity: SequenceEntity,
    remaining: SequenceEntity[],
    context: PlanContext,
): { finding: SearchFinding; direction: Vec3 } | undefined {
    const bounds = entityBounds(remaining);
    const partSpan = Math.hypot(
        entity.prepared.bbox.max[0] - entity.prepared.bbox.min[0],
        entity.prepared.bbox.max[1] - entity.prepared.bbox.min[1],
        entity.prepared.bbox.max[2] - entity.prepared.bbox.min[2],
    );
    const diagonal = Math.max(Math.hypot(
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2],
    ), partSpan, 1e-3);
    const margin = diagonal * 0.25;
    const escape = {
        min: bounds.min.map(value => value - margin) as Vec3,
        max: bounds.max.map(value => value + margin) as Vec3,
    };
    const others = remaining.filter(other => other !== entity).map(other => other.prepared);
    const part = entity.prepared;
    const start: Vec3 = [0, 1, 2].map(axis => (part.bbox.min[axis] + part.bbox.max[axis]) / 2) as Vec3;
    let segment = 0;
    const result = rrtNonStraightPath({
        start,
        escape,
        stepMm: Math.max(diagonal * 0.03, partSpan * 0.4, 1e-3),
        maxNodes: Math.min(context.searchBudgetLeft, SEARCH_NODES_PER_PART),
        seed: searchSeed(entity, context),
        segmentClear: (a, b) => {
            const delta: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
            const distanceMm = Math.hypot(delta[0], delta[1], delta[2]);
            if (distanceMm < 1e-12)
                return true;
            const direction: Vec3 = [delta[0] / distanceMm, delta[1] / distanceMm, delta[2] / distanceMm];
            const moved = translatedPart(part, [a[0] - start[0], a[1] - start[1], a[2] - start[2]]);
            moved.name = `${part.name}@search-${segment++}`;
            return others.every(other => !(context.geometry.searchBlocked ?? context.geometry.blocked)(moved, other, direction, distanceMm));
        },
    });
    context.searchBudgetLeft = Math.max(0, context.searchBudgetLeft - result.nodes);
    if (result.status === 'budget')
        return undefined;
    const before = result.waypoints[result.waypoints.length - 2];
    const last = result.waypoints[result.waypoints.length - 1];
    const delta: Vec3 = [last[0] - before[0], last[1] - before[1], last[2] - before[2]];
    const length = Math.hypot(delta[0], delta[1], delta[2]);
    return {
        finding: { part: entity.name, status: 'found-by-search', waypoints: result.waypoints.map(point => [...point] as Vec3) },
        direction: length > 1e-12 ? [delta[0] / length, delta[1] / length, delta[2] / length] : [0, 0, 1],
    };
}
function searchStuckParts(remaining: SequenceEntity[], context: PlanContext): { entry?: RemovalEntry; search?: SearchFinding; budgetExceeded: boolean } {
    const candidates = remaining
        .filter(entity => !entity.subassembly && entity.leaves.length === 1 && entity.buildable && !context.threaded.has(entity.name))
        .map(entity => {
            const box = entity.prepared.bbox;
            return { entity, volume: (box.max[0] - box.min[0]) * (box.max[1] - box.min[1]) * (box.max[2] - box.min[2]) };
        })
        .sort((a, b) => a.volume - b.volume || a.entity.name.localeCompare(b.entity.name));
    for (const { entity } of candidates) {
        if (context.searchBudgetLeft <= 0)
            break;
        const found = searchEntityPath(entity, remaining, context);
        if (found)
            return { entry: { entities: [entity], direction: found.direction, search: found.finding }, search: found.finding, budgetExceeded: false };
    }
    return { budgetExceeded: context.searchBudgetLeft <= 0 };
}
function withoutEntities(remaining: SequenceEntity[], remove: readonly SequenceEntity[]): SequenceEntity[] {
    const names = new Set(remove.map(entity => entity.name));
    return remaining.filter(entity => !names.has(entity.name));
}
function planLevel(entities: SequenceEntity[], context: PlanContext): LevelPlan {
    let remaining = [...entities].sort((a, b) => a.name.localeCompare(b.name));
    const removal: RemovalEntry[] = [];
    const search: SearchFinding[] = [];
    let previous: Vec3 | undefined;
    let previousTool: string | undefined;
    let searchBudgetExceeded = false;
    let partitionBudgetExceeded = false;
    while (remaining.length > 0) {
        const candidates = removableCandidates(remaining, context, previous);
        if (candidates.length > 0) {
            const chosen = chooseCandidate(candidates, previous, previousTool);
            removal.push({ entities: [chosen.entity], direction: chosen.direction });
            previous = chosen.direction;
            previousTool = chosen.entity.tool;
            remaining = withoutEntities(remaining, [chosen.entity]);
            continue;
        }
        const partition = findMultiPartMove(remaining, context);
        if (partition.group && partition.direction) {
            removal.push({ entities: partition.group, direction: partition.direction });
            previous = partition.direction;
            previousTool = partition.group.every(entity => entity.tool === partition.group![0].tool) ? partition.group[0].tool : undefined;
            remaining = withoutEntities(remaining, partition.group);
            continue;
        }
        partitionBudgetExceeded ||= partition.budgetExceeded;
        if (context.options.search === false)
            break;
        const fallback = searchStuckParts(remaining, context);
        if (fallback.entry && fallback.search) {
            removal.push(fallback.entry);
            search.push(fallback.search);
            previous = fallback.entry.direction;
            remaining = withoutEntities(remaining, fallback.entry.entities);
            continue;
        }
        searchBudgetExceeded ||= fallback.budgetExceeded;
        break;
    }
    return { removal, remaining, search, searchBudgetExceeded, partitionBudgetExceeded };
}
function collectSearchFindings(plan: LevelPlan, out: SearchFinding[] = []): SearchFinding[] {
    for (const entry of plan.removal) {
        if (entry.search)
            out.push(entry.search);
        for (const entity of entry.entities)
            if (entity.internal)
                collectSearchFindings(entity.internal, out);
    }
    return out;
}
function buildSequenceSteps(plan: LevelPlan, parent?: string): Step[] {
    const steps: Step[] = [];
    for (let index = plan.removal.length - 1; index >= 0; index--) {
        const entry = plan.removal[index];
        const direction = negateDirection(entry.direction);
        if (entry.search) {
            steps.push({ index: 0, adds: [entry.search.part], direction, ...(parent ? { subassembly: parent } : {}) });
            continue;
        }
        if (entry.entities.length > 1) {
            steps.push({ index: 0, adds: entry.entities.flatMap(entity => entity.leaves.map(leaf => leaf.name)), direction, ...(parent ? { subassembly: parent } : {}) });
            continue;
        }
        const entity = entry.entities[0];
        if (entity.subassembly && entity.internal) {
            steps.push(...buildSequenceSteps(entity.internal, entity.name));
            steps.push({ index: 0, adds: [entity.name], direction, subassembly: entity.name });
            continue;
        }
        steps.push({ index: 0, adds: [entity.name], direction, ...(parent ? { subassembly: parent } : {}) });
    }
    return steps;
}
function disassemblyPartOrder(plan: LevelPlan): { part: string; direction: Vec3 }[] {
    const order: { part: string; direction: Vec3 }[] = [];
    for (const entry of plan.removal) {
        if (entry.search) {
            order.push({ part: entry.search.part, direction: entry.direction });
            continue;
        }
        for (const entity of entry.entities)
            for (const leaf of entity.leaves)
                order.push({ part: leaf.name, direction: entry.direction });
    }
    return order;
}
function orderedLeafNames(plan: LevelPlan, out = new Set<string>()): Set<string> {
    for (const entry of plan.removal)
        for (const entity of entry.entities)
            for (const leaf of entity.leaves)
                out.add(leaf.name);
    return out;
}
function planFlagsForPart(part: string, plan: LevelPlan): { search: boolean; partition: boolean } {
    for (const entry of plan.removal)
        for (const entity of entry.entities)
            if (entity.internal && entity.leaves.some(leaf => leaf.name === part))
                return { search: entity.internal.searchBudgetExceeded, partition: entity.internal.partitionBudgetExceeded };
    for (const entity of plan.remaining)
        if (entity.internal && entity.leaves.some(leaf => leaf.name === part))
            return { search: entity.internal.searchBudgetExceeded, partition: entity.internal.partitionBudgetExceeded };
    return { search: plan.searchBudgetExceeded, partition: plan.partitionBudgetExceeded };
}
/** Plan one assembly level and return a flat, deterministic build sequence. */
export function planAssemblySequence(
    prepared: readonly PlanPrepared[],
    geometry: PlanGeometry,
    options: PlanOptions,
    threaded: ReadonlySet<string> = new Set(),
): AssemblyPlan {
    const context: PlanContext = {
        geometry,
        threaded,
        options,
        searchBudgetLeft: options.searchBudget ?? DEFAULT_SEARCH_BUDGET,
        partitionBudgetLeft: options.partitionBudget ?? DEFAULT_PARTITION_BUDGET,
    };
    const entities = planGroups([...prepared], context);
    const top = planLevel(entities, context);
    const steps = buildSequenceSteps(top).map((step, index) => ({ ...step, index: index + 1 }));
    const findings = collectSearchFindings(top);
    const ordered = orderedLeafNames(top);
    const unknownReasons = new Map<string, 'budget' | 'needs-multi-part-move'>();
    for (const part of prepared) {
        if (ordered.has(part.name))
            continue;
        const flags = planFlagsForPart(part.name, top);
        if (flags.search)
            unknownReasons.set(part.name, 'budget');
        else if (flags.partition)
            unknownReasons.set(part.name, 'needs-multi-part-move');
    }
    return {
        steps,
        removalOrder: disassemblyPartOrder(top),
        search: findings,
        unknownReasons,
        ordered,
        remaining: top.remaining.flatMap(entity => entity.leaves.map(leaf => leaf.name)),
        ok: top.remaining.length === 0 && findings.length === 0,
    };
}
