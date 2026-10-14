// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { TriangleBvh, type DfmMesh } from './dfm/meshBvh';
import { bboxGap } from './dfm/clearance';
import { trianglesCollideAlong, type Triangle } from './assemblyPathSweep';
import type { Vec3 } from '../../shared/intent/types';
export interface AssemblyPathPart {
    name: string;
    mesh: DfmMesh;
}
export interface AssemblyPathOptions {
    /** Additional world-space removal vectors. Six cardinal directions always participate. */
    directions?: Vec3[];
    disassemblyOrder?: boolean;
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
}
export interface AssemblyPathReport {
    ok: boolean;
    source: 'local';
    basis: 'continuous-triangle-mesh';
    limitations: string[];
    parts: AssemblyPathPartReport[];
    removalOrder?: {
        part: string;
        direction: Vec3;
    }[];
    stuckParts?: string[];
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
const LIMITATIONS = 'Local watertight mesh validation, not BREP or hardware acceptance. Positive-travel contact is conservatively blocked; starting contact may also block sliding. Mesh tessellation approximates curves. Straight translation only; no mates, rotations, deformation or fastener unthreading. Greedy order is not exhaustive.';
function candidates(options: AssemblyPathOptions): Vec3[] {
    if (options.disassemblyOrder !== undefined && typeof options.disassemblyOrder !== 'boolean')
        throw new Error('disassemblyOrder must be boolean.');
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
function prepare(part: AssemblyPathPart): Prepared {
    const { vertices: v, triangles: t } = part.mesh;
    if (!v.length || v.length % 3 || !v.every(Number.isFinite) || !t.length || t.length % 3 || !t.every(i => Number.isInteger(i) && i >= 0 && i < v.length / 3))
        throw new Error(`Invalid mesh for '${part.name}'.`);
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
        const triangle = ids.map(vertex) as unknown as Triangle;
        triangles.push(triangle);
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
    assertSolidComponents(part.name, triangles, neighbors);
    const bvh = new TriangleBvh(part.mesh);
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
function strictlyInside(point: Vec3, bvh: TriangleBvh): boolean {
    if (!bvh.pointInside(point))
        return false;
    // BVH parity intentionally has no boundary classification. A vertex on
    // a face/edge is contact, not pre-existing solid overlap. Probe all axes
    // so a face parallel to one ray cannot hide the zero-distance hit.
    for (const axis of CARDINAL) {
        const hit = bvh.raycast(point, axis, { tMin: -1e-8 });
        if (hit && Math.abs(hit.t) < 1e-8)
            return false;
    }
    return true;
}
function contained(a: Prepared, b: Prepared): boolean {
    // Test both operands to catch either solid completely inside the other.
    return a.triangles.some(t => strictlyInside(t[0], b.bvh)) || b.triangles.some(t => strictlyInside(t[0], a.bvh));
}
/** Pure checker for already world-space, closed meshes. No input mutation. */
export function checkAssemblyPathMeshes(parts: AssemblyPathPart[], options: AssemblyPathOptions = {}): AssemblyPathReport {
    const dirs = candidates(options);
    if (!parts.length || parts.length > 128 || parts.some(p => !p.name) || new Set(parts.map(p => p.name)).size !== parts.length)
        throw new Error('Assembly requires 1–128 uniquely named parts.');
    const prepared = parts.map(prepare);
    let probes = 0;
    const overlaps = new Map<string, boolean>();
    const blocked = (a: Prepared, b: Prepared, dir: Vec3, distance: number): boolean => {
        if (bboxGap(swept(a.bbox, dir, distance), b.bbox) > 0)
            return false;
        const key = [a.name, b.name].sort().join('\t');
        if (!overlaps.has(key))
            overlaps.set(key, bboxGap(a.bbox, b.bbox) === 0 && contained(a, b));
        if (overlaps.get(key))
            return true;
        for (let i = 0; i < a.triangles.length; i++) {
            const sweptBounds = swept(a.triangleBounds[i], dir, distance);
            for (let j = 0; j < b.triangles.length; j++) {
                // Reuse the interference/DFM AABB lower bound before SAT.
                // Curved meshes have many triangles whose sweep cannot meet.
                if (bboxGap(sweptBounds, b.triangleBounds[j]) > 0)
                    continue;
                if (++probes > 2000000)
                    throw new Error('Assembly path triangle-pair budget exceeded; simplify meshes or split the assembly.');
                if (trianglesCollideAlong(a.triangles[i], b.triangles[j], dir, distance))
                    return true;
            }
        }
        return false;
    };
    const report = (part: Prepared, remaining: Prepared[]): AssemblyPathPartReport => {
        const bounds = union(remaining);
        const directions = dirs.map(direction => {
            const distanceMm = travel(part.bbox, bounds, direction);
            const blockingParts = remaining.filter(b => b !== part && blocked(part, b, direction, distanceMm)).map(b => b.name);
            return { direction: [...direction] as Vec3, distanceMm, clear: !blockingParts.length, blockingParts };
        });
        const validDirections = directions.filter(d => d.clear).map(d => d.direction);
        return { part: part.name, removable: !!validDirections.length, validDirections, directions };
    };
    const initial = prepared.map(p => report(p, prepared));
    const result: AssemblyPathReport = { ok: initial.every(p => p.removable), source: 'local', basis: 'continuous-triangle-mesh', limitations: [LIMITATIONS], parts: initial };
    if (options.disassemblyOrder) {
        let remaining = [...prepared];
        result.removalOrder = [];
        while (remaining.length) {
            const free = remaining.map(p => report(p, remaining)).find(p => p.removable);
            if (!free)
                break;
            result.removalOrder.push({ part: free.part, direction: free.validDirections[0] });
            remaining = remaining.filter(p => p.name !== free.part);
        }
        result.stuckParts = remaining.map(p => p.name);
        result.ok = !remaining.length;
    }
    return result;
}
