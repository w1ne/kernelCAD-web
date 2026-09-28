// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Viewer-side lookups over the per-face / per-edge feature ownership that
 * feature meshing attaches to each `GeometryResult` (`faceOwners`,
 * `edgeRanges`, `edgeOwners`; see `modeling/capture/featureOwnership.ts`).
 *
 * Every lookup falls back to the mesh's own `featureId`, which is the
 * part-level mapping. Per-geometry indexes are cached in a WeakMap keyed on
 * the geometry object: a re-evaluation produces new geometry objects, so the
 * cache invalidates by construction and never serves a stale evaluation.
 */
import type { GeometryResult } from '../../shared/worker/workerTypes';
import type { FeatureRecord } from '../../shared/intent/featureRecord';

/** A picked face (`id` = faceId) or BREP edge (`id` = index into `edgeRanges`). */
export interface GeometryPick {
    readonly shapeIndex: number;
    readonly kind: 'face' | 'edge';
    readonly id: number;
}

/** Feature that created the picked face or edge, or null when unknown. */
export function pickOwner(geometry: GeometryResult | undefined, pick: GeometryPick): string | null {
    if (!geometry) return null;
    const owners = pick.kind === 'face' ? geometry.faceOwners : geometry.edgeOwners;
    return owners?.[pick.id] || geometry.featureId || null;
}

/**
 * The FeatureRecord a pick links to. Falls back from the per-face owner to
 * the mesh's own record, and for an assembly part mesh (whose `featureId` is
 * a synthetic `<assembly>__<part>` id) to its `assemblyPart` record.
 */
export function resolvePickFeature(
    geometry: GeometryResult | undefined,
    pick: GeometryPick,
    features: readonly FeatureRecord[],
): string | null {
    const owner = pickOwner(geometry, pick);
    if (owner !== null && features.some((f) => f.id === owner)) return owner;
    const partName = geometry?.assemblyPartName;
    if (partName !== undefined) {
        const part = features.find((f) => f.kind === 'assemblyPart'
            && (f.metadata as { partName?: unknown } | undefined)?.partName === partName);
        if (part) return part.id;
    }
    return owner;
}

/** Index of the BREP edge whose vertex range holds `vertexIndex` (a
 *  LineSegments raycast `index`), or -1. `edgeRanges` is sorted by start. */
export function edgeIndexAtVertex(edgeRanges: readonly number[] | undefined, vertexIndex: number): number {
    if (!edgeRanges || vertexIndex < 0) return -1;
    let lo = 0;
    let hi = edgeRanges.length / 2 - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const start = edgeRanges[mid * 2]!;
        const count = edgeRanges[mid * 2 + 1]!;
        if (vertexIndex < start) hi = mid - 1;
        else if (vertexIndex >= start + count) lo = mid + 1;
        else return mid;
    }
    return -1;
}

/** What a code selection resolves to in the viewer: feature ids for the
 *  face-level match, and assembly part names for the part-level match. */
export interface HighlightTargets {
    readonly featureIds: ReadonlySet<string>;
    readonly partNames: ReadonlySet<string>;
}

/** Expand code-selected feature ids into viewer targets. An `assemblyPart`
 *  record highlights its whole part (part-level mapping only). */
export function highlightTargets(
    featureIds: readonly string[],
    features: readonly FeatureRecord[],
): HighlightTargets {
    const ids = new Set(featureIds);
    const partNames = new Set<string>();
    for (const f of features) {
        if (!ids.has(f.id)) continue;
        const partName = (f.metadata as { partName?: unknown } | undefined)?.partName;
        if (typeof partName === 'string') partNames.add(partName);
    }
    return { featureIds: ids, partNames };
}

const faceIdsByOwnerCache = new WeakMap<GeometryResult, Map<string, number[]>>();

function faceIdsByOwner(geometry: GeometryResult): Map<string, number[]> {
    const hit = faceIdsByOwnerCache.get(geometry);
    if (hit) return hit;
    const map = new Map<string, number[]>();
    for (const face of geometry.faces) {
        const owner = geometry.faceOwners?.[face.faceId] || geometry.featureId;
        if (!owner) continue;
        const list = map.get(owner);
        if (list) list.push(face.faceId);
        else map.set(owner, [face.faceId]);
    }
    faceIdsByOwnerCache.set(geometry, map);
    return map;
}

/** Face ids of `geometry` produced by any target feature (whole geometry for
 *  a matching assembly part), in face order. */
export function facesForTargets(geometry: GeometryResult, targets: HighlightTargets): number[] {
    if (geometry.assemblyPartName !== undefined && targets.partNames.has(geometry.assemblyPartName)) {
        return geometry.faces.map((f) => f.faceId);
    }
    const byOwner = faceIdsByOwner(geometry);
    const out: number[] = [];
    for (const id of targets.featureIds) {
        const faces = byOwner.get(id);
        if (faces) out.push(...faces);
    }
    return out.sort((a, b) => a - b);
}
