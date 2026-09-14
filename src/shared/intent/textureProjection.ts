// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/textureProjection.ts
//
// `TextureProjection` — the UV-generation strategy recorded by
// `Shape.wrapTexture(imageRef, projection)`. The projection itself is a
// serializable record (survives clone / booleans / transforms unchanged);
// the actual UV coordinates are computed downstream, at export/mesh time,
// from the FINAL world-space vertex positions (`computeProjectedUVs`). This
// is what lets a wrapped texture survive `.translate()` / `.rotate()` /
// `.union()` — the projection re-derives UVs from wherever the geometry
// ends up, rather than baking UVs in at wrap time.
//
// Render-only: wrapping a texture never changes geometry. For an engraved
// / embossed image use `projectCurve` + a sketch-based feature instead.

/** Planar projection onto one of the three principal planes. `onto` picks
 *  which pair of world axes become (u, v); the third axis is discarded. */
export interface FlatProjection {
  readonly type: 'flat';
  /** Plane the image is projected onto. Default `'xy'`. */
  readonly onto?: 'xy' | 'xz' | 'yz';
}

/** Cylindrical projection: `u` wraps around `axis` (angle), `v` runs along
 *  `axis` (height). Ideal for can / bottle / tube labels. */
export interface CylinderProjection {
  readonly type: 'cylinder';
  /** Cylinder axis direction (world frame). Normalized internally; must be
   *  non-zero and finite. */
  readonly axis: readonly [number, number, number];
}

/** Spherical projection centered on the shape's world-space bounding-box
 *  centroid: `u` is longitude, `v` is latitude. */
export interface SphereProjection {
  readonly type: 'sphere';
}

/** Six-sided box (triplanar) projection: each vertex is assigned to the
 *  bounding-box face its position is nearest to, and unwrapped planar on
 *  that face's plane. */
export interface BoxProjection {
  readonly type: 'box';
}

export type TextureProjection =
  | FlatProjection
  | CylinderProjection
  | SphereProjection
  | BoxProjection;

export function isTextureProjection(value: unknown): value is TextureProjection {
  if (typeof value !== 'object' || value === null) return false;
  const t = (value as { type?: unknown }).type;
  if (t === 'flat') {
    const onto = (value as FlatProjection).onto;
    return onto === undefined || onto === 'xy' || onto === 'xz' || onto === 'yz';
  }
  if (t === 'cylinder') {
    const axis = (value as CylinderProjection).axis;
    return (
      Array.isArray(axis) &&
      axis.length === 3 &&
      axis.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
      Math.hypot(axis[0], axis[1], axis[2]) > 1e-12
    );
  }
  return t === 'sphere' || t === 'box';
}

interface Bounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

function boundsOf(vertices: Float32Array): Bounds {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

function safeSpan(min: number, max: number): number {
  const span = max - min;
  return span > 1e-9 ? span : 1;
}

/**
 * Compute one (u, v) pair per vertex from FINAL world-space vertex
 * positions (post-transform, post-boolean — whatever the mesh looks like
 * at export/mesh time). `vertices` is a flat [x0,y0,z0, x1,y1,z1, ...]
 * array (the same layout as `MeshData.vertices`). Returns a flat
 * [u0,v0, u1,v1, ...] Float32Array, one pair per vertex, each component in
 * `[0, 1]` (cylinder `u` wraps at the 0/1 seam).
 */
export function computeProjectedUVs(
  vertices: Float32Array,
  projection: TextureProjection,
): Float32Array {
  const n = vertices.length / 3;
  const uv = new Float32Array(n * 2);
  const b = boundsOf(vertices);

  if (projection.type === 'flat') {
    const onto = projection.onto ?? 'xy';
    const [ai, bi, uSpan, vSpan, uMin, vMin] =
      onto === 'xy'
        ? [0, 1, safeSpan(b.minX, b.maxX), safeSpan(b.minY, b.maxY), b.minX, b.minY]
        : onto === 'xz'
          ? [0, 2, safeSpan(b.minX, b.maxX), safeSpan(b.minZ, b.maxZ), b.minX, b.minZ]
          : [1, 2, safeSpan(b.minY, b.maxY), safeSpan(b.minZ, b.maxZ), b.minY, b.minZ];
    for (let i = 0; i < n; i++) {
      const u = (vertices[i * 3 + ai] - uMin) / uSpan;
      const v = (vertices[i * 3 + bi] - vMin) / vSpan;
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
    return uv;
  }

  if (projection.type === 'cylinder') {
    const [ax0, ay0, az0] = projection.axis;
    const len = Math.hypot(ax0, ay0, az0);
    const ax = ax0 / len, ay = ay0 / len, az = az0 / len;
    // Pick a stable reference vector not parallel to the axis, build a
    // right-handed (right, up) basis in the plane perpendicular to axis.
    const ref: [number, number, number] =
      Math.abs(az) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    // right = axis × ref (normalized); up = right × axis.
    let rx = ay * ref[2] - az * ref[1];
    let ry = az * ref[0] - ax * ref[2];
    let rz = ax * ref[1] - ay * ref[0];
    const rlen = Math.hypot(rx, ry, rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    const ux = ay * rz - az * ry;
    const uy = az * rx - ax * rz;
    const uz = ax * ry - ay * rx;

    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const cz = (b.minZ + b.maxZ) / 2;

    // Height range along axis, for v normalization.
    let minH = Infinity, maxH = -Infinity;
    const heights = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const dx = vertices[i * 3] - cx;
      const dy = vertices[i * 3 + 1] - cy;
      const dz = vertices[i * 3 + 2] - cz;
      const h = dx * ax + dy * ay + dz * az;
      heights[i] = h;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
    const hSpan = safeSpan(minH, maxH);

    for (let i = 0; i < n; i++) {
      const dx = vertices[i * 3] - cx;
      const dy = vertices[i * 3 + 1] - cy;
      const dz = vertices[i * 3 + 2] - cz;
      const r = dx * rx + dy * ry + dz * rz;
      const u2 = dx * ux + dy * uy + dz * uz;
      const angle = Math.atan2(u2, r); // [-PI, PI]
      uv[i * 2] = (angle + Math.PI) / (2 * Math.PI); // [0,1)
      uv[i * 2 + 1] = (heights[i] - minH) / hSpan;
    }
    return uv;
  }

  if (projection.type === 'sphere') {
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    for (let i = 0; i < n; i++) {
      const dx = vertices[i * 3] - cx;
      const dy = vertices[i * 3 + 1] - cy;
      const dz = vertices[i * 3 + 2] - cz;
      const r = Math.hypot(dx, dy, dz) || 1e-9;
      const u = 0.5 + Math.atan2(dy, dx) / (2 * Math.PI);
      const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, dz / r))) / Math.PI;
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
    return uv;
  }

  // box: assign each vertex to the bbox face its position is nearest to
  // (by distance to that face's plane), then unwrap planar on that face.
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const xSpan = safeSpan(b.minX, b.maxX);
  const ySpan = safeSpan(b.minY, b.maxY);
  const zSpan = safeSpan(b.minZ, b.maxZ);
  for (let i = 0; i < n; i++) {
    const x = vertices[i * 3], y = vertices[i * 3 + 1], z = vertices[i * 3 + 2];
    const dx = Math.abs(x - cx) / (xSpan / 2);
    const dy = Math.abs(y - cy) / (ySpan / 2);
    const dz = Math.abs(z - cz) / (zSpan / 2);
    if (dx >= dy && dx >= dz) {
      uv[i * 2] = (y - b.minY) / ySpan;
      uv[i * 2 + 1] = (z - b.minZ) / zSpan;
    } else if (dy >= dx && dy >= dz) {
      uv[i * 2] = (x - b.minX) / xSpan;
      uv[i * 2 + 1] = (z - b.minZ) / zSpan;
    } else {
      uv[i * 2] = (x - b.minX) / xSpan;
      uv[i * 2 + 1] = (y - b.minY) / ySpan;
    }
  }
  return uv;
}
