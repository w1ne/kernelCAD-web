// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P2 — geometric helical-motion and tool-envelope sweeps. This module is
// independent of mesh validation: it works on already-prepared world-space
// triangles, so `assemblyPath.ts` keeps the straight-line check and delegates
// the declared fastener motions here.
import type { Vec3 } from '../../shared/intent/types';
import type { Triangle } from './assemblyPathSweep';
import type {
    HelicalMotionSummary,
    PartState,
    ToolReachFinding,
} from './assemblySequence';
import type { FastenerMotion, FitInput, ToolEnvelope } from './assemblyFastener';

export interface MotionDirection {
    direction: Vec3;
    distanceMm: number;
    clear: boolean;
    blockingParts: string[];
}
export interface MotionBounds {
    min: Vec3;
    max: Vec3;
}
/** The subset of a prepared part these sweeps need; no BVH on the mover. */
export interface MotionPrepared {
    name: string;
    mesh: { readonly vertices: readonly number[]; readonly triangles: readonly number[] };
    bbox: MotionBounds;
    triangles: readonly Triangle[];
    triangleBounds: readonly MotionBounds[];
}
/** True when translating `a` along `dir` for `distance` hits `b`. */
export type SweepBlocked = (a: MotionPrepared, b: MotionPrepared, dir: Vec3, distance: number) => boolean;

const BASIS_EPS = 1e-9;
const vec = {
    add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n],
    dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    length: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
    center: (box: MotionBounds): Vec3 => [0, 1, 2].map(axis => (box.min[axis] + box.max[axis]) / 2) as Vec3,
};

function bboxCorners(box: MotionBounds): Vec3[] {
    const out: Vec3[] = [];
    for (const x of [box.min[0], box.max[0]])
        for (const y of [box.min[1], box.max[1]])
            for (const z of [box.min[2], box.max[2]])
                out.push([x, y, z]);
    return out;
}
function axialSpan(box: MotionBounds, axis: Vec3): number {
    const projections = bboxCorners(box).map(point => vec.dot(point, axis));
    return Math.max(...projections) - Math.min(...projections);
}
function outermostPoint(box: MotionBounds, axis: Vec3): Vec3 {
    const centre = vec.center(box);
    const maxProjection = Math.max(...bboxCorners(box).map(point => vec.dot(point, axis)));
    return vec.add(centre, vec.scale(axis, maxProjection - vec.dot(centre, axis)));
}
function perpendicularBasis(axis: Vec3): [Vec3, Vec3] {
    const helper: Vec3 = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = vec.sub(helper, vec.scale(axis, vec.dot(helper, axis)));
    const length = vec.length(u);
    const unitU = length > BASIS_EPS ? vec.scale(u, 1 / length) : [0, 1, 0] as Vec3;
    return [unitU, vec.cross(axis, unitU)];
}
function unionBounds(parts: readonly MotionPrepared[]): MotionBounds {
    return {
        min: [0, 1, 2].map(axis => Math.min(...parts.map(part => part.bbox.min[axis]))) as Vec3,
        max: [0, 1, 2].map(axis => Math.max(...parts.map(part => part.bbox.max[axis]))) as Vec3,
    };
}
function travel(box: MotionBounds, assembly: MotionBounds, direction: Vec3): number {
    return Math.min(...direction.map((component, axis) => component > 1e-12
        ? (assembly.max[axis] - box.min[axis] + 1e-6) / component
        : component < -1e-12
            ? (assembly.min[axis] - box.max[axis] - 1e-6) / component
            : Infinity));
}

/** A closed cylinder/frustum triangle soup for a tool envelope. It starts at
 *  `head` and extends along `axis` for `tool.lengthMm`. Winding is irrelevant
 *  to the continuous triangle sweep, but the caps keep the volume bounded. */
function toolEnvelopeMesh(tool: ToolEnvelope, axis: Vec3, head: Vec3): { vertices: number[]; triangles: number[] } {
    const segments = 24;
    const [u, v] = perpendicularBasis(axis);
    const startRadius = tool.kind === 'cone' ? (tool.tipDiameterMm ?? 0) / 2 : tool.diameterMm / 2;
    const endRadius = tool.diameterMm / 2;
    const vertices: number[] = [];
    const triangles: number[] = [];
    const ringPoint = (radius: number, distance: number, angle: number): Vec3 => {
        const radial = vec.add(vec.scale(u, Math.cos(angle) * radius), vec.scale(v, Math.sin(angle) * radius));
        return vec.add(vec.add(head, vec.scale(axis, distance)), radial);
    };
    const push = (point: Vec3): number => {
        vertices.push(...point);
        return vertices.length / 3 - 1;
    };
    const startRing = Array.from({ length: segments }, (_, index) => push(ringPoint(startRadius, 0, index / segments * Math.PI * 2)));
    const endRing = Array.from({ length: segments }, (_, index) => push(ringPoint(endRadius, tool.lengthMm, index / segments * Math.PI * 2)));
    const startCentre = push(head);
    const endCentre = push(vec.add(head, vec.scale(axis, tool.lengthMm)));
    for (let index = 0; index < segments; index++) {
        const next = (index + 1) % segments;
        triangles.push(startRing[index], startRing[next], endRing[next]);
        triangles.push(startRing[index], endRing[next], endRing[index]);
        if (startRadius > BASIS_EPS)
            triangles.push(startCentre, startRing[next], startRing[index]);
        triangles.push(endCentre, endRing[index], endRing[next]);
    }
    return { vertices, triangles };
}
function preparedTool(name: string, tool: ToolEnvelope, axis: Vec3, head: Vec3): MotionPrepared {
    const mesh = toolEnvelopeMesh(tool, axis, head);
    const vertices = mesh.vertices;
    const verticesAt = (index: number): Vec3 => [vertices[3 * index], vertices[3 * index + 1], vertices[3 * index + 2]];
    const triangles: Triangle[] = [];
    for (let index = 0; index < mesh.triangles.length; index += 3)
        triangles.push([verticesAt(mesh.triangles[index]), verticesAt(mesh.triangles[index + 1]), verticesAt(mesh.triangles[index + 2])]);
    const bbox: MotionBounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let index = 0; index < vertices.length; index++) {
        const axisIndex = index % 3;
        bbox.min[axisIndex] = Math.min(bbox.min[axisIndex], vertices[index]);
        bbox.max[axisIndex] = Math.max(bbox.max[axisIndex], vertices[index]);
    }
    const triangleBounds = triangles.map(t => ({
        min: [0, 1, 2].map(axisIndex => Math.min(...t.map(point => point[axisIndex]))) as Vec3,
        max: [0, 1, 2].map(axisIndex => Math.max(...t.map(point => point[axisIndex]))) as Vec3,
    }));
    return { name, mesh, bbox, triangles, triangleBounds };
}
function rotatePrepared(part: MotionPrepared, axis: Vec3, angleRad: number, centre: Vec3, name: string): MotionPrepared {
    const cosine = Math.cos(angleRad), sine = Math.sin(angleRad);
    const rotate = (point: Vec3): Vec3 => {
        const relative = vec.sub(point, centre);
        const cross = vec.cross(axis, relative);
        const axial = vec.dot(axis, relative) * (1 - cosine);
        return vec.add(centre, vec.add(vec.add(vec.scale(relative, cosine), vec.scale(cross, sine)), vec.scale(axis, axial)));
    };
    const vertices: number[] = [];
    for (let index = 0; index < part.mesh.vertices.length; index += 3) {
        const point = rotate([part.mesh.vertices[index], part.mesh.vertices[index + 1], part.mesh.vertices[index + 2]]);
        vertices.push(...point);
    }
    const triangles = part.triangles.map(triangle => triangle.map(rotate) as unknown as Triangle);
    const bbox: MotionBounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let index = 0; index < vertices.length; index++) {
        const component = index % 3;
        bbox.min[component] = Math.min(bbox.min[component], vertices[index]);
        bbox.max[component] = Math.max(bbox.max[component], vertices[index]);
    }
    const triangleBounds = triangles.map(t => ({
        min: [0, 1, 2].map(component => Math.min(...t.map(point => point[component]))) as Vec3,
        max: [0, 1, 2].map(component => Math.max(...t.map(point => point[component]))) as Vec3,
    }));
    return { ...part, name, mesh: { vertices, triangles: part.mesh.triangles }, bbox, triangles, triangleBounds };
}
function rotationalBboxStable(part: MotionPrepared, axis: Vec3, centre: Vec3): boolean {
    const first = rotatePrepared(part, axis, 0, centre, `${part.name}@sym-0`);
    const second = rotatePrepared(part, axis, Math.PI / 4, centre, `${part.name}@sym-45`);
    const perpendicular = [0, 1, 2].filter(axisIndex => Math.abs(axis[axisIndex]) < 0.9);
    return perpendicular.every(axisIndex => {
        const firstSpan = first.bbox.max[axisIndex] - first.bbox.min[axisIndex];
        const secondSpan = second.bbox.max[axisIndex] - second.bbox.min[axisIndex];
        return Math.abs(firstSpan - secondSpan) <= Math.max(firstSpan, secondSpan, 1) * 0.02;
    });
}
function helicalSummary(spec: FastenerMotion, part: MotionPrepared): HelicalMotionSummary {
    const threadLengthMm = spec.threadLengthMm ?? Math.max(axialSpan(part.bbox, spec.axis), spec.pitchMm);
    return {
        axis: [...spec.axis] as Vec3,
        pitchMm: spec.pitchMm,
        handedness: spec.handedness,
        threadLengthMm,
        turns: threadLengthMm / spec.pitchMm,
        ...(spec.standard !== undefined ? { standard: spec.standard } : {}),
    };
}
export interface FastenerClassification {
    state: PartState;
    directions: MotionDirection[];
    fastener: HelicalMotionSummary;
}
/** Sweep a declared fastener along its removal axis while sampling rotation.
 *  A round part's bbox is rotation-invariant and is swept once. */
export function classifyFastenerHelix(
    part: MotionPrepared,
    remaining: readonly MotionPrepared[],
    spec: FastenerMotion,
    sweepBlocked: SweepBlocked,
): FastenerClassification {
    const summary = helicalSummary(spec, part);
    const totalTravel = Math.max(
        travel(part.bbox, unionBounds(remaining), spec.axis),
        axialSpan(part.bbox, spec.axis) + spec.pitchMm,
    );
    const centre = vec.center(part.bbox);
    const maxAngle = Math.max(summary.turns, 1 / 8) * Math.PI * 2;
    const samples = rotationalBboxStable(part, spec.axis, centre) ? 1 : 8;
    const blockers = new Set<string>();
    for (let sample = 0; sample <= samples; sample++) {
        const angle = maxAngle * sample / samples;
        const rotated = rotatePrepared(part, spec.axis, angle, centre, `${part.name}@helix-${sample}`);
        for (const other of remaining) {
            if (other !== part && sweepBlocked(rotated, other, spec.axis, totalTravel))
                blockers.add(other.name);
        }
    }
    const direction: MotionDirection = {
        direction: [...spec.axis] as Vec3,
        distanceMm: totalTravel,
        clear: blockers.size === 0,
        blockingParts: [...blockers].sort((a, b) => a.localeCompare(b)),
    };
    if (blockers.size > 0) {
        return {
            state: {
                kind: 'blocked',
                blockersByDirection: [{ direction: [...spec.axis] as Vec3, blockers: direction.blockingParts }],
            },
            directions: [direction],
            fastener: summary,
        };
    }
    return {
        state: {
            kind: 'removable',
            direction: [...spec.axis] as Vec3,
            testedDirections: [[...spec.axis] as Vec3],
            motion: 'helical',
        },
        directions: [direction],
        fastener: summary,
    };
}
/** A press/snap fit is declared: choose the declared axis, else a clear
 *  straight direction, and never claim a geometric proof. */
export function classifyFit(directions: readonly MotionDirection[], fit: FitInput): PartState {
    const testedDirections = directions.map(entry => [...entry.direction] as Vec3);
    const direction = fit.axis ?? directions.find(entry => entry.clear)?.direction ?? testedDirections[0] ?? [0, 0, 1];
    return {
        kind: 'requires-force',
        fit: fit.kind,
        direction: [...direction] as Vec3,
        testedDirections,
    };
}
/** Sweep the declared tool envelope from the fastener's outer face outward
 *  along the approach axis against every other part in this planning level.
 *  The at-step set is a subset, so this is the conservative design finding. */
export function checkToolReach(
    part: MotionPrepared,
    all: readonly MotionPrepared[],
    spec: FastenerMotion,
    sweepBlocked: SweepBlocked,
): ToolReachFinding | undefined {
    if (spec.tool === undefined)
        return undefined;
    const tool = preparedTool(`${part.name}@tool`, spec.tool, spec.axis, outermostPoint(part.bbox, spec.axis));
    const distance = Math.max(travel(tool.bbox, unionBounds(all), spec.axis), spec.tool.lengthMm);
    const blockers = all
        .filter(other => other !== part && sweepBlocked(tool, other, spec.axis, distance))
        .map(other => other.name)
        .sort((a, b) => a.localeCompare(b));
    if (blockers.length > 0) {
        return { fastener: part.name, status: 'tool-blocked', blockers, tool: spec.tool, basis: 'assembled-parts' };
    }
    return { fastener: part.name, status: 'clear', blockers: [], tool: spec.tool, basis: 'assembled-parts' };
}
