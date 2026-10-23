// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/meshFingerprint.ts
//
// Content fingerprints of a feature mesh, so a slider tick re-sends only the
// features whose drawn result changed. A fingerprint covers EVERYTHING the
// viewer draws from: every triangle/edge buffer, and every other field —
// the transform (an assembly part that only moved must be re-sent), the
// material and colour, per-face materials, face/edge owners, ids, names and
// virtual-record payloads. It is a walk over the whole object, not a fixed
// field list, so a field added to FeatureMesh later is covered too.
//
// Buffers are hashed once per typed array: the kernel re-emits the SAME
// arrays for a feature it did not re-mesh, so an unchanged part costs a
// WeakMap lookup, not a pass over its triangles.

const bufferHashes = new WeakMap<ArrayBufferView, string>();

/** 64-bit (two independent 32-bit lanes) hash of a byte range. */
function hashBytes(bytes: Uint8Array): string {
  let h1 = 0x811c9dc5 ^ bytes.length;
  let h2 = 0x01000193 ^ Math.imul(bytes.length, 0x9e3779b1);
  const words = bytes.length >>> 2;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < words; i++) {
    const w = view.getUint32(i * 4, true);
    h1 = Math.imul(h1 ^ w, 0x01000193);
    h2 = Math.imul(h2 ^ w, 0x5bd1e995);
    h2 ^= h2 >>> 15;
  }
  for (let i = words * 4; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 0x01000193);
    h2 = Math.imul(h2 ^ bytes[i], 0x5bd1e995);
  }
  h1 ^= h1 >>> 16;
  h2 ^= h2 >>> 13;
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/** -0 and 0 draw the same, and JSON (the server's transport) turns -0 into
 *  0; hash them alike so the worker and the server agree. */
function withoutNegativeZero(view: Float32Array | Float64Array): Float32Array | Float64Array {
  for (let i = 0; i < view.length; i++) {
    if (view[i] === 0 && 1 / view[i] < 0) {
      const copy = view.slice();
      for (let j = i; j < copy.length; j++) if (copy[j] === 0) copy[j] = 0;
      return copy;
    }
  }
  return view;
}

function hashView(view: ArrayBufferView): string {
  const cached = bufferHashes.get(view);
  if (cached) return cached;
  const bytesOf = view instanceof Float32Array || view instanceof Float64Array ? withoutNegativeZero(view) : view;
  const hash = `${view.constructor.name}:${hashBytes(new Uint8Array(bytesOf.buffer, bytesOf.byteOffset, bytesOf.byteLength))}`;
  bufferHashes.set(view, hash);
  return hash;
}

/** Canonical text of a value: keys sorted, typed arrays replaced by their
 *  content hash, undefined fields omitted (as JSON would). */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (ArrayBuffer.isView(value)) return JSON.stringify(hashView(value));
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (record[key] === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonical(record[key])}`);
  }
  return `{${parts.join(',')}}`;
}

/** Fingerprint of one feature mesh (see the file header for what it covers). */
export function featureMeshFingerprint(feature: object): string {
  return hashBytes(new TextEncoder().encode(canonical(feature)));
}

/** Short stable hash of a string (cache keys). */
export function hashText(text: string): string {
  return hashBytes(new TextEncoder().encode(text));
}
