// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// XYZ text: one point per line, optional extra columns (rgb, normals).

import { SCAN_PARSE_LIMIT } from './types';
import type { ParsedCloud } from './ply';

function skipped(line: string): boolean {
  return line === '' || line.startsWith('#') || line.startsWith('//');
}

export function parseXyz(bytes: Uint8Array): ParsedCloud | string {
  const lines = new TextDecoder('utf8').decode(bytes).split(/\r?\n/);
  const coords: number[] = [];
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo].trim();
    if (skipped(line)) continue;
    const tokens = line.split(/\s+/);
    const x = Number(tokens[0]);
    if (!Number.isFinite(x)) continue;
    if (tokens.length < 3) return `XYZ line ${lineNo + 1} needs x y z`;
    const y = Number(tokens[1]);
    const z = Number(tokens[2]);
    if (!Number.isFinite(y) || !Number.isFinite(z)) return `XYZ line ${lineNo + 1} has a non-finite coordinate`;
    if (coords.length / 3 + 1 > SCAN_PARSE_LIMIT) {
      return `Point cloud has more than ${SCAN_PARSE_LIMIT} points. Downsample the file before loading.`;
    }
    coords.push(x, y, z);
  }
  if (coords.length === 0) return 'XYZ file has no points. Expected one x y z line per point.';
  return { format: 'xyz', coords: Float64Array.from(coords) };
}
