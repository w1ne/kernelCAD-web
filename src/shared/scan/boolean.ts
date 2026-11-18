// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A scan reference has no solid operand. Boolean calls stop here.

import { scanRefused, type ScanFailure } from './types';

/** Refuse union, subtract, or intersect against a scan. The cloud is not a solid. */
export function refuseScanBoolean(operation: string): ScanFailure {
  const name = operation.trim() || 'boolean';
  return scanRefused(
    `Scan references are not solids. Boolean ${name} is refused. Use lib.fromSTL or mesh_to_features to promote a mesh; this cloud stays a reference.`,
  );
}
