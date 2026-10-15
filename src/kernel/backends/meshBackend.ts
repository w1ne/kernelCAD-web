// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from './backend';
import type { RuntimeMesh } from './runtimeMesh';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';

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

  private unsupported(operation: string): never {
    throw new Error(`Display mesh bodies do not support ${operation}; convert to BRep explicitly when solid operations are needed.`);
  }
  translate(x: number, y: number, z: number): MeshBackend {
    const p = this.positions.slice();
    for (let i = 0; i < p.length; i += 3) { p[i]! += x; p[i + 1]! += y; p[i + 2]! += z; }
    return new MeshBackend(p, this.indices);
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
    return new MeshBackend(p, this.indices);
  }
  scale(s: number | Vec3): MeshBackend {
    const v = typeof s === 'number' ? [s, s, s] : s;
    const p = this.positions.slice();
    for (let i = 0; i < p.length; i += 3) { p[i]! *= v[0]!; p[i + 1]! *= v[1]!; p[i + 2]! *= v[2]!; }
    return new MeshBackend(p, this.indices);
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
  volume(): never { return this.unsupported('volume queries'); }
  surfaceArea(): never { return this.unsupported('surface area queries'); }
  massProperties(): never { return this.unsupported('mass properties'); }
  isEmpty(): boolean { return this.indices.length === 0; }
  solidComponents(): never { return this.unsupported('solid component queries'); }
  getMesh(): RuntimeMesh { return { positions: this.positions, indices: this.indices, normals: this.normals }; }
  exportSTL(): never { return this.unsupported('solid exports'); }
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
  let triangles: number[][] = [];
  const count = bytes.byteLength >= 84 ? view.getUint32(80, true) : 0;
  if (count > 0 && 84 + count * 50 === bytes.byteLength) {
    for (let i = 0, o = 84; i < count; i++, o += 50) {
      triangles.push([0, 1, 2].map(j => o + 12 + j * 12).flatMap(a => [view.getFloat32(a, true), view.getFloat32(a + 4, true), view.getFloat32(a + 8, true)]));
    }
  } else {
    const text = new TextDecoder().decode(bytes);
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/gi;
    let m: RegExpExecArray | null, verts: number[] = [];
    while ((m = re.exec(text))) { verts.push(+m[1]!, +m[2]!, +m[3]!); if (verts.length === 9) { triangles.push(verts); verts = []; } }
  }
  if (!triangles.length) throw new Error('STL contains no triangles.');
  const map = new Map<string, number>(), positions: number[] = [], indices: number[] = [];
  for (const tri of triangles) for (let j = 0; j < 9; j += 3) {
    const xyz = [tri[j]!, tri[j + 1]!, tri[j + 2]!];
    if (!xyz.every(Number.isFinite)) throw new Error('STL contains non-finite vertex coordinates.');
    const key = `${xyz[0]},${xyz[1]},${xyz[2]}`;
    let idx = map.get(key);
    if (idx === undefined) { idx = positions.length / 3; map.set(key, idx); positions.push(...xyz); }
    indices.push(idx);
  }
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) };
}
