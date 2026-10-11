// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure STL header/extent reading: no OCCT, no node imports, browser-safe.
//
// The kernel importer (`kernel/backends/occt/importStl.ts`) uses the triangle
// count to refuse an oversized mesh before any OCCT work, and the Studio agent
// composer uses the same count and the bounding box to refuse an oversized
// attachment and to tell the agent how big the part is. Keeping one reader
// means the browser refuses exactly what `lib.fromSTL` would refuse.

/**
 * Default triangle budget of `lib.fromSTL`. Sewing is ~0.45 ms/triangle, so
 * this bounds a worst-case import at roughly 90 seconds (see importStl.ts).
 */
export const STL_DEFAULT_MAX_TRIANGLES = 200_000;

/** Binary STL layout: 80-byte header, uint32 count, then 50 bytes per triangle. */
const BINARY_HEADER_BYTES = 84;
const BINARY_TRIANGLE_BYTES = 50;

/**
 * Count triangles without handing the bytes to OCCT.
 *
 * Binary STL is an 80-byte header, a uint32 little-endian triangle count,
 * then 50 bytes per triangle. ASCII STL is counted by `facet` occurrences.
 * The discriminator is the same one replicad uses: a file whose length
 * matches the binary layout exactly is binary, regardless of whether it
 * happens to start with the ASCII marker `solid` (many binary writers put
 * "solid" in the header, which is why a naive prefix sniff is wrong).
 */
export function countStlTriangles(bytes: Uint8Array): { count: number; binary: boolean } {
  const binaryCount = binaryTriangleCount(bytes);
  if (binaryCount !== null) return { count: binaryCount, binary: true };
  // ASCII fallback: count "facet" keywords.
  const text = new TextDecoder().decode(bytes);
  const m = text.match(/\bfacet\b/g);
  return { count: m ? m.length : 0, binary: false };
}

function binaryTriangleCount(bytes: Uint8Array): number | null {
  if (bytes.byteLength < BINARY_HEADER_BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(80, true);
  return bytes.byteLength === BINARY_HEADER_BYTES + n * BINARY_TRIANGLE_BYTES ? n : null;
}

/** Axis-aligned bounds of the mesh vertices, in the file's units. */
export interface StlBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface StlInfo {
  binary: boolean;
  triangleCount: number;
  /** Null when no finite vertex was found. */
  bounds: StlBounds | null;
}

class BoundsAccumulator {
  private readonly min: [number, number, number] = [Infinity, Infinity, Infinity];
  private readonly max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  private seen = false;

  add(x: number, y: number, z: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    this.seen = true;
    if (x < this.min[0]) this.min[0] = x;
    if (y < this.min[1]) this.min[1] = y;
    if (z < this.min[2]) this.min[2] = z;
    if (x > this.max[0]) this.max[0] = x;
    if (y > this.max[1]) this.max[1] = y;
    if (z > this.max[2]) this.max[2] = z;
  }

  result(): StlBounds | null {
    return this.seen ? { min: [...this.min], max: [...this.max] } : null;
  }
}

/**
 * Triangle count, format and bounding box of an STL payload in one pass.
 * Binary files read their float32 vertices directly; ASCII files scan the
 * `vertex x y z` lines. Neither path builds topology, so it is cheap even at
 * the triangle budget.
 */
export function inspectStl(bytes: Uint8Array): StlInfo {
  const acc = new BoundsAccumulator();
  const binaryCount = binaryTriangleCount(bytes);
  if (binaryCount !== null) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < binaryCount; i++) {
      // Skip the 12-byte facet normal; three vertices of three float32 follow.
      const base = BINARY_HEADER_BYTES + i * BINARY_TRIANGLE_BYTES + 12;
      for (let v = 0; v < 3; v++) {
        const at = base + v * 12;
        acc.add(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
      }
    }
    return { binary: true, triangleCount: binaryCount, bounds: acc.result() };
  }
  const text = new TextDecoder().decode(bytes);
  const facets = text.match(/\bfacet\b/g);
  const vertex = /\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  for (let m = vertex.exec(text); m !== null; m = vertex.exec(text)) {
    acc.add(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  return { binary: false, triangleCount: facets ? facets.length : 0, bounds: acc.result() };
}
