// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P3 — approximate static stability for the build sequence. The partial
// assembly is tested by projecting each newly placed part's centre of mass
// along gravity onto the convex hull of its contacts with already-stable
// parts. This is a support-polygon projection, not a physics simulation.
import type { Vec3 } from '../../shared/intent/types';
import type { DfmMesh, TriangleBvh } from './dfm/meshBvh';
import { bboxGap } from './dfm/clearance';
import type {
    NeedsHoldFinding,
    StabilityStamp,
    StabilityState,
    Step,
} from './assemblySequence';

/** Default surface distance (mm) at or below which parts count as touching. */
export const DEFAULT_STABILITY_CONTACT_TOLERANCE_MM = 0.05;

export interface StabilityPart {
    name: string;
    mesh: DfmMesh;
    bbox: { min: Vec3; max: Vec3 };
    bvh: TriangleBvh;
}

export interface StabilityOptions {
    /** World-space gravity direction. Magnitude is ignored; zero is rejected. */
    gravity: Vec3;
    /** Declared base/fixture part names. When absent, the lowest parts seed the model. */
    fixtures?: readonly string[];
    /** Surface distance at or below which parts count as touching. */
    contactToleranceMm: number;
}

export interface StepStability {
    state: StabilityState;
    /** Stable parts contacted for support; empty for a fixture/seed step. */
    supports: string[];
}

export interface StabilityAssessment {
    findings: NeedsHoldFinding[];
    /** Keyed by `Step.index`. */
    steps: Map<number, StepStability>;
    stamp: StabilityStamp;
}

interface Projection {
    up: Vec3;
    e1: Vec3;
    e2: Vec3;
}

interface ProjectedPoint {
    x: number;
    y: number;
    world: Vec3;
}

const EPS = 1e-9;

function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function scale(v: Vec3, s: number): Vec3 {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function normalize(v: Vec3): Vec3 {
    const length = Math.hypot(v[0], v[1], v[2]);
    if (!(length > EPS) || !Number.isFinite(length))
        throw new Error('Stability gravity must be a finite nonzero vector.');
    return scale(v, 1 / length);
}

function cross(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

function projectionFor(gravity: Vec3): Projection {
    const up = normalize([-gravity[0], -gravity[1], -gravity[2]]);
    const helper: Vec3 = Math.abs(up[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = normalize(cross(up, helper));
    const e2 = cross(up, e1);
    return { up, e1, e2 };
}

function project(point: Vec3, projection: Projection): ProjectedPoint {
    return { x: dot(point, projection.e1), y: dot(point, projection.e2), world: [...point] as Vec3 };
}

function pointKey(point: Vec3): string {
    return `${point[0].toFixed(6)},${point[1].toFixed(6)},${point[2].toFixed(6)}`;
}

function uniqueSorted(points: readonly Vec3[]): Vec3[] {
    const byKey = new Map<string, Vec3>();
    for (const point of points)
        byKey.set(pointKey(point), [...point] as Vec3);
    return [...byKey.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, point]) => point);
}

/** Signed-tetrahedron volume centroid of a closed triangle mesh. */
export function meshMassProperties(mesh: DfmMesh): { volumeMm3: number; centerOfMass: Vec3 } {
    const v = mesh.vertices;
    let volume6 = 0;
    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < mesh.triangles.length; i += 3) {
        const ia = mesh.triangles[i] * 3, ib = mesh.triangles[i + 1] * 3, ic = mesh.triangles[i + 2] * 3;
        const a: Vec3 = [v[ia], v[ia + 1], v[ia + 2]];
        const b: Vec3 = [v[ib], v[ib + 1], v[ib + 2]];
        const c: Vec3 = [v[ic], v[ic + 1], v[ic + 2]];
        const d = dot(a, cross(b, c));
        volume6 += d;
        mx += d * (a[0] + b[0] + c[0]);
        my += d * (a[1] + b[1] + c[1]);
        mz += d * (a[2] + b[2] + c[2]);
    }
    if (Math.abs(volume6) < EPS)
        return { volumeMm3: 0, centerOfMass: [0, 0, 0] };
    return {
        volumeMm3: Math.abs(volume6) / 6,
        centerOfMass: [mx / (4 * volume6), my / (4 * volume6), mz / (4 * volume6)],
    };
}

const SAMPLE_CACHE = new WeakMap<object, Vec3[]>();

/** Vertices plus triangle centroids; centroids catch a large face resting on
 *  a smaller one even when no vertex lies over the contact patch. */
function contactSamples(part: StabilityPart): Vec3[] {
    const cached = SAMPLE_CACHE.get(part.mesh);
    if (cached !== undefined)
        return cached;
    const points: Vec3[] = [];
    const v = part.mesh.vertices;
    for (let i = 0; i < v.length; i += 3)
        points.push([v[i], v[i + 1], v[i + 2]]);
    for (let i = 0; i < part.mesh.triangles.length; i += 3) {
        const ia = part.mesh.triangles[i] * 3, ib = part.mesh.triangles[i + 1] * 3, ic = part.mesh.triangles[i + 2] * 3;
        points.push([
            (v[ia] + v[ib] + v[ic]) / 3,
            (v[ia + 1] + v[ib + 1] + v[ic + 1]) / 3,
            (v[ia + 2] + v[ib + 2] + v[ic + 2]) / 3,
        ]);
    }
    const unique = uniqueSorted(points);
    SAMPLE_CACHE.set(part.mesh, unique);
    return unique;
}

function sampleContacts(to: StabilityPart, samples: readonly Vec3[], tolerance: number): Vec3[] {
    const out: Vec3[] = [];
    for (const point of samples) {
        const closest = to.bvh.closestPoint(point);
        if (closest !== null && closest.distance <= tolerance)
            out.push([...closest.point] as Vec3);
    }
    return out;
}

/** Contact points between two closed meshes, approximate by nearest surface. */
export function contactPointsBetween(a: StabilityPart, b: StabilityPart, tolerance: number): Vec3[] {
    if (bboxGap(a.bbox, b.bbox) > tolerance)
        return [];
    return uniqueSorted([
        ...sampleContacts(b, contactSamples(a), tolerance),
        ...sampleContacts(a, contactSamples(b), tolerance),
    ]);
}

function hull2d(points: readonly ProjectedPoint[]): ProjectedPoint[] {
    const unique = [...new Map(points.map(point => [`${point.x},${point.y}`, point])).values()]
        .sort((a, b) => a.x - b.x || a.y - b.y);
    if (unique.length <= 2)
        return unique;
    const turn = (o: ProjectedPoint, a: ProjectedPoint, b: ProjectedPoint): number =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: ProjectedPoint[] = [];
    for (const point of unique) {
        while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], point) <= EPS)
            lower.pop();
        lower.push(point);
    }
    const upper: ProjectedPoint[] = [];
    for (let i = unique.length - 1; i >= 0; i--) {
        const point = unique[i];
        while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], point) <= EPS)
            upper.pop();
        upper.push(point);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
}

function insideHull(point: ProjectedPoint, hull: readonly ProjectedPoint[]): boolean {
    if (hull.length < 3)
        return false;
    let sign = 0;
    for (let i = 0; i < hull.length; i++) {
        const a = hull[i], b = hull[(i + 1) % hull.length];
        const crossValue = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
        if (Math.abs(crossValue) <= EPS)
            continue;
        const next = crossValue > 0 ? 1 : -1;
        if (sign !== 0 && next !== sign)
            return false;
        sign = next;
    }
    return true;
}

function seedNames(parts: readonly StabilityPart[], options: StabilityOptions, projection: Projection): { names: string[]; source: StabilityStamp['seedSource'] } {
    if (options.fixtures !== undefined) {
        const known = new Set(parts.map(part => part.name));
        for (const name of options.fixtures)
            if (!known.has(name))
                throw new Error(`stability fixtures names unknown part '${name}'.`);
        return { names: [...new Set(options.fixtures)].sort(), source: 'declared-fixtures' };
    }
    const lowest = (part: StabilityPart): number => [0, 1, 2]
        .reduce((sum, axis) => sum + projection.up[axis] * (projection.up[axis] >= 0 ? part.bbox.min[axis] : part.bbox.max[axis]), 0);
    const heights = parts.map(part => ({ name: part.name, height: lowest(part) }));
    const minimum = Math.min(...heights.map(entry => entry.height));
    const tolerance = Math.max(1, Math.abs(minimum)) * 1e-9;
    return {
        names: heights.filter(entry => entry.height <= minimum + tolerance).map(entry => entry.name).sort(),
        source: 'inferred-lowest-parts',
    };
}

/** Stable support for one part against a set of already-stable parts. */
function partSupport(
    part: StabilityPart,
    centerOfMass: Vec3,
    stable: readonly string[],
    byName: ReadonlyMap<string, StabilityPart>,
    projection: Projection,
    tolerance: number,
): { stable: boolean; supports: string[]; supportPoints: Vec3[]; reason?: NeedsHoldFinding['reason'] } {
    const contactByPart = new Map<string, Vec3[]>();
    const centerHeight = dot(centerOfMass, projection.up);
    let allContacts = false;
    for (const name of stable) {
        const other = byName.get(name);
        if (other === undefined || other === part)
            continue;
        const contacts = contactPointsBetween(part, other, tolerance);
        if (contacts.length > 0)
            allContacts = true;
        const points = contacts.filter(point => dot(point, projection.up) <= centerHeight + tolerance);
        if (points.length > 0)
            contactByPart.set(name, points);
    }
    const supports = [...contactByPart.keys()].sort();
    const supportPoints = uniqueSorted([...contactByPart.values()].flat());
    if (!allContacts)
        return { stable: false, supports, supportPoints, reason: 'no-contact' };
    if (supportPoints.length === 0)
        return { stable: false, supports, supportPoints, reason: 'no-support-below-center-of-mass' };
    const hull = hull2d(supportPoints.map(point => project(point, projection)));
    const inside = insideHull(project(centerOfMass, projection), hull);
    return {
        stable: inside,
        supports,
        supportPoints: hull.map(entry => entry.world),
        ...(inside ? {} : { reason: 'center-of-mass-outside-support-polygon' as const }),
    };
}

/** Apply the P3 projection to a flat build sequence. Never mutates `steps`. */
export function assessSequenceStability(
    steps: readonly Step[],
    parts: readonly StabilityPart[],
    options: StabilityOptions,
): StabilityAssessment {
    if (!(options.contactToleranceMm >= 0) || !Number.isFinite(options.contactToleranceMm))
        throw new Error('stability contactToleranceMm must be a finite nonnegative number.');
    const projection = projectionFor(options.gravity);
    const byName = new Map(parts.map(part => [part.name, part]));
    const centers = new Map(parts.map(part => [part.name, meshMassProperties(part.mesh).centerOfMass]));
    const seed = seedNames(parts, options, projection);
    const stable = new Set(seed.names);
    const placed = new Set(seed.names);
    const findings: NeedsHoldFinding[] = [];
    const stepStates = new Map<number, StepStability>();
    for (const step of steps) {
        const added = [...new Set(step.adds)].filter(name => byName.has(name) && !placed.has(name));
        if (added.length === 0) {
            if (step.adds.length > 0 && step.adds.every(name => stable.has(name)))
                stepStates.set(step.index, { state: 'stable', supports: [] });
            continue;
        }
        const supports = new Set<string>();
        let needsHold = false;
        for (const name of added) {
            const part = byName.get(name)!;
            const centerOfMass = centers.get(name)!;
            const support = partSupport(part, centerOfMass, [...stable].sort(), byName, projection, options.contactToleranceMm);
            if (support.stable) {
                for (const supporter of support.supports)
                    supports.add(supporter);
            }
            else {
                needsHold = true;
                findings.push({
                    part: name,
                    status: 'needs-hold',
                    reason: support.reason ?? 'no-contact',
                    supports: support.supports,
                    centerOfMass: [...centerOfMass] as Vec3,
                    ...(support.supportPoints.length > 0 ? { supportPolygon: support.supportPoints } : {}),
                });
            }
            // A part that needs a hold is treated as held for later steps, so
            // one unsupported cantilever does not cascade through the stack.
            stable.add(name);
            placed.add(name);
        }
        stepStates.set(step.index, needsHold
            ? { state: 'needs-hold', supports: [...supports].sort() }
            : { state: 'stable', supports: [...supports].sort() });
    }
    findings.sort((a, b) => a.part.localeCompare(b.part));
    const stamp: StabilityStamp = {
        model: 'approximate-support-projection',
        gravity: [...options.gravity] as Vec3,
        contactToleranceMm: options.contactToleranceMm,
        seed: seed.names,
        seedSource: seed.source,
        massBasis: 'uniform-density-mesh-volume',
    };
    return { findings, steps: stepStates, stamp };
}
