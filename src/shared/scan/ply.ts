// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// ASCII PLY and binary_little_endian PLY with scalar vertex properties.
// List properties and binary_big_endian are refused by name.

import { SCAN_PARSE_LIMIT } from './types';

const SCALAR_WIDTH: Record<string, number> = {
  char: 1, int8: 1, uchar: 1, uint8: 1,
  short: 2, int16: 2, ushort: 2, uint16: 2,
  int: 4, int32: 4, uint: 4, uint32: 4,
  float: 4, float32: 4, double: 8, float64: 8,
};

interface PlyProp { name: string; type: string; width: number }

interface PlyHeader {
  format: 'ascii' | 'binary_little_endian';
  vertexCount: number;
  properties: PlyProp[];
  headerBytes: number;
}

export interface ParsedCloud {
  format: 'ply-ascii' | 'ply-binary-little-endian' | 'xyz';
  coords: Float64Array;
}

function headerEnd(bytes: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 1_048_576)));
  const at = text.search(/^end_header[ \t]*$/m);
  if (at < 0) return -1;
  const end = text.indexOf('\n', at);
  if (end < 0) return -1;
  return end + 1;
}

function readFormat(lines: readonly string[]): PlyHeader['format'] | string {
  const line = lines.find(item => item.startsWith('format '));
  if (!line) return 'PLY header has no format line';
  const parts = line.split(/\s+/);
  if (parts[2] !== '1.0') return `PLY format version "${parts[2] ?? ''}" is refused; expected 1.0`;
  if (parts[1] === 'ascii' || parts[1] === 'binary_little_endian') return parts[1];
  if (parts[1] === 'binary_big_endian') {
    return 'Binary PLY format binary_big_endian is refused. Export format ascii 1.0 or format binary_little_endian 1.0.';
  }
  return `PLY format "${parts[1] ?? ''}" is refused`;
}

function readProperty(line: string): PlyProp | string {
  const parts = line.split(/\s+/);
  if (parts[0] !== 'property') return `PLY expected a property line, found: ${line}`;
  if (parts[1] === 'list') {
    const name = parts[parts.length - 1] ?? 'list';
    return `PLY list property "${name}" is refused. Export scalar x, y, z.`;
  }
  if (parts.length !== 3) return `PLY property line must be "property <type> <name>": ${line}`;
  const width = SCALAR_WIDTH[parts[1]];
  if (width === undefined) return `PLY property type "${parts[1]}" is refused`;
  return { name: parts[2], type: parts[1], width };
}

function headerNoise(line: string): boolean {
  return line === 'ply'
    || line.startsWith('format ')
    || line.startsWith('comment ')
    || line.startsWith('obj_info ')
    || line === 'end_header';
}

function vertexProperties(lines: readonly string[]): { count: number; properties: PlyProp[] } | string {
  let count: number | undefined;
  const properties: PlyProp[] = [];
  let inVertex = false;
  for (const line of lines) {
    if (headerNoise(line)) continue;
    if (line.startsWith('element ')) {
      if (inVertex) break;
      const parts = line.split(/\s+/);
      if (parts[1] !== 'vertex') return `PLY element order must start with vertex; found ${parts[1] ?? 'unknown'}`;
      const parsed = Number(parts[2]);
      if (!Number.isInteger(parsed) || parsed < 0) return 'PLY element vertex count must be a non-negative integer';
      inVertex = true;
      count = parsed;
      continue;
    }
    if (!inVertex) return `PLY header line is not a vertex property: ${line}`;
    const prop = readProperty(line);
    if (typeof prop === 'string') return prop;
    properties.push(prop);
  }
  if (count === undefined) return 'PLY header has no element vertex';
  return { count, properties };
}

function xyzIndex(properties: readonly PlyProp[]): [number, number, number] | string {
  const index = (name: string) => properties.findIndex(prop => prop.name === name);
  const xyz: [number, number, number] = [index('x'), index('y'), index('z')];
  if (xyz.some(axis => axis < 0)) return 'PLY vertex properties must include x, y, and z';
  return xyz;
}

function parseHeader(bytes: Uint8Array): PlyHeader | string {
  const headerBytes = headerEnd(bytes);
  if (headerBytes < 0) return 'PLY header has no end_header line';
  const lines = new TextDecoder('latin1').decode(bytes.subarray(0, headerBytes))
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  if (lines[0]?.replace(/^\uFEFF/, '') !== 'ply') return 'PLY must start with ply';
  const format = readFormat(lines);
  if (typeof format !== 'string' || (format !== 'ascii' && format !== 'binary_little_endian')) return format;
  const vertex = vertexProperties(lines);
  if (typeof vertex === 'string') return vertex;
  if (vertex.count > SCAN_PARSE_LIMIT) {
    return `PLY has ${vertex.count} vertices, above the ${SCAN_PARSE_LIMIT} parse limit. Downsample the file first.`;
  }
  return { format, vertexCount: vertex.count, properties: vertex.properties, headerBytes };
}

function readAsciiCoords(body: string, count: number, properties: readonly PlyProp[], xyz: readonly number[]): Float64Array | string {
  const lines = body.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < count) return `ASCII PLY has ${lines.length} vertex lines; header declares ${count}`;
  const coords = new Float64Array(count * 3);
  for (let i = 0; i < count; i++) {
    const tokens = lines[i].split(/\s+/);
    if (tokens.length < properties.length) return `ASCII PLY vertex ${i} has ${tokens.length} values; expected ${properties.length}`;
    for (let axis = 0; axis < 3; axis++) {
      const value = Number(tokens[xyz[axis]]);
      if (!Number.isFinite(value)) return `ASCII PLY vertex ${i} property ${properties[xyz[axis]].name} is not a finite number`;
      coords[i * 3 + axis] = value;
    }
  }
  return coords;
}

const SCALAR_READERS: Record<string, (view: DataView, offset: number) => number> = {
  char: (view, offset) => view.getInt8(offset),
  int8: (view, offset) => view.getInt8(offset),
  uchar: (view, offset) => view.getUint8(offset),
  uint8: (view, offset) => view.getUint8(offset),
  short: (view, offset) => view.getInt16(offset, true),
  int16: (view, offset) => view.getInt16(offset, true),
  ushort: (view, offset) => view.getUint16(offset, true),
  uint16: (view, offset) => view.getUint16(offset, true),
  int: (view, offset) => view.getInt32(offset, true),
  int32: (view, offset) => view.getInt32(offset, true),
  uint: (view, offset) => view.getUint32(offset, true),
  uint32: (view, offset) => view.getUint32(offset, true),
  float: (view, offset) => view.getFloat32(offset, true),
  float32: (view, offset) => view.getFloat32(offset, true),
  double: (view, offset) => view.getFloat64(offset, true),
  float64: (view, offset) => view.getFloat64(offset, true),
};

function readScalar(view: DataView, offset: number, type: string): number {
  const reader = SCALAR_READERS[type];
  return reader ? reader(view, offset) : Number.NaN;
}

function readBinaryCoords(bytes: Uint8Array, header: PlyHeader, xyz: readonly number[]): Float64Array | string {
  const stride = header.properties.reduce((sum, prop) => sum + prop.width, 0);
  const need = header.headerBytes + header.vertexCount * stride;
  if (bytes.length < need) return `Binary PLY vertex block is truncated: need ${need} bytes, have ${bytes.length}`;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const coords = new Float64Array(header.vertexCount * 3);
  for (let i = 0; i < header.vertexCount; i++) {
    let offset = header.headerBytes + i * stride;
    const values: number[] = [];
    for (const prop of header.properties) {
      values.push(readScalar(view, offset, prop.type));
      offset += prop.width;
    }
    for (let axis = 0; axis < 3; axis++) {
      const value = values[xyz[axis]];
      if (!Number.isFinite(value)) return `Binary PLY vertex ${i} property ${header.properties[xyz[axis]].name} is not finite`;
      coords[i * 3 + axis] = value;
    }
  }
  return coords;
}

export function parsePly(bytes: Uint8Array): ParsedCloud | string {
  const header = parseHeader(bytes);
  if (typeof header === 'string') return header;
  const xyz = xyzIndex(header.properties);
  if (typeof xyz === 'string') return xyz;
  if (header.vertexCount === 0) return 'PLY has no vertices';
  if (header.format === 'ascii') {
    const body = new TextDecoder('utf8').decode(bytes.subarray(header.headerBytes));
    const coords = readAsciiCoords(body, header.vertexCount, header.properties, xyz);
    if (typeof coords === 'string') return coords;
    return { format: 'ply-ascii', coords };
  }
  const coords = readBinaryCoords(bytes, header, xyz);
  if (typeof coords === 'string') return coords;
  return { format: 'ply-binary-little-endian', coords };
}
