// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/creasedNormals.ts
//
// Shading normals for the GLB `style: 'pbr'` mesh. The export mesher welds
// vertices across B-rep face boundaries, so a plain per-vertex average
// (`computeVertexNormals`) rounds every sharp edge: a box shades like a
// pillow. This splits a welded vertex wherever the triangles around it meet
// at more than the crease angle, and averages only across smooth joins.
// It works on the indexed mesh, so a large export does not triple in size.

/** Joins sharper than this keep separate normals. Tessellation of a curved
 *  face stays under about 3 degrees between facets; tangent fillets are 0. */
export const DEFAULT_CREASE_ANGLE_DEG = 30;

export interface CreasedMesh {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint32Array;
}

export function creasedNormalMesh(
  vertices: ArrayLike<number>,
  triangles: ArrayLike<number>,
  creaseAngleDeg = DEFAULT_CREASE_ANGLE_DEG,
): CreasedMesh {
  const creaseDot = Math.cos(creaseAngleDeg * Math.PI / 180);
  const vertexCount = vertices.length / 3;
  const faces = faceNormals(vertices, triangles);
  const fans = vertexFans(triangles, vertexCount);
  const out = new OutputVertices(vertexCount);
  const indices = new Uint32Array(triangles.length);
  const normal = [0, 0, 0];
  for (let v = 0; v < vertexCount; v++) {
    out.startVertex();
    for (let k = fans.start[v]!; k < fans.start[v + 1]!; k++) {
      cornerNormal(faces, fans, v, Math.floor(fans.corners[k]! / 3), creaseDot, normal);
      indices[fans.corners[k]!] = out.vertexFor(vertices, v, normal);
    }
  }
  return { ...out.finish(), indices };
}

interface FaceNormals {
  /** Unnormalized cross products: direction times twice the area. */
  readonly area: Float32Array;
  readonly unit: Float32Array;
}

function faceNormals(vertices: ArrayLike<number>, triangles: ArrayLike<number>): FaceNormals {
  const triCount = triangles.length / 3;
  const area = new Float32Array(triCount * 3);
  const unit = new Float32Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    const a = triangles[3 * t]! * 3, b = triangles[3 * t + 1]! * 3, c = triangles[3 * t + 2]! * 3;
    const ux = vertices[b]! - vertices[a]!, uy = vertices[b + 1]! - vertices[a + 1]!, uz = vertices[b + 2]! - vertices[a + 2]!;
    const vx = vertices[c]! - vertices[a]!, vy = vertices[c + 1]! - vertices[a + 1]!, vz = vertices[c + 2]! - vertices[a + 2]!;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    area[3 * t] = nx; area[3 * t + 1] = ny; area[3 * t + 2] = nz;
    if (len > 0) {
      unit[3 * t] = nx / len; unit[3 * t + 1] = ny / len; unit[3 * t + 2] = nz / len;
    }
  }
  return { area, unit };
}

/** Vertex -> incident triangle corners, in compressed-row form. */
interface VertexFans {
  readonly start: Uint32Array;
  readonly corners: Uint32Array;
}

function vertexFans(triangles: ArrayLike<number>, vertexCount: number): VertexFans {
  const start = new Uint32Array(vertexCount + 1);
  for (let i = 0; i < triangles.length; i++) start[triangles[i]! + 1]!++;
  for (let v = 0; v < vertexCount; v++) start[v + 1]! += start[v]!;
  const fill = start.slice(0, vertexCount);
  const corners = new Uint32Array(triangles.length);
  for (let i = 0; i < triangles.length; i++) corners[fill[triangles[i]!]!++] = i;
  return { start, corners };
}

/** Unit normal of triangle `t` at vertex `v`: the area-weighted mean of the
 *  fan triangles within the crease angle of `t`. Writes into `out`. */
function cornerNormal(
  faces: FaceNormals,
  fans: VertexFans,
  v: number,
  t: number,
  creaseDot: number,
  out: number[],
): void {
  const { area, unit } = faces;
  out[0] = 0; out[1] = 0; out[2] = 0;
  for (let j = fans.start[v]!; j < fans.start[v + 1]!; j++) {
    const o = Math.floor(fans.corners[j]! / 3);
    const dot = unit[3 * t]! * unit[3 * o]! + unit[3 * t + 1]! * unit[3 * o + 1]! + unit[3 * t + 2]! * unit[3 * o + 2]!;
    if (o === t || dot > creaseDot) addFace(area, o, out);
  }
  if (Math.hypot(out[0]!, out[1]!, out[2]!) === 0) {
    // A degenerate sliver has no direction of its own: borrow the fan's.
    for (let j = fans.start[v]!; j < fans.start[v + 1]!; j++) addFace(area, Math.floor(fans.corners[j]! / 3), out);
  }
  const len = Math.hypot(out[0]!, out[1]!, out[2]!);
  if (len > 0) {
    out[0]! /= len; out[1]! /= len; out[2]! /= len;
  } else {
    out[2] = 1;
  }
}

function addFace(area: Float32Array, t: number, out: number[]): void {
  out[0]! += area[3 * t]!; out[1]! += area[3 * t + 1]!; out[2]! += area[3 * t + 2]!;
}

/** Output buffers. Grow only at creases; start at the welded vertex count. */
class OutputVertices {
  private positions: Float32Array<ArrayBuffer>;
  private normals: Float32Array<ArrayBuffer>;
  private count = 0;
  private readonly forVertex: number[] = [];

  constructor(vertexCount: number) {
    this.positions = new Float32Array(Math.max(vertexCount, 1) * 3);
    this.normals = new Float32Array(this.positions.length);
  }

  startVertex(): void {
    this.forVertex.length = 0;
  }

  /** Reuse the copy of `v` whose normal matches, or append a new one. */
  vertexFor(vertices: ArrayLike<number>, v: number, n: readonly number[]): number {
    const normals = this.normals;
    for (const candidate of this.forVertex) {
      const dot = normals[3 * candidate]! * n[0]! + normals[3 * candidate + 1]! * n[1]! + normals[3 * candidate + 2]! * n[2]!;
      if (dot > 1 - 1e-6) return candidate;
    }
    if (3 * this.count === this.positions.length) {
      this.positions = grow(this.positions);
      this.normals = grow(this.normals);
    }
    const out = this.count++;
    this.positions.set([vertices[3 * v]!, vertices[3 * v + 1]!, vertices[3 * v + 2]!], 3 * out);
    this.normals.set([n[0]!, n[1]!, n[2]!], 3 * out);
    this.forVertex.push(out);
    return out;
  }

  finish(): { positions: Float32Array; normals: Float32Array } {
    return { positions: this.positions.slice(0, 3 * this.count), normals: this.normals.slice(0, 3 * this.count) };
  }
}

function grow(values: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
  const next = new Float32Array(values.length * 2);
  next.set(values);
  return next;
}
