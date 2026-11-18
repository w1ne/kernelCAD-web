// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP `load_scan_reference`. The cloud stays a reference. It is not a solid.

import { parseScanBytes, scanRefused, type ScanFailure, type ScanReference } from '../../../shared/scan';
import { decodeScanData, isScanFailure, readScanFile } from './scanBytes';

export interface LoadScanInput {
  file?: string;
  data?: string;
  units?: unknown;
  max_points?: unknown;
}

export interface LoadScanWire {
  ok: boolean;
  format?: ScanReference['format'];
  point_count?: number;
  bbox?: ScanReference['bbox'];
  centroid?: ScanReference['centroid'];
  units?: ScanReference['units'];
  downsampled?: boolean;
  stored_point_count?: number;
  solid: false;
  disclaimer: string;
  errorCode?: ScanFailure['errorCode'];
  error?: string;
}

function sourceBytes(input: LoadScanInput): Uint8Array | ScanFailure {
  if (input.file !== undefined && input.data !== undefined) return scanRefused('Pass file or data, not both.');
  if (typeof input.file === 'string') return readScanFile(input.file);
  if (typeof input.data === 'string') return decodeScanData(input.data);
  return scanRefused('Pass file or data.');
}

function wire(result: ScanReference | ScanFailure): LoadScanWire {
  if (!result.ok) return { ok: false, solid: false, disclaimer: result.disclaimer, errorCode: result.errorCode, error: result.error };
  return {
    ok: true,
    format: result.format,
    point_count: result.pointCount,
    bbox: result.bbox,
    centroid: result.centroid,
    units: result.units,
    downsampled: result.downsampled,
    stored_point_count: result.storedPointCount,
    solid: false,
    disclaimer: result.disclaimer,
  };
}

export async function loadScanReferenceTool(input: LoadScanInput): Promise<LoadScanWire> {
  const bytes = sourceBytes(input);
  if (isScanFailure(bytes)) return wire(bytes);
  return wire(parseScanBytes(bytes, { units: input.units, maxPoints: input.max_points }));
}

