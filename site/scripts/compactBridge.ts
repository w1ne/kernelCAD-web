// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureMeshSerialized } from '../../src/modeling/capture/featureMeshSerialize';

export const BRIDGE_MAX_BYTES = 25 * 1024 * 1024;

/** Short JSON decimals that rehydrate to the exact original Float32 bits.
 * Deliberately restricted to mesh buffers; double precision metadata is untouched.
 * Nonfinite numbers are rejected. Signed zero is explicitly normalized to +0,
 * matching the existing JSON encoding boundary, not preserving pre-JSON -0 bits. */
function compactFloat32(value: number): number {
  if (!Number.isFinite(value)) throw new Error('bridge buffer must be finite');
  if (value === 0) return 0; // JSON already encodes -0 as 0.
  if (!Object.is(Math.fround(value), value)) throw new Error('bridge buffer value is not Float32');
  let best = value;
  let length = JSON.stringify(value).length;
  for (let n = 1; n <= 9; n++) {
    const candidate = Number(value.toPrecision(n));
    if (!Object.is(Math.fround(candidate), value)) continue;
    const size = JSON.stringify(candidate).length;
    if (size < length) { best = candidate; length = size; }
  }
  return best;
}

export function compactBridgeFeature(feature: FeatureMeshSerialized): FeatureMeshSerialized {
  return {
    ...feature,
    faces: feature.faces.map(face => ({
      ...face,
      vertices: face.vertices.map(compactFloat32),
      normals: face.normals.map(compactFloat32),
      ...(face.uv !== undefined ? {uv: face.uv.map(compactFloat32)} : {}),
    })),
    ...(feature.edges !== undefined ? {edges: feature.edges.map(compactFloat32)} : {}),
  };
}

/** Enforce the COMPLETE static-file budget, including source and review. */
export function encodeBridgePayload(payload: unknown, maxBytes = BRIDGE_MAX_BYTES): string {
  const encoded = JSON.stringify(payload);
  const bytes = Buffer.byteLength(encoded, 'utf8');
  if (bytes > maxBytes) throw new Error(`bridge payload is ${bytes} bytes (limit ${maxBytes})`);
  return encoded;
}
