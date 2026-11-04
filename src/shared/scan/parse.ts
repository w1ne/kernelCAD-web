// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { envelopeFromCoords, samplePoints, sampleStride } from './envelope';
import { parsePly } from './ply';
import { SCAN_DISCLAIMER, scanRefused, type ScanResult } from './types';
import { resolveMaxPoints, unitScale } from './units';
import { parseXyz } from './xyz';

export interface ParseScanOptions {
  units?: unknown;
  maxPoints?: unknown;
  /** Keep the stride sample on the result. The MCP tool leaves this off. */
  keepPoints?: boolean;
}

function looksLikePly(bytes: Uint8Array): boolean {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 16)).trimStart().toLowerCase();
  return head.startsWith('ply');
}

function stripBom(bytes: Uint8Array): Uint8Array {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return bytes.subarray(3);
  return bytes;
}

/** Parse PLY or XYZ bytes into a millimetre scan reference. */
export function parseScanBytes(bytes: Uint8Array, options: ParseScanOptions = {}): ScanResult {
  if (bytes.length === 0) return scanRefused('Point cloud is empty');
  const units = unitScale(options.units);
  if (typeof units === 'string') return scanRefused(units);
  const maxPoints = resolveMaxPoints(options.maxPoints);
  if (typeof maxPoints === 'string') return scanRefused(maxPoints);
  const raw = stripBom(bytes);
  const parsed = looksLikePly(raw) ? parsePly(raw) : parseXyz(raw);
  if (typeof parsed === 'string') return scanRefused(parsed);
  const summed = envelopeFromCoords(parsed.coords, units.scaleToMm);
  if (typeof summed === 'string') return scanRefused(summed);
  const count = parsed.coords.length / 3;
  const sample = sampleStride(count, maxPoints);
  return {
    ok: true,
    format: parsed.format,
    pointCount: count,
    bbox: summed.bbox,
    centroid: summed.centroid,
    units: units.units,
    scaleToMm: units.scaleToMm,
    downsampled: sample.downsampled,
    storedPointCount: sample.stored,
    ...(options.keepPoints ? { points: samplePoints(parsed.coords, sample.stride, units.scaleToMm) } : {}),
    disclaimer: SCAN_DISCLAIMER,
  };
}

export function parseScanText(text: string, options: ParseScanOptions = {}): ScanResult {
  return parseScanBytes(new TextEncoder().encode(text), options);
}
