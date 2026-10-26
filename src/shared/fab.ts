// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/fab.ts
//
// Fabrication vocabulary shared by the capture layer and the BOM. One union, one list, one guard.

export type FabProcess = '3d-print' | 'cnc' | 'sheet-cut';

export const FAB_PROCESSES: readonly FabProcess[] = ['3d-print', 'cnc', 'sheet-cut'] as const;

export function isFabProcess(v: unknown): v is FabProcess {
  return v === '3d-print' || v === 'cnc' || v === 'sheet-cut';
}
