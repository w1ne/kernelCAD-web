// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Single-phase incompressible estimate. Laminar: f = 64/Re. Turbulent: smooth
// tube Blasius f = 0.316 Re^-0.25. Each bend adds K = 0.3 per 90 degrees.
// Good for comparing routes, not for sizing a system.

export interface FluidProps { densityKgM3: number; viscosityCst: number }

/** Nominal properties near 40 °C. */
export const TUBE_FLUIDS: Record<string, FluidProps> = {
  water: { densityKgM3: 1000, viscosityCst: 1.0 },
  'jet-a': { densityKgM3: 800, viscosityCst: 1.3 },
  'mil-prf-83282': { densityKgM3: 850, viscosityCst: 14 },
  'mil-prf-23699': { densityKgM3: 1000, viscosityCst: 25 },
};

const BEND_K_PER_90 = 0.3;
const LAMINAR_RE = 2300;

export function pressureDropKPa(input: {
  idMm: number; lengthMm: number; bendAnglesDeg: number[]; flowLpm: number; fluid: FluidProps;
}): number {
  if (input.flowLpm <= 0) return 0;
  const d = input.idMm / 1000;
  const area = (Math.PI * d * d) / 4;
  const v = input.flowLpm / 60000 / area;
  const nu = input.fluid.viscosityCst * 1e-6;
  const re = (v * d) / nu;
  const friction = re < LAMINAR_RE ? 64 / re : 0.316 / re ** 0.25;
  const kBends = input.bendAnglesDeg.reduce((n, a) => n + (BEND_K_PER_90 * a) / 90, 0);
  const dynamic = (input.fluid.densityKgM3 * v * v) / 2;
  return (dynamic * ((friction * input.lengthMm) / 1000 / d + kBends)) / 1000;
}
