// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/viewerDimension.ts
//
// One dimension drawn in the 3D viewer, in world-frame model millimetres.
// Lives in shared so the kernel computes it and the studio / funnel render it
// without either crossing the one-way layering.

export type V3 = [number, number, number];

export interface ViewerDimension {
  /** Deterministic id: `declared:<i>` or `auto:<rule>:<part>:<i>`. */
  id: string;
  kind: 'linear' | 'diameter' | 'radius' | 'angular';
  /** Measured endpoints (linear), or the two ends of the callout across the
   *  circle (diameter / radius), or the two edge points (angular). */
  a: V3;
  b: V3;
  /** Circle centre (diameter / radius) or apex (angular). */
  centre?: V3;
  /** Circle or hole axis (diameter / radius). */
  axis?: V3;
  /** Final label, e.g. `30`, `2× Ø5`, `R3`, `pitch 30`, `90°`. */
  text: string;
  source: 'declared' | 'auto';
  /** Part name in a multi-part model. */
  part?: string;
}
