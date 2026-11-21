// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/plyFormat.ts
//
// Stanford PLY writer for tessellated kernelCAD bodies and assemblies.
//
// Layout follows the reader conventions shared by MeshLab, Blender's PLY
// importer, trimesh and Open3D:
//
//   ply
//   format binary_little_endian 1.0        (or `format ascii 1.0`)
//   comment kernelCAD PLY mesh export; units mm; Z up
//   comment part <index> <name>             (one per part, in file order)
//   element vertex N
//   property float x / y / z
//   property float nx / ny / nz            (normals: true, the default)
//   property uchar red / green / blue      (colors: 'vertex', the default)
//   element face M
//   property list uchar int vertex_indices
//   property uchar red / green / blue      (colors: 'face')
//   end_header
//
// Parts are concatenated into one vertex / face list in the order given;
// callers pass them already in world space. Normals are per vertex with a
// crease split: a vertex shared by faces meeting at more than
// `creaseAngleDeg` is duplicated, so a box keeps flat sides and a cylinder
// stays smooth. The split only adds vertices; the triangle count and the
// geometry are those of the source mesh.

import { DEFAULT_COLOR, resolveColor } from '../../shared/render/palette';
import type { IndexedMesh } from './meshFormats';
import { splitByCrease } from './creaseSplit';

export type PlyEncoding = 'binary' | 'ascii';
export type PlyColorMode = 'vertex' | 'face' | 'none';

export interface PlyWriterOptions {
  /** Default 'binary' (binary_little_endian 1.0). */
  encoding?: PlyEncoding;
  /** Per-vertex normals (nx, ny, nz). Default true. */
  normals?: boolean;
  /** Where the part colour is written. Default 'vertex'. */
  colors?: PlyColorMode;
  /** Faces meeting at more than this angle get split normals. Default 30. */
  creaseAngleDeg?: number;
}

export interface PlyPart {
  name: string;
  mesh: IndexedMesh;
  /** 8-bit sRGB colour; omitted parts are written in DEFAULT_COLOR. */
  rgb?: readonly [number, number, number];
}

/** Resolve a `.color()` token / hex and an optional `.finish()` / `.material()`
 *  base colour to 8-bit RGB. Same precedence as the 3MF and GLB writers: the
 *  material's base colour wins over the plain colour. */
export function plyPartRgb(color: string | undefined, materialBaseColor: string | undefined): [number, number, number] {
  return hexToRgb(resolveColor(materialBaseColor ?? color)) ?? hexToRgb(DEFAULT_COLOR)!;
}

function hexToRgb(hex: string | undefined): [number, number, number] | undefined {
  if (hex === undefined) return undefined;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (short) return [parseInt(short[1]! + short[1]!, 16), parseInt(short[2]! + short[2]!, 16), parseInt(short[3]! + short[3]!, 16)];
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i.exec(hex);
  if (!long) return undefined;
  return [parseInt(long[1]!, 16), parseInt(long[2]!, 16), parseInt(long[3]!, 16)];
}

interface MergedMesh {
  positions: Float32Array;
  normals: Float32Array | undefined;
  vertexRgb: Uint8Array;
  triangles: Uint32Array;
  faceRgb: Uint8Array;
}

/** Encode one or more triangle meshes as a single Stanford PLY file. */
export function exportMeshPly(parts: readonly PlyPart[], options: PlyWriterOptions = {}): Uint8Array {
  if (parts.length === 0) throw new Error('PLY export requires at least one mesh.');
  const encoding = options.encoding ?? 'binary';
  const colors = options.colors ?? 'vertex';
  const withNormals = options.normals ?? true;
  const merged = mergeParts(parts, withNormals, options.creaseAngleDeg ?? 30);
  const header = plyHeader(parts, merged, encoding, withNormals, colors);
  return encoding === 'ascii'
    ? new TextEncoder().encode(header + asciiBody(merged, colors))
    : binaryFile(header, merged, colors);
}

function plyHeader(
  parts: readonly PlyPart[],
  merged: MergedMesh,
  encoding: PlyEncoding,
  withNormals: boolean,
  colors: PlyColorMode,
): string {
  const rgb = ['property uchar red', 'property uchar green', 'property uchar blue'];
  const lines = [
    'ply',
    `format ${encoding === 'ascii' ? 'ascii' : 'binary_little_endian'} 1.0`,
    'comment kernelCAD PLY mesh export; units mm; Z up',
    ...parts.map((p, i) => `comment part ${i} ${headerSafe(p.name)}`),
    `element vertex ${merged.positions.length / 3}`,
    'property float x', 'property float y', 'property float z',
    ...(withNormals ? ['property float nx', 'property float ny', 'property float nz'] : []),
    ...(colors === 'vertex' ? rgb : []),
    `element face ${merged.triangles.length / 3}`,
    'property list uchar int vertex_indices',
    ...(colors === 'face' ? rgb : []),
    'end_header',
  ];
  return `${lines.join('\n')}\n`;
}

function headerSafe(name: string): string {
  return name.replace(/[\r\n]+/g, ' ').trim() || 'part';
}

function mergeParts(parts: readonly PlyPart[], withNormals: boolean, creaseAngleDeg: number): MergedMesh {
  const meshes = parts.map(p => {
    validatePlyMesh(p.name, p.mesh);
    return withNormals ? splitByCrease(p.mesh, creaseAngleDeg) : plainMesh(p.mesh);
  });
  const vertexCount = meshes.reduce((n, m) => n + m.positions.length / 3, 0);
  const triangleCount = meshes.reduce((n, m) => n + m.triangles.length / 3, 0);
  const out: MergedMesh = {
    positions: new Float32Array(vertexCount * 3),
    normals: withNormals ? new Float32Array(vertexCount * 3) : undefined,
    vertexRgb: new Uint8Array(vertexCount * 3),
    triangles: new Uint32Array(triangleCount * 3),
    faceRgb: new Uint8Array(triangleCount * 3),
  };
  let vBase = 0;
  let tBase = 0;
  meshes.forEach((m, i) => {
    const rgb = parts[i]!.rgb ?? hexToRgb(DEFAULT_COLOR)!;
    out.positions.set(m.positions, vBase * 3);
    if (out.normals && m.normals) out.normals.set(m.normals, vBase * 3);
    const nv = m.positions.length / 3;
    for (let v = 0; v < nv; v++) out.vertexRgb.set(rgb, (vBase + v) * 3);
    const nt = m.triangles.length / 3;
    for (let k = 0; k < m.triangles.length; k++) out.triangles[tBase * 3 + k] = m.triangles[k]! + vBase;
    for (let t = 0; t < nt; t++) out.faceRgb.set(rgb, (tBase + t) * 3);
    vBase += nv;
    tBase += nt;
  });
  return out;
}

function validatePlyMesh(name: string, mesh: IndexedMesh): void {
  const { vertices, triangles } = mesh;
  if (vertices.length === 0 || vertices.length % 3 !== 0) throw new Error(`Mesh '${name}' has an invalid vertex array.`);
  if (triangles.length === 0 || triangles.length % 3 !== 0) throw new Error(`Mesh '${name}' has an invalid triangle array.`);
  for (const value of vertices) if (!Number.isFinite(value)) throw new Error(`Mesh '${name}' contains a non-finite vertex.`);
  const vertexCount = vertices.length / 3;
  for (const index of triangles) {
    if (!Number.isInteger(index) || index < 0 || index >= vertexCount) throw new Error(`Mesh '${name}' has an out-of-range triangle index.`);
  }
}

interface PartMesh { positions: Float32Array; normals?: Float32Array; triangles: Uint32Array }

function plainMesh(mesh: IndexedMesh): PartMesh {
  return { positions: Float32Array.from(mesh.vertices), triangles: Uint32Array.from(mesh.triangles) };
}

function asciiBody(m: MergedMesh, colors: PlyColorMode): string {
  const lines: string[] = [];
  const nv = m.positions.length / 3;
  for (let i = 0; i < nv; i++) {
    const row = [m.positions[i * 3]!, m.positions[i * 3 + 1]!, m.positions[i * 3 + 2]!].map(asciiFloat);
    if (m.normals) row.push(...[m.normals[i * 3]!, m.normals[i * 3 + 1]!, m.normals[i * 3 + 2]!].map(asciiFloat));
    if (colors === 'vertex') row.push(String(m.vertexRgb[i * 3]), String(m.vertexRgb[i * 3 + 1]), String(m.vertexRgb[i * 3 + 2]));
    lines.push(row.join(' '));
  }
  const nt = m.triangles.length / 3;
  for (let f = 0; f < nt; f++) {
    const row = ['3', String(m.triangles[f * 3]), String(m.triangles[f * 3 + 1]), String(m.triangles[f * 3 + 2])];
    if (colors === 'face') row.push(String(m.faceRgb[f * 3]), String(m.faceRgb[f * 3 + 1]), String(m.faceRgb[f * 3 + 2]));
    lines.push(row.join(' '));
  }
  return `${lines.join('\n')}\n`;
}

/** Shortest decimal that round-trips the float32 value written in binary. */
function asciiFloat(value: number): string {
  const f = Math.fround(value);
  if (f === 0) return '0';
  for (let digits = 6; digits < 10; digits++) {
    const text = Number(f.toPrecision(digits)).toString();
    if (Math.fround(Number(text)) === f) return text;
  }
  return String(f);
}

function binaryFile(header: string, m: MergedMesh, colors: PlyColorMode): Uint8Array {
  const headerBytes = new TextEncoder().encode(header);
  const nv = m.positions.length / 3;
  const nt = m.triangles.length / 3;
  const vertexStride = 12 + (m.normals ? 12 : 0) + (colors === 'vertex' ? 3 : 0);
  const faceStride = 13 + (colors === 'face' ? 3 : 0);
  const out = new Uint8Array(headerBytes.length + nv * vertexStride + nt * faceStride);
  out.set(headerBytes, 0);
  const view = new DataView(out.buffer);
  let o = headerBytes.length;
  for (let i = 0; i < nv; i++) {
    for (let c = 0; c < 3; c++, o += 4) view.setFloat32(o, m.positions[i * 3 + c]!, true);
    if (m.normals) for (let c = 0; c < 3; c++, o += 4) view.setFloat32(o, m.normals[i * 3 + c]!, true);
    if (colors === 'vertex') { out.set(m.vertexRgb.subarray(i * 3, i * 3 + 3), o); o += 3; }
  }
  for (let f = 0; f < nt; f++) {
    view.setUint8(o, 3); o += 1;
    for (let c = 0; c < 3; c++, o += 4) view.setInt32(o, m.triangles[f * 3 + c]!, true);
    if (colors === 'face') { out.set(m.faceRgb.subarray(f * 3, f * 3 + 3), o); o += 3; }
  }
  return out;
}
