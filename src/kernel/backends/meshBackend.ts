// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from './backend';
import type { RuntimeMesh } from './runtimeMesh';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';
import type { GyrationAxis, MassProperties } from '../properties/massProperties';

/** Indexed triangle geometry for display and rigid assembly placement only. */
export class MeshBackend implements ShapeBackend {
  readonly target = 'export-occt' as const;
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly normals: Float32Array;

  constructor(positions: Float32Array, indices: Uint32Array) {
    this.positions = positions;
    this.indices = indices;
    this.normals = computeNormals(positions, indices);
  }
  clone(): MeshBackend { return this.withPositions(this.positions); }
  /** Same mesh, new vertex positions; subclasses keep their own type. */
  protected withPositions(p: Float32Array): MeshBackend { return new MeshBackend(p, this.indices); }

  protected unsupported(operation: string): never {
    throw new Error(`Display mesh bodies do not support ${operation}; convert to BRep explicitly when solid operations are needed.`);
  }
  translate(x: number, y: number, z: number): MeshBackend {
    const p = this.positions.slice();
    for (let i = 0; i < p.length; i += 3) { p[i]! += x; p[i + 1]! += y; p[i + 2]! += z; }
    return this.withPositions(p);
  }
  rotate(axis: Vec3, degrees: number, pivot: Vec3 = [0, 0, 0]): MeshBackend {
    const [ax, ay, az] = axis; const n = Math.hypot(ax, ay, az);
    if (!n) return this;
    const [x, y, z] = [ax / n, ay / n, az / n];
    const c = Math.cos(degrees * Math.PI / 180), s = Math.sin(degrees * Math.PI / 180);
    const p = this.positions.slice();
    for (let i = 0; i < p.length; i += 3) {
      const px = p[i]! - pivot[0], py = p[i + 1]! - pivot[1], pz = p[i + 2]! - pivot[2];
      p[i] = pivot[0] + px * c + (y * pz - z * py) * s + x * (x * px + y * py + z * pz) * (1 - c);
      p[i + 1] = pivot[1] + py * c + (z * px - x * pz) * s + y * (x * px + y * py + z * pz) * (1 - c);
      p[i + 2] = pivot[2] + pz * c + (x * py - y * px) * s + z * (x * px + y * py + z * pz) * (1 - c);
    }
    return this.withPositions(p);
  }
  scale(s: number | Vec3): MeshBackend {
    const v = typeof s === 'number' ? [s, s, s] : s;
    const p = this.positions.slice();
    for (let i = 0; i < p.length; i += 3) { p[i]! *= v[0]!; p[i + 1]! *= v[1]!; p[i + 2]! *= v[2]!; }
    return this.withPositions(p);
  }
  transform(t: Transform): MeshBackend { const d = t.decomposeToTranslateAndRotate(); return this.rotate([d.rotateAxis[0], d.rotateAxis[1], d.rotateAxis[2]], d.rotateDeg).translate(d.translate[0], d.translate[1], d.translate[2]); }
  union(): never { return this.unsupported('booleans'); }
  subtract(): never { return this.unsupported('booleans'); }
  intersect(): never { return this.unsupported('booleans'); }
  splitByPlane(): never { return this.unsupported('solid splits'); }
  boundingBox(): { min: Vec3; max: Vec3 } {
    const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.positions.length; i += 3) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], this.positions[i + a]!); max[a] = Math.max(max[a], this.positions[i + a]!); }
    return { min, max };
  }
  volume(): number { return this.unsupported('volume queries'); }
  surfaceArea(): number { return this.unsupported('surface area queries'); }
  massProperties(...args: [density?: number, gyrationAxis?: GyrationAxis]): MassProperties {
    void args;
    return this.unsupported('mass properties');
  }
  isEmpty(): boolean { return this.indices.length === 0; }
  solidComponents(): readonly ShapeBackend[] { return this.unsupported('solid component queries'); }
  getMesh(): RuntimeMesh { return { positions: this.positions, indices: this.indices, normals: this.normals }; }
  exportSTL(): Uint8Array { return this.unsupported('solid exports'); }
  exportSTEP(): never { return this.unsupported('STEP export'); }
}

function computeNormals(p: Float32Array, ix: Uint32Array): Float32Array {
  const n = new Float32Array(p.length);
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i]! * 3, b = ix[i + 1]! * 3, c = ix[i + 2]! * 3;
    const abx = p[b]! - p[a]!, aby = p[b + 1]! - p[a + 1]!, abz = p[b + 2]! - p[a + 2]!;
    const acx = p[c]! - p[a]!, acy = p[c + 1]! - p[a + 1]!, acz = p[c + 2]! - p[a + 2]!;
    const x = aby * acz - abz * acy, y = abz * acx - abx * acz, z = abx * acy - aby * acx;
    for (const k of [a, b, c]) { n[k]! += x; n[k + 1]! += y; n[k + 2]! += z; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i]!, n[i + 1]!, n[i + 2]!) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}

/** Pure STL decoder. STL repeats vertices per triangle; exact-bit welding builds the display index. */
export function decodeStlMesh(bytes: Uint8Array): { positions: Float32Array; indices: Uint32Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const binaryCount = binaryStlTriangleCount(bytes, view);
  if (binaryCount !== undefined) {
    const builder = new IndexedMeshBuilder(binaryCount);
    for (let i = 0, o = 84; i < binaryCount; i++, o += 50) {
      for (let j = 0; j < 3; j++) {
        const at = o + 12 + j * 12;
        builder.addVertex(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
      }
    }
    return builder.finish();
  }
  return decodeAsciiStlMesh(new TextDecoder().decode(bytes));
}

/** Triangle count when `bytes` is a well-formed binary STL; undefined for ASCII. */
function binaryStlTriangleCount(bytes: Uint8Array, view: DataView): number | undefined {
  if (bytes.byteLength < 84) return undefined;
  const count = view.getUint32(80, true);
  if (84 + count * 50 > bytes.byteLength) return undefined;
  const header = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512)));
  const ascii = /^solid\s/i.test(header) && /\bfacet\s+normal\b/i.test(header);
  return ascii ? undefined : count;
}

function decodeAsciiStlMesh(text: string): { positions: Float32Array; indices: Uint32Array } {
  if (!/^solid\s/i.test(text) || !/\bfacet\s+normal\b/i.test(text)) {
    throw new Error('Malformed STL: expected a valid binary record stream or ASCII solid with facets.');
  }
  const vertices = text.match(/\bvertex\s+/gi)?.length ?? 0;
  if (vertices === 0 || vertices % 3 !== 0) throw new Error('Malformed ASCII STL: facets must contain exactly three vertices.');
  const triangleCount = vertices / 3;
  const builder = new IndexedMeshBuilder(triangleCount);
  const vertexPattern = /\bvertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/gi;
  let match: RegExpExecArray | null;
  let seen = 0;
  while ((match = vertexPattern.exec(text)) !== null) {
    builder.addVertex(Number(match[1]), Number(match[2]), Number(match[3]));
    seen++;
  }
  if (seen !== triangleCount * 3) throw new Error('Malformed ASCII STL: could not decode all facet vertices.');
  return builder.finish();
}

/** Welds STL triangle-soup vertices into indexed buffers. Numeric hash chains
 *  avoid allocating a string key or JS array per STL vertex. Collisions are
 *  resolved against the stored Float32 coordinates. */
class IndexedMeshBuilder {
  private readonly positions: Float32Array;
  private readonly indices: Uint32Array;
  private readonly hashHeads = new Map<number, number>();
  private readonly chainNext: Int32Array;
  private positionCount = 0;
  private indexCount = 0;

  constructor(triangleCount: number) {
    this.positions = new Float32Array(triangleCount * 9);
    this.indices = new Uint32Array(triangleCount * 3);
    this.chainNext = new Int32Array(triangleCount * 3);
  }

  addVertex(x: number, y: number, z: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('STL contains non-finite vertex coordinates.');
    }
    const fx = Math.fround(x), fy = Math.fround(y), fz = Math.fround(z);
    const hash = coordinateHash(fx, fy, fz);
    const existing = this.find(hash, fx, fy, fz);
    if (existing !== undefined) {
      this.indices[this.indexCount++] = existing;
      return;
    }
    const index = this.positionCount++;
    const offset = index * 3;
    this.positions[offset] = fx; this.positions[offset + 1] = fy; this.positions[offset + 2] = fz;
    this.chainNext[index] = this.hashHeads.get(hash) ?? -1;
    this.hashHeads.set(hash, index);
    this.indices[this.indexCount++] = index;
  }

  private find(hash: number, fx: number, fy: number, fz: number): number | undefined {
    let index = this.hashHeads.get(hash);
    while (index !== undefined) {
      const offset = index * 3;
      const p = this.positions;
      if (p[offset] === fx && p[offset + 1] === fy && p[offset + 2] === fz) return index;
      const next = this.chainNext[index]!;
      index = next < 0 ? undefined : next;
    }
    return undefined;
  }

  finish(): { positions: Float32Array; indices: Uint32Array } {
    return { positions: this.positions.slice(0, this.positionCount * 3), indices: this.indices };
  }
}

const hashScratch = new ArrayBuffer(12);
const hashScratchView = new DataView(hashScratch);

function coordinateHash(x: number, y: number, z: number): number {
  hashScratchView.setFloat32(0, x, true);
  hashScratchView.setFloat32(4, y, true);
  hashScratchView.setFloat32(8, z, true);
  let h = 0x811c9dc5;
  for (let offset = 0; offset < 12; offset += 4) { h = Math.imul(h ^ hashScratchView.getUint32(offset, true), 0x01000193); }
  return h >>> 0;
}
