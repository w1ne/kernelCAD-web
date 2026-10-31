// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Minimal independent Stanford PLY reader for tests: parses the header
// grammar (element / property / property list) and decodes ascii or
// binary_little_endian bodies by the declared types, not by assumptions
// about the writer's layout.

export interface PlyProperty { name: string; type: string; list?: { countType: string; itemType: string } }
export interface PlyElement { name: string; count: number; properties: PlyProperty[] }
export interface ParsedPly {
  format: 'ascii' | 'binary_little_endian' | 'binary_big_endian';
  comments: string[];
  elements: PlyElement[];
  /** element name -> rows of property name -> number | number[] */
  data: Record<string, Array<Record<string, number | number[]>>>;
}

const SIZES: Record<string, number> = { char: 1, uchar: 1, short: 2, ushort: 2, int: 4, uint: 4, float: 4, double: 8 };

function readScalar(view: DataView, o: number, type: string): number {
  switch (type) {
    case 'char': return view.getInt8(o);
    case 'uchar': return view.getUint8(o);
    case 'short': return view.getInt16(o, true);
    case 'ushort': return view.getUint16(o, true);
    case 'int': return view.getInt32(o, true);
    case 'uint': return view.getUint32(o, true);
    case 'float': return view.getFloat32(o, true);
    case 'double': return view.getFloat64(o, true);
    default: throw new Error(`unknown PLY type ${type}`);
  }
}

export function parsePly(bytes: Uint8Array): ParsedPly {
  const marker = new TextEncoder().encode('end_header\n');
  let end = -1;
  for (let i = 0; i + marker.length <= bytes.length; i++) {
    if (marker.every((b, k) => bytes[i + k] === b)) { end = i + marker.length; break; }
  }
  if (end < 0) throw new Error('no end_header');
  const header = new TextDecoder().decode(bytes.subarray(0, end)).split('\n').filter(Boolean);
  if (header[0] !== 'ply') throw new Error('missing ply magic');
  const out: ParsedPly = { format: 'ascii', comments: [], elements: [], data: {} };
  for (const line of header.slice(1)) {
    const [kw, ...rest] = line.split(' ');
    if (kw === 'format') out.format = rest[0] as ParsedPly['format'];
    else if (kw === 'comment') out.comments.push(rest.join(' '));
    else if (kw === 'element') out.elements.push({ name: rest[0]!, count: Number(rest[1]), properties: [] });
    else if (kw === 'property') {
      const el = out.elements.at(-1)!;
      if (rest[0] === 'list') el.properties.push({ name: rest[3]!, type: 'list', list: { countType: rest[1]!, itemType: rest[2]! } });
      else el.properties.push({ name: rest[1]!, type: rest[0]! });
    }
  }
  if (out.format === 'binary_big_endian') throw new Error('big endian not supported by the test reader');
  if (out.format === 'ascii') {
    const tokens = new TextDecoder().decode(bytes.subarray(end)).split(/\s+/).filter(Boolean).map(Number);
    let t = 0;
    for (const el of out.elements) {
      out.data[el.name] = [];
      for (let r = 0; r < el.count; r++) {
        const row: Record<string, number | number[]> = {};
        for (const p of el.properties) {
          if (p.list) { const n = tokens[t++]!; row[p.name] = tokens.slice(t, t + n); t += n; } else row[p.name] = tokens[t++]!;
        }
        out.data[el.name]!.push(row);
      }
    }
    if (t !== tokens.length) throw new Error(`ascii body has ${tokens.length - t} trailing tokens`);
    return out;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = end;
  for (const el of out.elements) {
    out.data[el.name] = [];
    for (let r = 0; r < el.count; r++) {
      const row: Record<string, number | number[]> = {};
      for (const p of el.properties) {
        if (p.list) {
          const n = readScalar(view, o, p.list.countType); o += SIZES[p.list.countType]!;
          const items: number[] = [];
          for (let k = 0; k < n; k++) { items.push(readScalar(view, o, p.list.itemType)); o += SIZES[p.list.itemType]!; }
          row[p.name] = items;
        } else { row[p.name] = readScalar(view, o, p.type); o += SIZES[p.type]!; }
      }
      out.data[el.name]!.push(row);
    }
  }
  if (o !== bytes.length) throw new Error(`binary body has ${bytes.length - o} trailing bytes`);
  return out;
}

export function plyBbox(ply: ParsedPly): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const v of ply.data.vertex ?? []) {
    ['x', 'y', 'z'].forEach((k, i) => { min[i] = Math.min(min[i]!, v[k] as number); max[i] = Math.max(max[i]!, v[k] as number); });
  }
  return { min, max };
}
