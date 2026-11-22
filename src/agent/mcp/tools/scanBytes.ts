// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { existsSync, readFileSync } from 'node:fs';
import { scanRefused, type ScanFailure } from '../../../shared/scan';

export function readScanFile(file: string): Uint8Array | ScanFailure {
  if (file.trim() === '') return scanRefused('file must be a non-empty path');
  if (!existsSync(file)) return scanRefused(`Scan file not found: ${file}`);
  try {
    return readFileSync(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return scanRefused(`Could not read scan file ${file}: ${message}`);
  }
}

export function decodeScanData(data: string): Uint8Array | ScanFailure {
  const payload = data.includes('base64,') ? data.slice(data.indexOf('base64,') + 'base64,'.length) : data.trim();
  if (payload === '') return scanRefused('data must be base64-encoded scan bytes');
  const bytes = Buffer.from(payload, 'base64');
  if (bytes.length === 0) return scanRefused('data decoded to an empty point cloud');
  return bytes;
}

export function isScanFailure(value: Uint8Array | ScanFailure): value is ScanFailure {
  return !(value instanceof Uint8Array);
}
