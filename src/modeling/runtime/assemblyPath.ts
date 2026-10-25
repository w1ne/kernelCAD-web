// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { TriangleBvh, type DfmMesh } from './dfm/meshBvh';
import { bboxGap } from './dfm/clearance';
import { trianglesCollideAlong, type Triangle } from './assemblyPathSweep';
import { classifySolidPoint } from './assemblyPathContainment';
import type { Vec3 } from '../../shared/intent/types';
import type { RequirementsLedger } from '../../shared/intent/requirementRecord';
import {
    addMotionModel,
    buildDirectionalBlockingGraph,
    makeModelStamp,
    partState,
    type AssemblySequence,
    type DirectionalBlockingGraph,
    type HelicalMotionSummary,
    type MeshTessellationStamp,
    type ModelStamp,
    type NeedsHoldFinding,
    type PartState,
    type RequiresForceFinding,
    type SearchFinding,
    type Step,
    type SubassemblyInput,
    type ToolBlockFinding,
    type ToolReachFinding,
} from './assemblySequence';
import {
    normalizeFastenerMotion,
    normalizeFit,
    type FastenerMotion,
    type FastenerMotionInput,
    type FitInput,
    type FitKind,
} from './assemblyFastener';
import {
    checkToolReach,
    classifyFastenerHelix,
    classifyFit,
    type SweepBlocked,
} from './assemblyFastenerMotion';
import { planAssemblySequence } from './assemblySequencePlan';
import {
    assessSequenceStability,
    DEFAULT_STABILITY_CONTACT_TOLERANCE_MM,
} from './assemblyStability';
export interface AssemblyPathPart {
    name: string;
    mesh: DfmMesh;
    /** Declared physical behaviour the triangle mesh cannot express. A threaded
     *  fastener needs a helical removal (P2); stage A reports it unknown. */
    threadedFastener?: boolean;
}
export interface AssemblyPathOptions {
    /** Additional world-space removal vectors. Six cardinal directions always participate. */
    directions?: Vec3[];
    disassemblyOrder?: boolean;
    /** Also return the removal peel and its reverse build sequence. */
    sequence?: boolean;
    /** Parts that need a non-straight (helical) removal. Names must exist. */
    threadedFasteners?: string[];
    /** Override the shared work budget (positive finite). */
    workBudget?: number;
    /** Describe the input mesh's tessellation on the model stamp. */
    tessellation?: Partial<MeshTessellationStamp>;
    /** Subassembly candidates; mate-derived clusters are added by the MCP tool. */
    subassemblies?: readonly SubassemblyInput[];
    /** Run the sampling fallback for parts stuck in every tested direction. Default true. */
    search?: boolean;
    /** Strict node budget for the sampling fallback. */
    searchBudget?: number;
    /** Strict number of multi-part subsets examined by the blocking-reduction partition. */
    partitionBudget?: number;
    /** Optional tool identity per part; drives the fewest-tool-changes heuristic. */
    tools?: Readonly<Record<string, string>>;
    /** Declared helical fastener motion, keyed by part name. */
    fasteners?: Readonly<Record<string, FastenerMotionInput>>;
    /** Declared press/snap fits, keyed by the inserted part name. */
    fits?: Readonly<Record<string, FitInput | FitKind>>;
    /** Run the approximate P3 support-polygon stability pass on the sequence. */
    stability?: boolean;
    /** World-space gravity direction for P3. Default [0, 0, -1]; magnitude is ignored. */
    gravity?: Vec3;
    /** Declared base/fixture part names for P3. Default: the lowest part(s). */
    fixtures?: string[];
    /** P3 contact distance in mm. Default 0.05. */
    contactToleranceMm?: number;
}
export interface AssemblyPathDirection {
    direction: Vec3;
    distanceMm: number;
    clear: boolean;
    blockingParts: string[];
}
export interface AssemblyPathPartReport {
    part: string;
    removable: boolean;
    validDirections: Vec3[];
    directions: AssemblyPathDirection[];
    /** Planner state. `blocked` and `unknown` are never "impossible";
     *  `requires-force` is a declared fit, not a geometric proof. */
    state: PartState;
    /** Recorded when a helical fastener motion was declared. */
    fastener?: HelicalMotionSummary;
    /** Present when a declared/default tool envelope was swept. */
    toolReach?: ToolReachFinding;
}
export interface AssemblyPathReport {
    ok: boolean;
    source: 'local';
    basis: 'continuous-triangle-mesh';
    limitations: string[];
    model: ModelStamp;
    parts: AssemblyPathPartReport[];
    /** Union of the initial per-direction blocker sets. */
    blockingGraph: DirectionalBlockingGraph;
    removalOrder?: {
        part: string;
        direction: Vec3;
    }[];
    stuckParts?: string[];
    /** Present when `sequence: true`. */
    sequence?: AssemblySequence;
    /** Sampling fallback findings; each is labeled found-by-search, never proven. */
    search?: SearchFinding[];
    /** Press/snap fits ordered as declared force steps (never proven). */
    requiresForce?: RequiresForceFinding[];
    /** Declared/default tool envelopes that cannot reach their fastener. */
    toolBlocked?: ToolBlockFinding[];
    /** Every tool reach result (clear or blocked), when a tool was modelled. */
    toolReach?: ToolReachFinding[];
    /** S2 adapter entries for modelled tool reach and declared force fits.
     *  Attached by the MCP tool; absent from the pure mesh API. */
    requirements?: RequirementsLedger;
}
type Bounds = {
    min: Vec3;
    max: Vec3;
};
interface Prepared extends AssemblyPathPart {
    bbox: Bounds;
    triangles: Triangle[];
    triangleBounds: Bounds[];
    bvh: TriangleBvh;
}
const CARDINAL: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const DEFAULT_WORK_BUDGET = 8000000;
const LIMITATIONS = 'Local watertight mesh validation, not BREP or hardware acceptance. Positive-travel contact is conservatively blocked; starting contact may also block sliding. Mesh tessellation approximates curves. Straight translation and declared helical fastener motion only; no mate solving, deformation, thread engagement or torque. Press/snap fits are declared, never simulated. Tool reach is a swept-envelope approximation, not a driver drawing. Static stability is approximate: a centre-of-mass projection onto a support polygon of mesh contacts with already-stable parts, not gravity simulation, friction, tipping or fixture analysis. A needs-hold finding names an external hold the model cannot prove. Subassembly and multi-part moves are heuristic, not exhaustive. Sampling paths are found-by-search, never proven. Blocked and unknown parts are not "impossible".';
const DEFAULT_TESSELLATION: MeshTessellationStamp = {
    linearMm: null,
    relative: null,
    angularRad: null,
    source: 'caller-supplied triangle mesh; tessellation not declared',
};
class AssemblyPathBudgetError extends Error {
    constructor() {
        super('Assembly path total work budget exceeded; simplify meshes or split the assembly.');
        this.name = 'AssemblyPathBudgetError';
    }
}
function validateFastenerOptions(options: AssemblyPathOptions): void {
    if (options.sequence !== undefined && typeof options.sequence !== 'boolean')
        throw new Error('sequence must be boolean.');
    const names = options.threadedFasteners;
    if (names !== undefined && (!Array.isArray(names) || names.some(name => typeof name !== 'string' || !name) || new Set(names).size !== names.length))
        throw new Error('threadedFasteners must contain unique nonempty part names.');
}
function validateWorkBudget(options: AssemblyPathOptions): void {
    if (options.workBudget !== undefined && (!Number.isFinite(options.workBudget) || options.workBudget <= 0))
        throw new Error('workBudget must be a positive finite number.');
}
function validateTessellation(t: Partial<MeshTessellationStamp>): void {
    for (const key of ['linearMm', 'angularRad'] as const)
        if (t[key] !== undefined && t[key] !== null && (!Number.isFinite(t[key]) || t[key]! < 0))
            throw new Error(`tessellation.${key} must be a finite nonnegative number or null.`);
    if (t.relative !== undefined && t.relative !== null && typeof t.relative !== 'boolean')
        throw new Error('tessellation.relative must be boolean or null.');
    if (t.source !== undefined && (typeof t.source !== 'string' || !t.source))
        throw new Error('tessellation.source must be a nonempty string.');
}
function validateSequenceOptions(options: AssemblyPathOptions): void {
    validateFastenerOptions(options);
    validateWorkBudget(options);
    if (options.tessellation !== undefined)
        validateTessellation(options.tessellation);
    if (options.search !== undefined && typeof options.search !== 'boolean')
        throw new Error('search must be boolean.');
    for (const key of ['searchBudget', 'partitionBudget'] as const)
        if (options[key] !== undefined && (!Number.isInteger(options[key]) || options[key]! <= 0))
            throw new Error(`${key} must be a positive integer.`);
    validateSubassemblies(options.subassemblies);
    validateTools(options.tools);
    validateFastenerOptionsMaps(options.fasteners, options.fits);
    validateStabilityOptions(options);
}
function validateStabilityOptions(options: AssemblyPathOptions): void {
    if (options.stability !== undefined && typeof options.stability !== 'boolean')
        throw new Error('stability must be boolean.');
    if (options.stability === true && options.sequence !== true)
        throw new Error('stability requires sequence: true.');
    if (options.gravity !== undefined && (!Array.isArray(options.gravity) || options.gravity.length !== 3
        || !options.gravity.every(Number.isFinite) || !(Math.hypot(...options.gravity) > 0)))
        throw new Error('gravity must be a finite nonzero [x, y, z] direction.');
    if (options.contactToleranceMm !== undefined
        && (!Number.isFinite(options.contactToleranceMm) || options.contactToleranceMm < 0))
        throw new Error('contactToleranceMm must be a finite nonnegative number.');
    if (options.fixtures !== undefined && (!Array.isArray(options.fixtures)
        || options.fixtures.some(name => typeof name !== 'string' || !name)
        || new Set(options.fixtures).size !== options.fixtures.length))
        throw new Error('fixtures must contain unique nonempty part names.');
}
function validateSubassemblies(groups: readonly SubassemblyInput[] | undefined): void {
    if (groups === undefined)
        return;
    if (!Array.isArray(groups))
        throw new Error('subassemblies must be an array.');
    const names = new Set<string>();
    const members = new Set<string>();
    for (const group of groups) {
        if (!group || typeof group.name !== 'string' || !group.name || names.has(group.name))
            throw new Error('subassemblies must have unique nonempty names.');
        if (!Array.isArray(group.parts) || group.parts.length < 2 || group.parts.some((part: unknown) => typeof part !== 'string' || !part))
            throw new Error(`subassembly '${group.name}' must name at least two parts.`);
        if (new Set(group.parts).size !== group.parts.length)
            throw new Error(`subassembly '${group.name}' lists a part more than once.`);
        for (const part of group.parts) {
            if (members.has(part))
                throw new Error(`part '${part}' belongs to more than one subassembly.`);
            members.add(part);
        }
        names.add(group.name);
    }
}
function validateTools(tools: Readonly<Record<string, string>> | undefined): void {
    if (tools === undefined)
        return;
    for (const [part, tool] of Object.entries(tools))
        if (!part || typeof tool !== 'string' || !tool)
            throw new Error('tools must map nonempty part names to nonempty tool names.');
}
function validateFastenerOptionsMaps(
    fasteners: Readonly<Record<string, FastenerMotionInput>> | undefined,
    fits: Readonly<Record<string, FitInput | FitKind>> | undefined,
): void {
    if (fasteners !== undefined) {
        if (!fasteners || typeof fasteners !== 'object' || Array.isArray(fasteners))
            throw new Error('fasteners must key part names to fastener motion records.');
        for (const [name, spec] of Object.entries(fasteners)) {
            if (!name)
                throw new Error('fasteners must key nonempty part names.');
            normalizeFastenerMotion(spec, `fasteners.${name}`);
        }
    }
    if (fits !== undefined) {
        if (!fits || typeof fits !== 'object' || Array.isArray(fits))
            throw new Error('fits must key part names to fit records.');
        for (const [name, fit] of Object.entries(fits)) {
            if (!name)
                throw new Error('fits must key nonempty part names.');
            normalizeFit(fit, `fits.${name}`);
        }
    }
}
/** Validate names after the part list is known and normalize the maps. */
function normalizeMetadata(
    parts: readonly Prepared[],
    options: AssemblyPathOptions,
): { fasteners: Map<string, FastenerMotion>; fits: Map<string, FitInput> } {
    const names = new Set(parts.map(part => part.name));
    const fasteners = new Map<string, FastenerMotion>();
    for (const [name, spec] of Object.entries(options.fasteners ?? {})) {
        if (!names.has(name))
            throw new Error(`fasteners names unknown part '${name}'.`);
        fasteners.set(name, normalizeFastenerMotion(spec, `fasteners.${name}`));
    }
    const fits = new Map<string, FitInput>();
    for (const [name, fit] of Object.entries(options.fits ?? {})) {
        if (!names.has(name))
            throw new Error(`fits names unknown part '${name}'.`);
        fits.set(name, normalizeFit(fit, `fits.${name}`));
    }
    return { fasteners, fits };
}
function candidates(options: AssemblyPathOptions): Vec3[] {
    if (options.disassemblyOrder !== undefined && typeof options.disassemblyOrder !== 'boolean')
        throw new Error('disassemblyOrder must be boolean.');
    validateSequenceOptions(options);
    if (options.directions !== undefined && (!Array.isArray(options.directions) || options.directions.length > 64))
        throw new Error('directions must be an array of at most 64 vectors.');
    const out = CARDINAL.map(v => [...v] as Vec3);
    for (const v of options.directions ?? []) {
        if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite) || !(Math.hypot(...v) > 0) || !Number.isFinite(Math.hypot(...v)))
            throw new Error('directions must contain finite nonzero [x,y,z] vectors.');
        const n = v.map(x => x / Math.hypot(...v)) as Vec3;
        if (!out.some(d => Math.hypot(...d.map((x, i) => x - n[i])) < 1e-9))
            out.push(n);
    }
    return out;
}
function assertValidMeshArrays(part: AssemblyPathPart): void {
    const { vertices: v, triangles: t } = part.mesh;
    const validVertices = v.length > 0 && v.length % 3 === 0 && v.every(Number.isFinite);
    const validIndices = t.length > 0 && t.length % 3 === 0 && t.every(i => Number.isInteger(i) && i >= 0 && i < v.length / 3);
    if (!validVertices || !validIndices)
        throw new Error(`Invalid mesh for '${part.name}'.`);
}
/** Build triangles and face adjacency, rejecting degenerate, duplicate, open or non-manifold input. */
function buildTopology(part: AssemblyPathPart): { triangles: Triangle[]; neighbors: number[][] } {
    const { vertices: v, triangles: t } = part.mesh;
    const vertex = (i: number): Vec3 => [v[3 * i], v[3 * i + 1], v[3 * i + 2]];
    const triangles: Triangle[] = [];
    const edgeCounts = new Map<string, number>();
    const edgeDirections = new Map<string, number>();
    const faces = new Set<string>();
    const edgeFaces = new Map<string, number>();
    const neighbors: number[][] = Array.from({ length: t.length / 3 }, () => []);
    for (let i = 0; i < t.length; i += 3) {
        const ids = t.slice(i, i + 3);
        if (new Set(ids).size !== 3)
            throw new Error(`Degenerate mesh for '${part.name}'.`);
        const faceKey = [...ids].sort((a, b) => a - b).join(':');
        if (faces.has(faceKey))
            throw new Error(`Duplicate mesh face for '${part.name}'.`);
        faces.add(faceKey);
        triangles.push(ids.map(vertex) as unknown as Triangle);
        for (let j = 0; j < 3; j++) {
            const a = ids[j], b = ids[(j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
            edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
            edgeDirections.set(key, (edgeDirections.get(key) ?? 0) + (a < b ? 1 : -1));
            const face = i / 3, other = edgeFaces.get(key);
            if (other === undefined)
                edgeFaces.set(key, face);
            else {
                neighbors[face].push(other);
                neighbors[other].push(face);
            }
        }
    }
    if ([...edgeCounts.values()].some(n => n !== 2) || [...edgeDirections.values()].some(n => n !== 0))
        throw new Error(`Mesh for '${part.name}' must be closed and manifold.`);
    return { triangles, neighbors };
}
function prepare(part: AssemblyPathPart, consumeWork: (amount?: number) => void): Prepared {
    const { vertices: v, triangles: t } = part.mesh;
    consumeWork(v.length + t.length);
    assertValidMeshArrays(part);
    const { triangles, neighbors } = buildTopology(part);
    consumeWork(triangles.length * 4);
    assertSolidComponents(part.name, triangles, neighbors);
    const bvh = new TriangleBvh(part.mesh, consumeWork);
    if (bvh.triangleCount !== triangles.length)
        throw new Error(`Degenerate mesh for '${part.name}'.`);
    const bbox: Bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let i = 0; i < v.length; i++) {
        const axis = i % 3;
        bbox.min[axis] = Math.min(bbox.min[axis], v[i]);
        bbox.max[axis] = Math.max(bbox.max[axis], v[i]);
    }
    const triangleBounds = triangles.map(t => ({ min: [0, 1, 2].map(i => Math.min(...t.map(p => p[i]))) as Vec3, max: [0, 1, 2].map(i => Math.max(...t.map(p => p[i]))) as Vec3 }));
    return { ...part, bbox, triangles, triangleBounds, bvh };
}
/** Closed shells may be disconnected (including negatively oriented cavity
 * shells), but every shell must enclose volume. Use a local origin to avoid
 * cancellation when a small component lies far from the world origin. */
function assertSolidComponents(name: string, triangles: Triangle[], neighbors: number[][]): void {
    const visited = new Set<number>();
    for (let start = 0; start < triangles.length; start++) {
        if (visited.has(start))
            continue;
        const origin = triangles[start][0], stack = [start];
        let volume6 = 0;
        while (stack.length) {
            const index = stack.pop()!;
            if (visited.has(index))
                continue;
            visited.add(index);
            const [a, b, c] = triangles[index].map(p => p.map((x, i) => x - origin[i]));
            volume6 += a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
            stack.push(...neighbors[index]);
        }
        if (!Number.isFinite(volume6) || Math.abs(volume6) < 1e-12)
            throw new Error(`Mesh component for '${name}' must bound nonzero solid volume.`);
    }
}
function union(parts: Prepared[]): Bounds {
    return { min: [0, 1, 2].map(i => Math.min(...parts.map(p => p.bbox.min[i]))) as Vec3, max: [0, 1, 2].map(i => Math.max(...parts.map(p => p.bbox.max[i]))) as Vec3 };
}
function travel(box: Bounds, assembly: Bounds, dir: Vec3): number {
    return Math.min(...dir.map((d, i) => d > 1e-12 ? (assembly.max[i] - box.min[i] + 1e-6) / d : d < -1e-12 ? (assembly.min[i] - box.max[i] - 1e-6) / d : Infinity));
}
function swept(box: Bounds, dir: Vec3, distance: number): Bounds {
    return { min: box.min.map((x, i) => x + Math.min(0, dir[i] * distance)) as Vec3, max: box.max.map((x, i) => x + Math.max(0, dir[i] * distance)) as Vec3 };
}
function strictlyInside(point: Vec3, part: Prepared, consumeWork: () => void): boolean {
    consumeWork();
    if (point.some((x, i) => x < part.bbox.min[i] || x > part.bbox.max[i]))
        return false;
    const classification = classifySolidPoint(point, part.triangles, consumeWork);
    if (classification === 'unknown')
        throw new Error(`Assembly path containment for '${part.name}' is numerically ambiguous; no clear result is available.`);
    return classification === 'inside';
}
function contained(a: Prepared, b: Prepared, consumeWork: () => void): boolean {
    // Classify each vertex once, rather than repeating shared triangle corners.
    const inOther = (part: Prepared, other: Prepared): boolean => {
        for (let i = 0; i < part.mesh.vertices.length; i += 3) {
            const v = part.mesh.vertices;
            if (strictlyInside([v[i], v[i + 1], v[i + 2]], other, consumeWork))
                return true;
        }
        return false;
    };
    return inOther(a, b) || inOther(b, a);
}
function tessellationStamp(options: AssemblyPathOptions): MeshTessellationStamp {
    const declared = options.tessellation;
    return {
        linearMm: declared?.linearMm ?? DEFAULT_TESSELLATION.linearMm,
        relative: declared?.relative ?? DEFAULT_TESSELLATION.relative,
        angularRad: declared?.angularRad ?? DEFAULT_TESSELLATION.angularRad,
        source: declared?.source ?? DEFAULT_TESSELLATION.source,
    };
}
function budgetReport(parts: AssemblyPathPart[], dirs: Vec3[], model: ModelStamp): AssemblyPathReport {
    const reports: AssemblyPathPartReport[] = parts.map(part => ({
        part: part.name,
        removable: false,
        validDirections: [],
        directions: [],
        state: { kind: 'unknown', reason: 'budget' },
    }));
    return {
        ok: false,
        source: 'local',
        basis: 'continuous-triangle-mesh',
        limitations: [LIMITATIONS],
        model,
        parts: reports,
        blockingGraph: { parts: parts.map(p => p.name), directions: dirs.map(d => [...d] as Vec3), edges: [] },
        stuckParts: parts.map(p => p.name),
        sequence: { steps: [], model, unknown: parts.map(p => p.name) },
    };
}
type BlockedCheck = (a: Prepared, b: Prepared, dir: Vec3, distance: number) => boolean;
function createBlockedCheck(consumeWork: (amount?: number) => void): BlockedCheck {
    const overlaps = new Map<string, boolean>();
    return (a, b, dir, distance) => {
        consumeWork();
        if (bboxGap(swept(a.bbox, dir, distance), b.bbox) > 0)
            return false;
        const key = [a.name, b.name].sort().join('\t');
        if (!overlaps.has(key))
            overlaps.set(key, bboxGap(a.bbox, b.bbox) === 0 && contained(a, b, consumeWork));
        if (overlaps.get(key))
            return true;
        for (let i = 0; i < a.triangles.length; i++) {
            const sweptBounds = swept(a.triangleBounds[i], dir, distance);
            consumeWork();
            for (const j of b.bvh.overlappingTriangles(sweptBounds, consumeWork)) {
                consumeWork();
                if (trianglesCollideAlong(a.triangles[i], b.triangles[j], dir, distance))
                    return true;
            }
        }
        return false;
    };
}
/** Sweep-only variant for the sampling fallback. A path that starts outside a
 *  solid cannot become contained without crossing a boundary, and the swept
 *  triangle test catches that crossing; skipping per-segment containment keeps
 *  the strict sampling budget affordable. */
function createSearchBlockedCheck(consumeWork: (amount?: number) => void): BlockedCheck {
    return (a, b, dir, distance) => {
        consumeWork();
        if (bboxGap(swept(a.bbox, dir, distance), b.bbox) > 0)
            return false;
        for (let i = 0; i < a.triangles.length; i++) {
            const sweptBounds = swept(a.triangleBounds[i], dir, distance);
            consumeWork();
            for (const j of b.bvh.overlappingTriangles(sweptBounds, consumeWork)) {
                consumeWork();
                if (trianglesCollideAlong(a.triangles[i], b.triangles[j], dir, distance))
                    return true;
            }
        }
        return false;
    };
}
function classifyPart(
    part: Prepared,
    remaining: Prepared[],
    dirs: Vec3[],
    blocked: BlockedCheck,
    threaded: ReadonlySet<string>,
    fasteners: ReadonlyMap<string, FastenerMotion>,
    fits: ReadonlyMap<string, FitInput>,
    tools: ReadonlyMap<string, ToolReachFinding>,
    sweepBlocked: SweepBlocked,
): AssemblyPathPartReport {
    const spec = fasteners.get(part.name);
    if (spec) {
        const result = classifyFastenerHelix(part, remaining, spec, sweepBlocked);
        const tool = tools.get(part.name);
        return {
            part: part.name,
            removable: result.state.kind === 'removable',
            validDirections: result.state.kind === 'removable' ? result.directions.filter(entry => entry.clear).map(entry => entry.direction) : [],
            directions: result.directions,
            state: result.state,
            fastener: result.fastener,
            ...(tool !== undefined ? { toolReach: tool } : {}),
        };
    }
    const bounds = union(remaining);
    const directions = dirs.map(direction => {
        const distanceMm = travel(part.bbox, bounds, direction);
        const blockingParts = remaining.filter(b => b !== part && blocked(part, b, direction, distanceMm)).map(b => b.name);
        return { direction: [...direction] as Vec3, distanceMm, clear: !blockingParts.length, blockingParts };
    });
    const validDirections = directions.filter(d => d.clear).map(d => d.direction);
    const fit = fits.get(part.name);
    const state = fit !== undefined
        ? classifyFit(directions, fit)
        : partState(directions, threaded.has(part.name));
    return {
        part: part.name,
        removable: state.kind === 'removable',
        validDirections,
        directions,
        state,
    };
}
interface PeelOutcome {
    removal: { part: string; direction: Vec3 }[];
    remaining: Prepared[];
    budgetExceeded: boolean;
}
function peelRemoval(
    prepared: Prepared[],
    report: (part: Prepared, remaining: Prepared[]) => AssemblyPathPartReport,
    recoverBudget: boolean,
): PeelOutcome {
    let remaining = [...prepared];
    const removal: { part: string; direction: Vec3 }[] = [];
    let budgetExceeded = false;
    while (remaining.length) {
        let free: AssemblyPathPartReport | undefined;
        try {
            for (const part of remaining) {
                const candidate = report(part, remaining);
                if (candidate.state.kind === 'removable') {
                    free = candidate;
                    break;
                }
            }
        }
        catch (error) {
            if (recoverBudget && error instanceof AssemblyPathBudgetError) {
                budgetExceeded = true;
                break;
            }
            throw error;
        }
        if (!free)
            break;
        removal.push({ part: free.part, direction: free.validDirections[0] });
        remaining = remaining.filter(p => p.name !== free.part);
    }
    return { removal, remaining, budgetExceeded };
}
interface SequencePlanInput {
    dirs: Vec3[];
    threaded: ReadonlySet<string>;
    fasteners: ReadonlyMap<string, FastenerMotion>;
    fits: ReadonlyMap<string, FitInput>;
    tools: ReadonlyMap<string, ToolReachFinding>;
    blocked: BlockedCheck;
    searchBlocked: BlockedCheck;
    consumeWork: (amount?: number) => void;
    options: AssemblyPathOptions;
}
function stampMotions(model: ModelStamp, steps: readonly Step[], tools: readonly ToolReachFinding[]): void {
    for (const step of steps) {
        if (step.motion === 'helical')
            addMotionModel(model, 'helical-screw');
        else if (step.motion === 'requires-force')
            addMotionModel(model, 'requires-force');
        else if (step.motion === 'search')
            addMotionModel(model, 'sampling-search');
    }
    if (tools.length > 0)
        model.toolReach = 'swept-envelope';
}
function applyStabilityPass(
    steps: Step[],
    prepared: readonly Prepared[],
    options: AssemblyPathOptions,
    model: ModelStamp,
): NeedsHoldFinding[] {
    if (options.stability !== true)
        return [];
    const stability = assessSequenceStability(steps, prepared, {
        gravity: options.gravity ?? [0, 0, -1],
        ...(options.fixtures !== undefined ? { fixtures: options.fixtures } : {}),
        contactToleranceMm: options.contactToleranceMm ?? DEFAULT_STABILITY_CONTACT_TOLERANCE_MM,
    });
    for (const step of steps) {
        const state = stability.steps.get(step.index);
        if (state === undefined)
            continue;
        step.stability = state.state;
        if (state.state === 'stable' && state.supports.length > 0)
            step.heldBy = state.supports;
    }
    model.gravity = 'approximate-support-projection';
    model.stability = stability.stamp;
    return stability.findings;
}
function buildAssemblySequence(
    plan: ReturnType<typeof planAssemblySequence>,
    model: ModelStamp,
    unknown: string[],
    toolBlocked: ToolBlockFinding[],
    needsHold: NeedsHoldFinding[],
): AssemblySequence {
    return {
        steps: plan.steps,
        model,
        unknown,
        ...(plan.search.length > 0 ? { search: plan.search } : {}),
        ...(plan.requiresForce.length > 0 ? { requiresForce: plan.requiresForce } : {}),
        ...(toolBlocked.length > 0 ? { toolBlocked } : {}),
        ...(needsHold.length > 0 ? { needsHold } : {}),
    };
}
function applySequence(result: AssemblyPathReport, prepared: Prepared[], input: SequencePlanInput, model: ModelStamp): void {
    const plan = planAssemblySequence(prepared, {
        prepare: (name, mesh) => prepare({ name, mesh }, input.consumeWork),
        classify: (part, remaining, isThreaded) => classifyPart(
            part as Prepared,
            remaining as Prepared[],
            input.dirs,
            input.blocked,
            isThreaded ? new Set([part.name]) : new Set<string>(),
            input.fasteners,
            input.fits,
            input.tools,
            (a, b, direction, distance) => input.searchBlocked(a as Prepared, b as Prepared, direction, distance),
        ),
        blocked: input.blocked,
        searchBlocked: input.searchBlocked,
    }, { ...input.options, requiresForce: new Set(input.fits.keys()) }, input.threaded);
    for (const part of result.parts) {
        if (plan.ordered.has(part.part))
            continue;
        const reason = plan.unknownReasons.get(part.part)
            ?? (input.threaded.has(part.part) && !input.fasteners.has(part.part) ? 'non-straight-path' : undefined);
        if (reason)
            part.state = { kind: 'unknown', reason };
    }
    const toolReach = [...input.tools.values()];
    const toolBlocked = toolReach.filter((finding): finding is ToolBlockFinding => finding.status === 'tool-blocked');
    stampMotions(model, plan.steps, toolReach);
    const needsHold = applyStabilityPass(plan.steps, prepared, input.options, model);
    const unknown = result.parts.filter(part => part.state.kind === 'unknown').map(part => part.part);
    result.ok = plan.ok && needsHold.length === 0;
    result.sequence = buildAssemblySequence(plan, model, unknown, toolBlocked, needsHold);
    result.search = plan.search.length > 0 ? plan.search : undefined;
    result.requiresForce = plan.requiresForce.length > 0 ? plan.requiresForce : undefined;
    result.toolReach = toolReach.length > 0 ? toolReach : undefined;
    result.toolBlocked = toolBlocked.length > 0 ? toolBlocked : undefined;
    result.stuckParts = plan.remaining;
    result.removalOrder = plan.removalOrder;
}
function assertParts(parts: readonly AssemblyPathPart[]): void {
    if (!parts.length || parts.length > 128 || parts.some(p => !p.name) || new Set(parts.map(p => p.name)).size !== parts.length)
        throw new Error('Assembly requires 1–128 uniquely named parts.');
}
function threadedSet(parts: readonly AssemblyPathPart[], options: AssemblyPathOptions): Set<string> {
    const threaded = new Set([...(options.threadedFasteners ?? []), ...parts.filter(p => p.threadedFastener === true).map(p => p.name)]);
    const unknown = [...threaded].filter(name => !parts.some(p => p.name === name));
    if (unknown.length)
        throw new Error(`threadedFasteners names unknown part(s): ${unknown.join(', ')}.`);
    return threaded;
}
function buildToolFindings(
    prepared: readonly Prepared[],
    fasteners: ReadonlyMap<string, FastenerMotion>,
    sweepBlocked: SweepBlocked,
): Map<string, ToolReachFinding> {
    const tools = new Map<string, ToolReachFinding>();
    for (const part of prepared) {
        const spec = fasteners.get(part.name);
        if (!spec)
            continue;
        const finding = checkToolReach(part, prepared, spec, sweepBlocked);
        if (finding)
            tools.set(part.name, finding);
    }
    return tools;
}
interface MeshWorkspace {
    prepared: Prepared[];
    blocked: BlockedCheck;
    searchBlocked: BlockedCheck;
    sweepBlocked: SweepBlocked;
    fasteners: Map<string, FastenerMotion>;
    fits: Map<string, FitInput>;
    tools: Map<string, ToolReachFinding>;
    report: (part: Prepared, remaining: Prepared[]) => AssemblyPathPartReport;
}
function meshWorkspace(
    parts: readonly AssemblyPathPart[],
    options: AssemblyPathOptions,
    dirs: Vec3[],
    threaded: ReadonlySet<string>,
    consumeWork: (amount?: number) => void,
): MeshWorkspace {
    const prepared = parts.map(part => prepare(part, consumeWork));
    const blocked = createBlockedCheck(consumeWork);
    const searchBlocked = createSearchBlockedCheck(consumeWork);
    const sweepBlocked: SweepBlocked = (a, b, direction, distance) =>
        searchBlocked(a as Prepared, b as Prepared, direction, distance);
    const { fasteners, fits } = normalizeMetadata(prepared, options);
    const tools = buildToolFindings(prepared, fasteners, sweepBlocked);
    const report = (part: Prepared, remaining: Prepared[]): AssemblyPathPartReport => classifyPart(
        part, remaining, dirs, blocked, threaded, fasteners, fits, tools, sweepBlocked,
    );
    return { prepared, blocked, searchBlocked, sweepBlocked, fasteners, fits, tools, report };
}
function initialResult(
    workspace: MeshWorkspace,
    model: ModelStamp,
): { result: AssemblyPathReport; toolBlocked: ToolBlockFinding[] } {
    const initial = workspace.prepared.map(part => workspace.report(part, workspace.prepared));
    const toolReach = [...workspace.tools.values()];
    const toolBlocked = toolReach.filter((finding): finding is ToolBlockFinding => finding.status === 'tool-blocked');
    if (toolReach.length > 0)
        model.toolReach = 'swept-envelope';
    return {
        result: {
            ok: initial.every(part => part.removable) && toolBlocked.length === 0,
            source: 'local',
            basis: 'continuous-triangle-mesh',
            limitations: [LIMITATIONS],
            model,
            parts: initial,
            blockingGraph: buildDirectionalBlockingGraph(initial),
            ...(toolReach.length > 0 ? { toolReach } : {}),
            ...(toolBlocked.length > 0 ? { toolBlocked } : {}),
        },
        toolBlocked,
    };
}
function applyOptionalPasses(
    result: AssemblyPathReport,
    workspace: MeshWorkspace,
    dirs: Vec3[],
    threaded: ReadonlySet<string>,
    options: AssemblyPathOptions,
    model: ModelStamp,
    toolBlocked: readonly ToolBlockFinding[],
    consumeWork: (amount?: number) => void,
): void {
    if (options.disassemblyOrder) {
        const peel = peelRemoval(workspace.prepared, workspace.report, options.sequence === true);
        result.removalOrder = peel.removal;
        result.ok = !peel.remaining.length && toolBlocked.length === 0;
        result.stuckParts = peel.remaining.map(part => part.name);
    }
    if (options.sequence) {
        applySequence(result, workspace.prepared, {
            dirs, threaded,
            fasteners: workspace.fasteners,
            fits: workspace.fits,
            tools: workspace.tools,
            blocked: workspace.blocked,
            searchBlocked: workspace.searchBlocked,
            consumeWork,
            options,
        }, model);
    }
}
/** Pure checker for already world-space, closed meshes. No input mutation. */
export function checkAssemblyPathMeshes(parts: AssemblyPathPart[], options: AssemblyPathOptions = {}): AssemblyPathReport {
    const dirs = candidates(options);
    assertParts(parts);
    const threaded = threadedSet(parts, options);
    const model = makeModelStamp(dirs, tessellationStamp(options));
    const maxWork = options.workBudget ?? DEFAULT_WORK_BUDGET;
    let work = 0;
    const consumeWork = (amount = 1): void => {
        work += amount;
        if (work > maxWork)
            throw new AssemblyPathBudgetError();
    };
    try {
        const workspace = meshWorkspace(parts, options, dirs, threaded, consumeWork);
        const { result, toolBlocked } = initialResult(workspace, model);
        applyOptionalPasses(result, workspace, dirs, threaded, options, model, toolBlocked, consumeWork);
        return result;
    }
    catch (error) {
        if (options.sequence && error instanceof AssemblyPathBudgetError)
            return budgetReport(parts, dirs, model);
        throw error;
    }
}
