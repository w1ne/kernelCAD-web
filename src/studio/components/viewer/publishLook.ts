// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { ContactShadowLayer } from '../demoPlayer/contactShadow';
import type { FaceGeometry } from '../../../shared/worker/geometryEngine';

/**
 * The live "publish" look of the viewer: what a model looks like on the
 * chrome-free /embed/<slug> page (the ChatGPT widget) instead of the
 * engineering view Studio edits in.
 *
 * - Smooth shading on curved faces. The kernel's per-vertex normals are
 *   the surface normals; flat shading threw them away and showed facets.
 * - Feature edges only, drawn as a soft line in a darker shade of the body:
 *   seams of periodic faces and tangent (fillet/blend) boundaries carry no
 *   shape information and read as wireframe on a product shot.
 * - A neutral physical default material with a light clear coat.
 * - A camera-relative key / fill / rim rig plus the room IBL, under Neutral
 *   tone mapping, and a baked contact shadow on the ground under the model.
 * - No ground grid.
 *
 * Phones (iPhone Safari inside ChatGPT) draw this: no post-processing, no
 * shadow maps. The contact shadow is baked once per geometry change at a
 * small texture size, then costs one textured quad per frame.
 */
export type ViewerLook = 'engineering' | 'publish';

export const PUBLISH_LOOK_TONE_MAPPING = THREE.NeutralToneMapping;
export const PUBLISH_LOOK_EXPOSURE = 0.85;

/** userData flag on the group that holds the model's shapes. */
export const MODEL_ROOT_FLAG = 'kcModelRoot';
export const MODEL_ROOT_USERDATA = { [MODEL_ROOT_FLAG]: true } as const;

/** Default body material when a shape carries no PBR material. */
export const PUBLISH_DEFAULT_MATERIAL = {
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
} as const;

/** Feature-edge line: a darker shade of the body colour, part-transparent. */
export const PUBLISH_EDGE_SHADE = 0.42;
export const PUBLISH_EDGE_OPACITY = 0.6;

/** Faces meeting at less than this angle are one smooth surface: no line. */
export const FEATURE_EDGE_MIN_ANGLE_DEG = 20;

export interface PublishLightSpec {
    kind: 'directional' | 'hemisphere';
    color: number;
    intensity: number;
    /** Degrees relative to the camera azimuth (+ = CCW around +Z). */
    azOffsetDeg: number;
    /** Degrees above the XY ground plane. */
    elDeg: number;
}

/** Warm key above-left of the camera, cool fill from the right, a rim from
 *  behind for an edge highlight, and a sky/ground bounce. The rig turns with
 *  the camera azimuth, so every orbit angle is lit like the hero shot. */
export const PUBLISH_LIGHTS: readonly PublishLightSpec[] = [
    { kind: 'directional', color: 0xfff3e6, intensity: 1.3, azOffsetDeg: -40, elDeg: 45 },
    { kind: 'directional', color: 0xe4ecff, intensity: 0.95, azOffsetDeg: 70, elDeg: 20 },
    { kind: 'directional', color: 0xffffff, intensity: 1.2, azOffsetDeg: 165, elDeg: 35 },
    { kind: 'hemisphere', color: 0xffffff, intensity: 0.45, azOffsetDeg: 0, elDeg: 90 },
];

/** Hemisphere ground colour under the publish rig. */
export const PUBLISH_HEMISPHERE_GROUND = 0xb8b4ac;

/** Contact shadow for a live canvas: a quarter of the publish-capture
 *  texture area (256² penumbra + 512² core), blur radii scaled to match. */
export const LIVE_CONTACT_SHADOW_LAYERS: readonly ContactShadowLayer[] = [
    { textureSize: 256, heightFraction: 0.3, darkness: 2.2, opacity: 0.42, blurPasses: [1.5, 1, 0.5] },
    { textureSize: 512, heightFraction: 0.04, darkness: 1.2, opacity: 0.5, blurPasses: [0.75, 0.5] },
];

/** Dark backdrops swallow a black shadow; it is drawn a little stronger. */
export const DARK_BACKDROP_SHADOW_GAIN = 1.35;

/** Camera azimuth (deg) around +Z, in the publish-preset convention: az = 0
 *  looks from -Y (front), +az turns CCW. */
export function cameraAzimuthDeg(camera: THREE.Vector3Like, target: THREE.Vector3Like): number {
    const dx = camera.x - target.x;
    const dy = camera.y - target.y;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

/** A darker shade of `color` for the feature-edge line over that body. */
export function publishEdgeColor(color: THREE.ColorRepresentation): THREE.Color {
    return new THREE.Color(color).multiplyScalar(PUBLISH_EDGE_SHADE);
}

interface VertexHit {
    qx: number;
    qy: number;
    qz: number;
    faceId: number;
    nx: number;
    ny: number;
    nz: number;
}

function hashQ(qx: number, qy: number, qz: number): number {
    return ((qx * 73856093) ^ (qy * 19349663) ^ (qz * 83492791)) | 0;
}

/** Quantisation step for matching edge points to face vertices: the kernel
 *  writes both from the same edge discretisation, so they agree to float
 *  precision. 1e-5 of the edge-set extent absorbs float32 rounding. */
function quantStep(edges: Float32Array): number {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < edges.length; i++) {
        const v = edges[i]!;
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const extent = Number.isFinite(max - min) ? max - min : 1;
    return Math.max(extent * 1e-5, 1e-7);
}

class PointIndex {
    private readonly buckets = new Map<number, VertexHit[]>();
    private readonly step: number;
    constructor(step: number) {
        this.step = step;
    }

    quantise(x: number, y: number, z: number): [number, number, number] {
        return [Math.round(x / this.step), Math.round(y / this.step), Math.round(z / this.step)];
    }

    /** Register an edge point so face vertices at that spot are collected. */
    want(x: number, y: number, z: number): void {
        const [qx, qy, qz] = this.quantise(x, y, z);
        const key = hashQ(qx, qy, qz);
        if (!this.buckets.has(key)) this.buckets.set(key, []);
    }

    /** Record a face vertex when an edge point sits on it. */
    offer(hit: Omit<VertexHit, 'qx' | 'qy' | 'qz'>, x: number, y: number, z: number): void {
        const [qx, qy, qz] = this.quantise(x, y, z);
        const bucket = this.buckets.get(hashQ(qx, qy, qz));
        if (bucket) bucket.push({ ...hit, qx, qy, qz });
    }

    at(x: number, y: number, z: number): VertexHit[] {
        const [qx, qy, qz] = this.quantise(x, y, z);
        const bucket = this.buckets.get(hashQ(qx, qy, qz));
        if (!bucket) return [];
        return bucket.filter((h) => h.qx === qx && h.qy === qy && h.qz === qz);
    }
}

function buildPointIndex(faces: readonly FaceGeometry[], edges: Float32Array): PointIndex {
    const index = new PointIndex(quantStep(edges));
    for (let i = 0; i + 2 < edges.length; i += 3) index.want(edges[i]!, edges[i + 1]!, edges[i + 2]!);
    for (const face of faces) {
        const v = face.vertices;
        const n = face.normals;
        for (let i = 0; i + 2 < v.length; i += 3) {
            index.offer({ faceId: face.faceId, nx: n[i] ?? 0, ny: n[i + 1] ?? 0, nz: n[i + 2] ?? 0 }, v[i]!, v[i + 1]!, v[i + 2]!);
        }
    }
    return index;
}

/** Is the BREP edge whose points are `hits` a crease between faces? */
function isFeatureEdge(hits: readonly VertexHit[][], minCos: number): boolean {
    if (hits.some((h) => h.length === 0)) return true; // unmatched: keep, never hide geometry
    // Faces the edge lies on: those with a vertex at every point of it.
    let faces = new Set(hits[0]!.map((h) => h.faceId));
    for (const pointHits of hits.slice(1)) {
        const here = new Set(pointHits.map((h) => h.faceId));
        faces = new Set([...faces].filter((f) => here.has(f)));
    }
    if (faces.size === 0) return true;
    if (faces.size === 1) {
        // One face: the seam of a periodic face (the face meets itself, two
        // vertices per point) or a free boundary of an open sheet (one).
        const [only] = faces;
        const doubled = hits.every((pointHits) => pointHits.filter((h) => h.faceId === only).length >= 2);
        return !doubled;
    }
    for (const pointHits of hits) {
        const onEdge = pointHits.filter((h) => faces.has(h.faceId));
        for (let a = 0; a < onEdge.length; a++) {
            for (let b = a + 1; b < onEdge.length; b++) {
                const ha = onEdge[a]!;
                const hb = onEdge[b]!;
                if (ha.faceId === hb.faceId) continue;
                if (ha.nx * hb.nx + ha.ny * hb.ny + ha.nz * hb.nz < minCos) return true;
            }
        }
    }
    return false;
}

function rangePoints(index: PointIndex, edges: Float32Array, start: number, count: number): VertexHit[][] {
    const out: VertexHit[][] = [];
    for (let v = start; v < start + count; v++) {
        const i = v * 3;
        out.push(index.at(edges[i]!, edges[i + 1]!, edges[i + 2]!));
    }
    return out;
}

/**
 * The BREP edge segments that are creases: two faces meeting at an angle of
 * at least `minAngleDeg`, or a free boundary. Seams of periodic faces and
 * tangent edges (a fillet running into its neighbours) are dropped.
 *
 * `edges` are line-segment vertex pairs; `edgeRanges` are `[start, count]`
 * vertex ranges, one per BREP edge. Without ranges every edge is kept.
 */
export function featureEdgePositions(
    faces: readonly FaceGeometry[],
    edges: Float32Array,
    edgeRanges: readonly number[] | undefined,
    minAngleDeg: number = FEATURE_EDGE_MIN_ANGLE_DEG,
): Float32Array {
    if (!edgeRanges || edgeRanges.length < 2 || faces.length === 0) return edges;
    const index = buildPointIndex(faces, edges);
    const minCos = Math.cos((minAngleDeg * Math.PI) / 180);
    const kept: number[] = [];
    for (let r = 0; r + 1 < edgeRanges.length; r += 2) {
        const start = edgeRanges[r]!;
        const count = edgeRanges[r + 1]!;
        if (count <= 0) continue;
        if (!isFeatureEdge(rangePoints(index, edges, start, count), minCos)) continue;
        for (let i = start * 3; i < (start + count) * 3; i++) kept.push(edges[i]!);
    }
    return new Float32Array(kept);
}
