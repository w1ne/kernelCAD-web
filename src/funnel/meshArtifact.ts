// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureMeshSerialized } from '../modeling/capture/featureMeshSerialize';
import type { PBRMaterial } from '../shared/intent/material';
import type { GeometryResult } from '../shared/worker/geometryEngine';
import { featureMeshesToGeometries } from '../studio/context/geometry/types';
import type { ViewerDimension } from '../shared/intent/viewerDimension';

export interface MeshArtifactBounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Revision-matched mesh the server already produced. Materials and camera
 *  bounds travel with the triangles so the embed does not re-execute CAD. */
export interface MeshArtifact {
  revision: number;
  bounds: MeshArtifactBounds;
  features: FeatureMeshSerialized[];
  /** Absent on artifacts saved before viewer dimensions existed. */
  dimensions?: ViewerDimension[];
}

function isVec3(value: unknown): value is [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function isMaterial(value: unknown): value is PBRMaterial {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { baseColor?: unknown }).baseColor === 'string';
}

function parseRevision(body: { revision?: unknown }, expectedRevision?: number | null): number {
  if (typeof body.revision !== 'number' || !Number.isInteger(body.revision) || body.revision < 1) {
    throw new Error('Mesh artifact is missing a positive revision.');
  }
  if (expectedRevision != null && body.revision !== expectedRevision) {
    throw new Error(`Mesh revision ${body.revision} does not match requested revision ${expectedRevision}.`);
  }
  return body.revision;
}

function parseBounds(body: { bounds?: unknown }): MeshArtifactBounds {
  const bounds = body.bounds as { min?: unknown; max?: unknown } | undefined;
  if (!bounds || !isVec3(bounds.min) || !isVec3(bounds.max)) {
    throw new Error('Mesh artifact is missing camera bounds.');
  }
  return { min: bounds.min, max: bounds.max };
}

/**
 * Validate one feature. Returns null when faces are missing/empty so virtual
 * records (cameraTarget, referenceImage, …) can be omitted without inventing
 * geometry. Throws on malformed objects or materials.
 */
function readDrawableFeature(feature: unknown): FeatureMeshSerialized | null {
  if (typeof feature !== 'object' || feature === null) {
    throw new Error('Mesh artifact feature is malformed.');
  }
  const record = feature as FeatureMeshSerialized;
  if (!Array.isArray(record.faces) || record.faces.length === 0) {
    const label = typeof record.featureId === 'string' ? record.featureId : 'unknown';
    const kind = typeof record.featureKind === 'string' ? record.featureKind : 'unknown';
    console.warn(`Mesh artifact: omitting feature "${label}" (${kind}) with no faces.`);
    return null;
  }
  if (record.material !== undefined && !isMaterial(record.material)) {
    throw new Error('Mesh artifact material is malformed.');
  }
  if (record.material === undefined) return record;
  const material = clampDisplayedArtifactMaterial(record.material);
  return material === record.material ? record : { ...record, material };
}

/** Display clamp for artifact PBR. Metalness 1 with roughness near 0 has no
 *  diffuse term, so a missing or disposed environment paints the face solid
 *  black with a pure white specular hit. Artifact meshes also have no vertex
 *  tangents; anisotropy then builds a degenerate tangent frame and the same
 *  black-and-white shading even when the room is present. */
export const ARTIFACT_DISPLAY_METALNESS_MAX = 0.6;
export const ARTIFACT_DISPLAY_ROUGHNESS_MIN = 0.35;

export function clampDisplayedArtifactMaterial(material: PBRMaterial): PBRMaterial {
  const metalness = typeof material.metalness === 'number'
    ? Math.min(material.metalness, ARTIFACT_DISPLAY_METALNESS_MAX)
    : material.metalness;
  const roughness = typeof material.roughness === 'number'
    ? Math.max(material.roughness, ARTIFACT_DISPLAY_ROUGHNESS_MIN)
    : material.roughness;
  const anisotropy = material.textures?.anisotropy ? material.anisotropy : 0;
  const authoredAnisotropy = material.anisotropy ?? 0;
  if (metalness === material.metalness && roughness === material.roughness && anisotropy === authoredAnisotropy) {
    return material;
  }
  return { ...material, metalness, roughness, anisotropy };
}

/**
 * Draw only terminal (non-consumed) features — same rule as Studio's
 * `selectTerminalFeatures` / server `meshWithColor`. CDN artifacts currently
 * persist the full intent DAG (box → fillet → boolean_1 → boolean_2); drawing
 * every node stacks construction geometry under the finished body (ChatGPT
 * NEMA17 "extra square").
 */
export function selectTerminalSerializedFeatures(
  features: readonly FeatureMeshSerialized[],
): FeatureMeshSerialized[] {
  const consumed = new Set<string>();
  for (const feature of features) {
    for (const predecessor of feature.predecessors ?? []) consumed.add(predecessor);
  }
  const terminals = features.filter((feature) => !consumed.has(feature.featureId));
  // Malformed artifact with no predecessor links: keep drawable set unchanged.
  return terminals.length > 0 ? terminals : [...features];
}

function parseDrawableFeatures(raw: unknown): FeatureMeshSerialized[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Mesh artifact has no features.');
  }
  const features: FeatureMeshSerialized[] = [];
  for (const feature of raw) {
    const drawable = readDrawableFeature(feature);
    if (drawable) features.push(drawable);
  }
  if (features.length === 0) {
    throw new Error('Mesh artifact has no drawable features with faces.');
  }
  return selectTerminalSerializedFeatures(features);
}

function isDimension(value: unknown): value is ViewerDimension {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Partial<ViewerDimension>;
  return typeof d.id === 'string' && typeof d.text === 'string' && typeof d.kind === 'string'
    && (d.source === 'declared' || d.source === 'auto') && isVec3(d.a) && isVec3(d.b);
}

/** Dimensions are optional decoration: a malformed entry is dropped, never
 *  fatal. A missing field stays missing (legacy artifact). */
function parseDimensions(raw: unknown): { dimensions?: ViewerDimension[] } {
  if (!Array.isArray(raw)) return {};
  return { dimensions: raw.filter(isDimension) };
}

export function parseMeshArtifact(value: unknown, expectedRevision?: number | null): MeshArtifact {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Mesh artifact is not an object.');
  }
  const body = value as { revision?: unknown; bounds?: unknown; features?: unknown; dimensions?: unknown };
  return {
    revision: parseRevision(body, expectedRevision),
    bounds: parseBounds(body),
    features: parseDrawableFeatures(body.features),
    ...parseDimensions(body.dimensions),
  };
}

export function geometriesFromArtifact(artifact: MeshArtifact): GeometryResult[] {
  return featureMeshesToGeometries(artifact.features);
}
