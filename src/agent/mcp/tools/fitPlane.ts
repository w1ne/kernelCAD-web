// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { fitPlane, type Point3 } from '../../../shared/numeric/fitPlane';

export interface FitPlaneInput { points: Point3[] }

export function fitPlaneTool(input: unknown): (ReturnType<typeof fitPlane> & { ok: true }) | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || !Array.isArray((input as { points?: unknown }).points)) {
    return { ok: false, error: 'points must be an array of [x, y, z] triples.' };
  }
  try {
    return { ok: true, ...fitPlane((input as FitPlaneInput).points) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
