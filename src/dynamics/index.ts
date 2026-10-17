// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/dynamics/index.ts
//
// Generic propulsion and rigid-body checks. Import this from a script, or
// run a JSON scenario with `kernelcad dynamics run <file>`.

export {
  AMBIENT_PA,
  DynamicsError,
  GASES,
  chokedMassFlowKgS,
  chokedMassFluxFactor,
  exitSpeedMps,
  readTank,
  resolveGas,
  tankFromFill,
  tankPressurePa,
  tankTemperatureK,
  tankWithMass,
  throatForThrustM2,
} from './gas';
export type { Gas, GasName, Tank, TankFill, TankReading } from './gas';

export { allocateWrench } from './spatial';
export type { Allocation, ThrusterColumn, Vec3 } from './spatial';

export {
  GRAVITY,
  MODEL_LIMITS,
  parseScenario,
  resolveThrusters,
  runFloating,
  runLongitudinal,
  runScenario,
} from './run';
export type {
  DynamicsSample,
  FloatingInput,
  FloatingResult,
  FloatingScenario,
  GroundContact,
  LongitudinalInput,
  LongitudinalResult,
  LongitudinalScenario,
  Scenario,
  ScenarioResult,
  ThrusterSpec,
} from './run';
