// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/meshIO.ts
//
// Triangle-soup readers for the mesh formats an agent is realistically handed:
// STL (binary + ASCII), OBJ, and 3MF. They return raw triangles only — the
// reconstruction pipeline wants coordinates, not OCCT topology, so this does
// NOT go through `lib.fromSTL` (which sews facets into a B-rep and costs
// ~0.45 ms/triangle). Pure TypeScript: callers pass bytes they already read.

import { unzipSync } from 'fflate';

export type MeshFormat = 'stl' | 'obj' | '3mf';

export interface TriangleSoup {
  /** 9 numbers per triangle: ax ay az bx by bz cx cy cz. */
  positions: Float64Array;
  format: MeshFormat;
  /** Unit the coordinates were declared in, converted to mm. STL/OBJ carry
   *  no unit, so they are read as millimetres and `unitDeclared` is false. */
  unitDeclared: boolean;
  /** Declared unit name when the format carries one (3MF). */
  unit?: string;
}

export class MeshParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeshParseError';
  }
}

/** Pick the format from the file extension, falling back to content sniffing. */
export function detectMeshFormat(fileName: string | undefined, bytes: Uint8Array): MeshFormat {
  const lower = (fileName ?? '').toLowerCase();
  if (lower.endsWith('.stl')) return 'stl';
  if (lower.endsWith('.obj')) return 'obj';
  if (lower.endsWith('.3mf')) return '3mf';
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return '3mf';
  }
  if (isBinaryStl(bytes)) return 'stl';
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512))).trimStart();
  if (head.startsWith('solid')) return 'stl';
  if (/^(v|vn|vt|f|o|g|#|mtllib|usemtl|s)\s/m.test(head)) return 'obj';
  throw new MeshParseError('Unrecognised mesh format — pass a .stl, .obj, or .3mf file.');
}

/** Binary STL is an 80-byte header, a uint32 LE triangle count, then 50
 *  bytes per triangle; a file whose length matches that layout exactly is
 *  binary even when its header happens to start with "solid" (the same rule
 *  the OCCT STL importer uses). */
function isBinaryStl(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 84) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(80, true);
  return bytes.byteLength === 84 + n * 50;
}

export function parseMeshBytes(bytes: Uint8Array, format: MeshFormat): TriangleSoup {
  switch (format) {
    case 'stl':
      return parseStl(bytes);
    case 'obj':
      return parseObj(new TextDecoder().decode(bytes));
    case '3mf':
      return parse3mf(bytes);
  }
}

export function parseStl(bytes: Uint8Array): TriangleSoup {
  if (isBinaryStl(bytes)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = view.getUint32(80, true);
    const positions = new Float64Array(n * 9);
    for (let t = 0; t < n; t++) {
      const base = 84 + t * 50 + 12; // skip the facet normal
      for (let k = 0; k < 9; k++) positions[t * 9 + k] = view.getFloat32(base + k * 4, true);
    }
    return { positions, format: 'stl', unitDeclared: false };
  }
  const text = new TextDecoder().decode(bytes);
  const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
  const coords: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    coords.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if (coords.length === 0 || coords.length % 9 !== 0 || coords.some((c) => !Number.isFinite(c))) {
    throw new MeshParseError('STL parse failed — neither a valid binary layout nor ASCII facet/vertex records.');
  }
  return { positions: Float64Array.from(coords), format: 'stl', unitDeclared: false };
}

export function parseObj(text: string): TriangleSoup {
  const verts: number[] = [];
  const tris: number[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('v ')) {
      const p = line.split(/\s+/);
      verts.push(Number(p[1]), Number(p[2]), Number(p[3]));
    } else if (line.startsWith('f ')) {
      const count = verts.length / 3;
      const idx = line
        .split(/\s+/)
        .slice(1)
        .map((tok) => {
          const i = parseInt(tok.split('/')[0], 10);
          return i < 0 ? count + i : i - 1;
        });
      for (let k = 1; k + 1 < idx.length; k++) tris.push(idx[0], idx[k], idx[k + 1]);
    }
  }
  const vCount = verts.length / 3;
  if (tris.length === 0 || verts.some((c) => !Number.isFinite(c)) || tris.some((i) => !(i >= 0 && i < vCount))) {
    throw new MeshParseError('OBJ parse failed — no faces, or a face references a missing vertex.');
  }
  const positions = new Float64Array(tris.length * 3);
  for (let i = 0; i < tris.length; i++) {
    positions[i * 3] = verts[tris[i] * 3];
    positions[i * 3 + 1] = verts[tris[i] * 3 + 1];
    positions[i * 3 + 2] = verts[tris[i] * 3 + 2];
  }
  return { positions, format: 'obj', unitDeclared: false };
}

const UNIT_TO_MM: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

export function parse3mf(bytes: Uint8Array): TriangleSoup {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new MeshParseError('3MF parse failed — the file is not a valid zip archive.');
  }
  const modelName = Object.keys(files).find((n) => n.toLowerCase().endsWith('.model'));
  if (!modelName) throw new MeshParseError('3MF parse failed — no 3D/*.model part in the archive.');
  const xml = new TextDecoder().decode(files[modelName]);
  const unit = /<model[^>]*\sunit="([a-z]+)"/i.exec(xml)?.[1] ?? 'millimeter';
  const unitScale = UNIT_TO_MM[unit] ?? 1;
  const out: number[] = [];
  const objectRe = /<object\b[\s\S]*?<\/object>/g;
  let obj: RegExpExecArray | null;
  while ((obj = objectRe.exec(xml)) !== null) {
    const body = obj[0];
    const verts: number[] = [];
    const vRe = /<vertex\b([^>]*)\/?>/g;
    let v: RegExpExecArray | null;
    while ((v = vRe.exec(body)) !== null) {
      const attr = v[1];
      verts.push(num(attr, 'x'), num(attr, 'y'), num(attr, 'z'));
    }
    const tRe = /<triangle\b([^>]*)\/?>/g;
    let t: RegExpExecArray | null;
    const vCount = verts.length / 3;
    while ((t = tRe.exec(body)) !== null) {
      const attr = t[1];
      for (const key of ['v1', 'v2', 'v3']) {
        const i = num(attr, key);
        if (!(i >= 0 && i < vCount)) throw new MeshParseError('3MF parse failed — a triangle references a missing vertex.');
        out.push(verts[i * 3] * unitScale, verts[i * 3 + 1] * unitScale, verts[i * 3 + 2] * unitScale);
      }
    }
  }
  if (out.length === 0 || out.some((c) => !Number.isFinite(c))) {
    throw new MeshParseError('3MF parse failed — the model part holds no mesh triangles.');
  }
  return { positions: Float64Array.from(out), format: '3mf', unitDeclared: true, unit };
}

function num(attr: string, key: string): number {
  const m = new RegExp(`\\b${key}="([^"]+)"`).exec(attr);
  return m ? Number(m[1]) : NaN;
}
