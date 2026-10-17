// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/dynamics/gas.ts
//
// Ideal-gas tank and a choked, perfectly expanded nozzle.
//
// This is the propulsion check a geometry kernel does not do. It is not a
// CFD code and it is not a vehicle. One tank, one gas, fixed volume.
// Blowdown is isentropic. The nozzle is choked and expanded exactly to
// ambient, so thrust is mass-flow times exit speed. Real nozzles lose
// some of that, and the loss is not modelled here.

export interface Gas {
  /** Ratio of specific heats, Cp/Cv. */
  readonly gamma: number;
  /** Specific gas constant, J/(kg·K). */
  readonly rJPerKgK: number;
}

export const GASES = {
  air: { gamma: 1.4, rJPerKgK: 287.058 },
  nitrogen: { gamma: 1.4, rJPerKgK: 296.8 },
  helium: { gamma: 1.667, rJPerKgK: 2077.1 },
} as const satisfies Record<string, Gas>;

export type GasName = keyof typeof GASES;

export const AMBIENT_PA = 101_325;

export class DynamicsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DynamicsError';
    this.code = code;
  }
}

export function resolveGas(gas: Gas | GasName | undefined): Gas {
  if (gas === undefined) return GASES.air;
  if (typeof gas === 'string') {
    const known = GASES[gas];
    if (known === undefined) {
      throw new DynamicsError(
        'dynamics.gas.unknown',
        `Unknown gas '${gas}'. Use air, nitrogen, helium, or pass { gamma, rJPerKgK }.`,
      );
    }
    return known;
  }
  if (!(gas.gamma > 1) || !(gas.rJPerKgK > 0)) {
    throw new DynamicsError(
      'dynamics.gas.invalid',
      'A gas needs gamma > 1 and a positive specific gas constant.',
    );
  }
  return gas;
}

export interface Tank {
  readonly id: string;
  readonly volumeM3: number;
  readonly massKg: number;
  readonly initialMassKg: number;
  readonly initialPressurePa: number;
  readonly initialTemperatureK: number;
  readonly gas: Gas;
}

export interface TankFill {
  readonly volumeM3: number;
  readonly massKg: number;
  readonly temperatureK: number;
  readonly gas?: Gas | GasName;
}

export function tankFromFill(id: string, fill: TankFill): Tank {
  const gas = resolveGas(fill.gas);
  if (!(fill.volumeM3 > 0) || !(fill.massKg > 0) || !(fill.temperatureK > 0)) {
    throw new DynamicsError(
      'dynamics.tank.invalid',
      `Tank '${id}' needs a positive volume, fill mass and temperature.`,
    );
  }
  const initialPressurePa = (fill.massKg * gas.rJPerKgK * fill.temperatureK) / fill.volumeM3;
  return {
    id,
    volumeM3: fill.volumeM3,
    massKg: fill.massKg,
    initialMassKg: fill.massKg,
    initialPressurePa,
    initialTemperatureK: fill.temperatureK,
    gas,
  };
}

/** Isentropic pressure at the current fill. Empty tank reads 0. */
export function tankPressurePa(tank: Tank): number {
  if (tank.massKg <= 0 || tank.initialMassKg <= 0) return 0;
  const k = tank.massKg / tank.initialMassKg;
  return tank.initialPressurePa * k ** tank.gas.gamma;
}

/** Isentropic temperature at the current fill. */
export function tankTemperatureK(tank: Tank): number {
  if (tank.massKg <= 0 || tank.initialMassKg <= 0) return tank.initialTemperatureK;
  const k = tank.massKg / tank.initialMassKg;
  return tank.initialTemperatureK * k ** (tank.gas.gamma - 1);
}

export function tankWithMass(tank: Tank, massKg: number): Tank {
  return { ...tank, massKg: Math.max(0, massKg) };
}

/** sqrt(gamma/R) * (2/(gamma+1))^((gamma+1)/(2(gamma-1))). mdot = At * p * factor / sqrt(T). */
export function chokedMassFluxFactor(gas: Gas): number {
  const gp1 = gas.gamma + 1;
  const gm1 = gas.gamma - 1;
  return Math.sqrt(gas.gamma / gas.rJPerKgK) * (2 / gp1) ** (gp1 / (2 * gm1));
}

/** Exit speed for a perfectly expanded isentropic nozzle, m/s. Ceiling, not a delivered value. */
export function exitSpeedMps(
  pressurePa: number,
  temperatureK: number,
  gas: Gas,
  ambientPa = AMBIENT_PA,
): number {
  if (pressurePa <= ambientPa || temperatureK <= 0) return 0;
  const vacuum = Math.sqrt((2 * gas.gamma) / (gas.gamma - 1) * gas.rJPerKgK * temperatureK);
  const term = 1 - (ambientPa / pressurePa) ** ((gas.gamma - 1) / gas.gamma);
  return vacuum * Math.sqrt(Math.max(0, term));
}

export function chokedMassFlowKgS(
  throatM2: number,
  pressurePa: number,
  temperatureK: number,
  gas: Gas,
  ambientPa = AMBIENT_PA,
): number {
  if (throatM2 <= 0 || pressurePa <= ambientPa || temperatureK <= 0) return 0;
  return throatM2 * pressurePa * chokedMassFluxFactor(gas) / Math.sqrt(temperatureK);
}

/**
 * Throat area that produces `thrustN` at the tank's initial state, under the
 * perfect-expansion assumption. Later blowdown produces less thrust through
 * the same throat.
 */
export function throatForThrustM2(thrustN: number, tank: Tank, ambientPa = AMBIENT_PA): number {
  if (!(thrustN > 0)) {
    throw new DynamicsError('dynamics.nozzle.invalid', 'Reference thrust must be positive.');
  }
  const ve = exitSpeedMps(tank.initialPressurePa, tank.initialTemperatureK, tank.gas, ambientPa);
  if (ve <= 0) {
    throw new DynamicsError(
      'dynamics.nozzle.unexpanded',
      `Tank '${tank.id}' is not above ambient, so a nozzle cannot be sized.`,
    );
  }
  const massFlow = thrustN / ve;
  return (massFlow * Math.sqrt(tank.initialTemperatureK)) / (tank.initialPressurePa * chokedMassFluxFactor(tank.gas));
}

export interface TankReading {
  readonly pressurePa: number;
  readonly pressureBar: number;
  readonly pressurePsi: number;
  readonly temperatureK: number;
  readonly massKg: number;
  readonly exitSpeedMps: number;
  readonly specificImpulseS: number;
}

const PSI_PER_PA = 1 / 6894.757293168;
const G = 9.80665;

export function readTank(tank: Tank, ambientPa = AMBIENT_PA): TankReading {
  const pressurePa = tankPressurePa(tank);
  const temperatureK = tankTemperatureK(tank);
  const ve = exitSpeedMps(pressurePa, temperatureK, tank.gas, ambientPa);
  return {
    pressurePa,
    pressureBar: pressurePa / 1e5,
    pressurePsi: pressurePa * PSI_PER_PA,
    temperatureK,
    massKg: tank.massKg,
    exitSpeedMps: ve,
    specificImpulseS: ve / G,
  };
}
