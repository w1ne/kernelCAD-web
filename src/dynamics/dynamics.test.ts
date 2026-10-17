// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTank, tankFromFill, throatForThrustM2 } from './gas';
import { allocateWrench } from './spatial';
import { GRAVITY, resolveThrusters, runFloating, runLongitudinal, runScenario } from './run';

test('250 kg of air in 600 L is about 5000 psi, not 10000', () => {
  const tank = tankFromFill('main', { volumeM3: 0.6, massKg: 250, temperatureK: 288.15, gas: 'air' });
  const reading = readTank(tank);
  assert.ok(Math.abs(reading.pressurePsi - 5000) < 80);
  assert.ok(reading.exitSpeedMps > 650 && reading.exitSpeedMps < 720);
  assert.ok(reading.specificImpulseS > 65 && reading.specificImpulseS < 75);
});

test('a throat sized for 80 kN produces 80 kN at the initial state', () => {
  const tank = tankFromFill('main', { volumeM3: 0.6, massKg: 250, temperatureK: 288.15 });
  const throat = throatForThrustM2(80_000, tank);
  const [resolved] = resolveThrusters(
    [{ name: 'rear', positionM: [-1, 0, 0], direction: [1, 0, 0], throatM2: throat }],
    { main: tank },
  );
  assert.ok(resolved !== undefined);
  const result = runFloating({
    dryMassKg: 1000,
    inertiaKgM2: [100, 400, 400],
    tanks: { main: tank },
    thrusters: [resolved],
    durationS: 0.05,
    dtS: 0.005,
    gravity: [0, 0, 0],
    command: { kind: 'throttle', segments: [{ untilS: 1, throttle: { rear: 1 } }] },
  });
  const speed = result.samples[result.samples.length - 1]?.velocityMps[0] ?? 0;
  // 80 kN on 1250 kg for 0.05 s is about 3.2 m/s before blowdown trims it.
  assert.ok(speed > 2.5 && speed < 3.8, `speed ${speed}`);
});

test('symmetric down-thrusters hover a wrench of exactly the weight', () => {
  const tank = tankFromFill('main', { volumeM3: 0.2, massKg: 20, temperatureK: 288.15, gas: 'nitrogen' });
  const thrusters = resolveThrusters(
    [
      { name: 'fl', positionM: [0.4, 0.3, -0.1], direction: [0, 0, 1], maxThrustN: 200 },
      { name: 'fr', positionM: [0.4, -0.3, -0.1], direction: [0, 0, 1], maxThrustN: 200 },
      { name: 'rl', positionM: [-0.4, 0.3, -0.1], direction: [0, 0, 1], maxThrustN: 200 },
      { name: 'rr', positionM: [-0.4, -0.3, -0.1], direction: [0, 0, 1], maxThrustN: 200 },
    ],
    { main: tank },
  );
  const weight = (30 + tank.massKg) * GRAVITY;
  const allocation = allocateWrench(
    thrusters,
    thrusters.map(() => 200),
    [0, 0, weight, 0, 0, 0],
  );
  assert.ok(allocation.residual < 1, `residual ${allocation.residual}`);
  assert.ok(Math.abs((allocation.throttle.fl ?? 0) - (allocation.throttle.fr ?? 0)) < 1e-3);

  const result = runFloating({
    dryMassKg: 30,
    inertiaKgM2: [8, 20, 20],
    tanks: { main: tank },
    thrusters,
    durationS: 0.25,
    dtS: 0.005,
    positionM: [0, 0, 0.5],
    command: { kind: 'wrench', segments: [{ untilS: 1, forceN: [0, 0, weight] }] },
  });
  assert.ok(result.maxTiltDeg < 1, `tilt ${result.maxTiltDeg}`);
  assert.ok(Math.abs(result.peakHeightM - 0.5) < 0.05);
  assert.ok(Math.abs(result.minHeightM - 0.5) < 0.05);
  assert.ok(result.maxResidual < 5);
});

test('a shorter moment arm takes more throttle to hold zero torque', () => {
  const allocation = allocateWrench(
    [
      { name: 'far', positionM: [0, 0.8, 0], direction: [0, 0, 1] },
      { name: 'near', positionM: [0, -0.2, 0], direction: [0, 0, 1] },
    ],
    [500, 500],
    [0, 0, 200, 0, 0, 0],
  );
  assert.ok(allocation.residual < 1);
  assert.ok((allocation.throttle.near ?? 0) > (allocation.throttle.far ?? 0));
});

test('the same arms still allocate when the thrust columns are tens of kilonewtons', () => {
  const thrusters = [
    { name: 'far', positionM: [0, 0.8, 0] as const, direction: [0, 0, 1] as const },
    { name: 'near', positionM: [0, -0.2, 0] as const, direction: [0, 0, 1] as const },
  ];
  const small = allocateWrench(thrusters, [500, 500], [0, 0, 200, 0, 0, 0]);
  const large = allocateWrench(thrusters, [50_000, 50_000], [0, 0, 200, 0, 0, 0]);
  assert.ok(large.residual < 1, `residual ${large.residual}`);
  assert.ok((large.throttle.near ?? 0) > (large.throttle.far ?? 0));
  assert.ok(Math.abs((large.throttle.near ?? 0) * 100 - (small.throttle.near ?? 0)) < 1e-3);
  assert.ok(Math.abs((large.throttle.far ?? 0) * 100 - (small.throttle.far ?? 0)) < 1e-3);
});

test('80 kN on 1700 kg reaches 60 mph in about 0.57 s with no traction and no drag', () => {
  const target = 60 * 0.44704;
  const result = runLongitudinal({
    massKg: 1700,
    targetSpeedMps: target,
    propulsionN: 80_000,
    friction: 0,
  });
  assert.equal(result.reached, true);
  assert.equal(result.limit, 'propulsion');
  assert.ok(result.seconds > 0.55 && result.seconds < 0.62, `t ${result.seconds}`);
});

test('traction without enough friction does not reach the target', () => {
  const result = runLongitudinal({
    massKg: 1000,
    targetSpeedMps: 40,
    friction: 0.2,
    propulsionN: 0,
    maxTimeS: 5,
  });
  assert.equal(result.reached, false);
});

test('a scenario object is the same check as the functions', () => {
  const ran = runScenario({
    analysis: 'longitudinal',
    massKg: 1700,
    targetSpeedMps: 60 * 0.44704,
    propulsionN: 80_000,
    friction: 0,
  });
  assert.equal(ran.analysis, 'longitudinal');
  if (ran.analysis !== 'longitudinal') return;
  assert.equal(ran.result.reached, true);
});

test('unknown gas and a missing throat both fail closed', () => {
  assert.throws(() => tankFromFill('main', { volumeM3: 1, massKg: 1, temperatureK: 300, gas: 'hydrogen' as 'air' }), /Unknown gas/);
  const tank = tankFromFill('main', { volumeM3: 0.01, massKg: 1, temperatureK: 300 });
  assert.throws(
    () => resolveThrusters([{ name: 'a', positionM: [0, 0, 0], direction: [0, 0, 1] }], { main: tank }),
    /exactly one of throatM2 or maxThrustN/,
  );
});
