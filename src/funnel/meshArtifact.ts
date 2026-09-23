// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureMeshSerialized } from '../modeling/capture/featureMeshSerialize';
import type { PBRMaterial } from '../shared/intent/material';
import type { GeometryResult } from '../shared/worker/geometryEngine';
import { featureMeshesToGeometries } from '../studio/context/geometry/types';

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
  return record;
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
  return features;
}

export function parseMeshArtifact(value: unknown, expectedRevision?: number | null): MeshArtifact {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Mesh artifact is not an object.');
  }
  const body = value as { revision?: unknown; bounds?: unknown; features?: unknown };
  return {
    revision: parseRevision(body, expectedRevision),
    bounds: parseBounds(body),
    features: parseDrawableFeatures(body.features),
  };
}

export function geometriesFromArtifact(artifact: MeshArtifact): GeometryResult[] {
  return featureMeshesToGeometries(artifact.features);
}
