// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// One ideal-gas charge for the two bottles in roadster.kcad.ts, and a
// vertical hop driven by the down-nozzles on that same model.
// Inner cylinder: r = 120 mm, length = 1400 mm, two bottles.

import { GRAVITY, type FloatingScenario } from '../../src/dynamics/run';
import type { Vec3 } from '../../src/dynamics/spatial';
import type { RoadsterFacts } from './modelFacts';

export const BOTTLE = { innerRadiusM: 0.12, lengthM: 1.4, count: 2 } as const;
export const TANK_TEMPERATURE_K = 288.15;
export const TANK_MASS_KG = 55;

export function bottleGasVolumeM3(): number {
  return BOTTLE.count * Math.PI * BOTTLE.innerRadiusM ** 2 * BOTTLE.lengthM;
}

function relativeM(pointMm: Vec3, comMm: Vec3): Vec3 {
  return [
    (pointMm[0] - comMm[0]) / 1000,
    (pointMm[1] - comMm[1]) / 1000,
    (pointMm[2] - comMm[2]) / 1000,
  ];
}

export function hopScenarioFromFacts(facts: RoadsterFacts): FloatingScenario {
  const dry = facts.dryMassKg;
  const gas = TANK_MASS_KG;
  const total = dry + gas;
  // Net 8 m/s^2 upward for 0.7 s clears 1 m before the coast, with margin
  // for the blowdown of a 55 kg charge.
  const lift = total * (GRAVITY + 8);
  const down = facts.parts.filter((part) => part.name.startsWith('noz-down-'));
  const rear = facts.parts.filter((part) => part.name.startsWith('noz-rear-'));
  if (down.length < 4) throw new Error('the model needs four down nozzles');
  // Headroom so blowdown can raise throttle without saturating the pair
  // that sits closer to the centre of mass.
  const each = (lift / down.length) * 2.5;
  const comZ = facts.comMm[2] / 1000;
  return {
    analysis: 'floating',
    gas: 'air',
    tank: {
      volumeM3: bottleGasVolumeM3(),
      massKg: gas,
      temperatureK: TANK_TEMPERATURE_K,
    },
    dryMassKg: dry,
    inertiaKgM2: boxInertia(facts, total),
    positionM: [0, 0, comZ],
    durationS: 2.4,
    dtS: 0.005,
    ground: { restHeightM: comZ, stiffnessNpm: total * 800, friction: 0.4 },
    thrusters: [
      ...down.map((part) => ({
        name: part.name,
        positionM: relativeM(part.center, facts.comMm),
        direction: [0, 0, 1] as Vec3,
        maxThrustN: each,
      })),
      ...rear.map((part) => ({
        name: part.name,
        positionM: relativeM(part.center, facts.comMm),
        direction: [-1, 0, 0] as Vec3,
        maxThrustN: each * 0.25,
      })),
    ],
    command: {
      kind: 'wrench',
      segments: [
        { untilS: 0.7, forceN: [0, 0, lift] },
        { untilS: 2.4, forceN: [0, 0, 0] },
      ],
    },
  };
}

function boxInertia(facts: RoadsterFacts, mass: number): Vec3 {
  const span = (index: 0 | 1 | 2) => (facts.body.max[index] - facts.body.min[index]) / 1000;
  const x = span(0);
  const y = span(1);
  const z = span(2);
  return [
    mass * (y * y + z * z) / 12,
    mass * (x * x + z * z) / 12,
    mass * (x * x + y * y) / 12,
  ];
}
