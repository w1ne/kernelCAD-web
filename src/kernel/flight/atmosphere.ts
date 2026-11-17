// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/atmosphere.ts
//
// ISA troposphere (0-11 km): temperature lapse 6.5 K/km from 288.15 K and
// 101325 Pa at sea level. Above 11 km the isothermal layer to 20 km.

export const G0 = 9.80665;
const P0 = 101325;
const T0 = 288.15;
const LAPSE = 0.0065;
const R_UNIVERSAL = 8.31446;
const M_AIR = 0.0289644;
const EXPONENT = (G0 * M_AIR) / (R_UNIVERSAL * LAPSE);
const H_TROPOPAUSE = 11000;
const T_TROPOPAUSE = T0 - LAPSE * H_TROPOPAUSE;
const P_TROPOPAUSE = P0 * (T_TROPOPAUSE / T0) ** EXPONENT;

export interface AtmosphereState {
  /** Static pressure, Pa. */
  pressurePa: number;
  /** Density, kg/m^3. */
  density: number;
  /** Temperature, K. */
  temperatureK: number;
}

/** ISA state at geometric altitude `h` metres above sea level. */
export function isa(h: number): AtmosphereState {
  if (h <= H_TROPOPAUSE) {
    const temperatureK = T0 - LAPSE * h;
    const pressurePa = P0 * (temperatureK / T0) ** EXPONENT;
    return { pressurePa, temperatureK, density: (pressurePa * M_AIR) / (R_UNIVERSAL * temperatureK) };
  }
  const pressurePa = P_TROPOPAUSE * Math.exp((-G0 * M_AIR * (h - H_TROPOPAUSE)) / (R_UNIVERSAL * T_TROPOPAUSE));
  return { pressurePa, temperatureK: T_TROPOPAUSE, density: (pressurePa * M_AIR) / (R_UNIVERSAL * T_TROPOPAUSE) };
}
