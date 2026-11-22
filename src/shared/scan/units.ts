// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { SCAN_POINT_CAP, type ScanUnits } from './types';

const SCALE_TO_MM: Record<ScanUnits, number> = { mm: 1, m: 1000, in: 25.4 };

export function unitScale(units: unknown): { units: ScanUnits; scaleToMm: number } | string {
  if (units === undefined) return { units: 'mm', scaleToMm: 1 };
  if (units === 'mm' || units === 'm' || units === 'in') return { units, scaleToMm: SCALE_TO_MM[units] };
  return 'units must be "mm", "m", or "in"';
}

export function resolveMaxPoints(raw: unknown): number | string {
  if (raw === undefined) return SCAN_POINT_CAP;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) return 'max_points must be a positive integer';
  if (raw > SCAN_POINT_CAP) return `max_points ${raw} exceeds the ${SCAN_POINT_CAP} cap`;
  return raw;
}
