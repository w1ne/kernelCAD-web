// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/rebuild/meshPayloadTransfer.ts
//
// Turns the numeric arrays of a mesh payload into typed arrays so the browser
// can hand the underlying buffers to the main thread instead of copying every
// number across. The conversion mirrors `rehydrateFromBridge`
// (src/modeling/capture/featureMeshSerialize.ts) so the painted geometry is
// bit-identical to the pre-worker path.

type UnknownRecord = Record<string, unknown>;

/** A plain object we may rewrite fields on (arrays are not). */
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The buffer behind a typed array. A shared buffer cannot be transferred. */
function transferableBuffer(view: ArrayBufferView): ArrayBuffer | undefined {
  return view.buffer instanceof ArrayBuffer ? view.buffer : undefined;
}

/**
 * Float32 view of `holder[key]`. Returns the buffer to transfer, or
 * undefined when the field holds nothing convertible (missing, or not a
 * plain array) — those fields are left exactly as they were.
 */
function packFloat32(holder: UnknownRecord, key: string): ArrayBuffer | undefined {
  const current = holder[key];
  if (current instanceof Float32Array) return transferableBuffer(current);
  if (!Array.isArray(current)) return undefined;
  const packed = new Float32Array(current);
  holder[key] = packed;
  return transferableBuffer(packed);
}

/** Uint32 view of `holder[key]` — see `packFloat32`. */
function packUint32(holder: UnknownRecord, key: string): ArrayBuffer | undefined {
  const current = holder[key];
  if (current instanceof Uint32Array) return transferableBuffer(current);
  if (!Array.isArray(current)) return undefined;
  const packed = new Uint32Array(current);
  holder[key] = packed;
  return transferableBuffer(packed);
}

function collect(buffer: ArrayBuffer | undefined, buffers: Set<ArrayBuffer>): void {
  if (buffer) buffers.add(buffer);
}

/** One serialized face: vertices/normals/uv as floats, indices as uint32. */
function packFace(face: UnknownRecord, buffers: Set<ArrayBuffer>): void {
  collect(packFloat32(face, 'vertices'), buffers);
  collect(packFloat32(face, 'normals'), buffers);
  collect(packFloat32(face, 'uv'), buffers);
  collect(packUint32(face, 'indices'), buffers);
}

/** The optional indexed mesh of a feature. */
function packIndexedMesh(mesh: UnknownRecord, buffers: Set<ArrayBuffer>): void {
  collect(packFloat32(mesh, 'positions'), buffers);
  collect(packFloat32(mesh, 'normals'), buffers);
  collect(packUint32(mesh, 'indices'), buffers);
}

/** One serialized feature. Every other field (transform, faceOwners,
 *  edgeRanges, material, ...) stays exactly as it was. */
function packFeature(feature: UnknownRecord, buffers: Set<ArrayBuffer>): void {
  const faces = feature.faces;
  if (Array.isArray(faces)) {
    faces.forEach((face) => {
      if (isRecord(face)) packFace(face, buffers);
    });
  }
  const mesh = feature.mesh;
  if (isRecord(mesh)) packIndexedMesh(mesh, buffers);
  collect(packFloat32(feature, 'edges'), buffers);
}

/**
 * Convert the numeric mesh arrays of a mesh payload IN PLACE to typed arrays
 * and return the ArrayBuffers to transfer (deduplicated). Anything that is not
 * an object with a `features` array is returned unchanged with an empty
 * transfer list.
 */
export function packMeshPayload(payload: unknown): { payload: unknown; transfer: ArrayBuffer[] } {
  if (!isRecord(payload)) return { payload, transfer: [] };
  const features = payload.features;
  if (!Array.isArray(features)) return { payload, transfer: [] };
  const buffers = new Set<ArrayBuffer>();
  features.forEach((feature) => {
    if (isRecord(feature)) packFeature(feature, buffers);
  });
  return { payload, transfer: Array.from(buffers) };
}
