// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/dynamics/run.ts
//
// Two generic checks:
//   - longitudinal: a point mass along one axis, with a constant propulsion
//     force, a traction cap (friction times normal), a power cap and drag.
//   - floating: one rigid body, diagonal inertia, thrusters fed by ideal-gas
//     tanks, integrated in 6 degrees of freedom.
//
// Neither check knows what the body is. A car, a pod, a lander or a test
// mass are the same input. Stated limits are in MODEL_LIMITS.

import {
  AMBIENT_PA,
  DynamicsError,
  chokedMassFlowKgS,
  exitSpeedMps,
  readTank,
  tankFromFill,
  tankPressurePa,
  tankTemperatureK,
  tankWithMass,
  throatForThrustM2,
  type Gas,
  type GasName,
  type Tank,
  type TankFill,
} from './gas';
import {
  allocateWrench,
  integrateQuat,
  matVec,
  quatToMat,
  transpose,
  vadd,
  vcross,
  vnorm,
  vscale,
  vunit,
  type Vec3,
} from './spatial';

export const GRAVITY = 9.80665;

export const MODEL_LIMITS = [
  'Ideal gas in a fixed volume. Blowdown is isentropic.',
  'The nozzle is choked and perfectly expanded to ambient. Losses and pressure thrust are omitted, so thrust is a ceiling.',
  'One rigid body. Inertia is diagonal about the centre of mass.',
  'A thruster is a force arrow. It does not move a mate and it is not a CAD feature.',
  'Ground contact, when set, is a spring at the centre of mass. It is not a tire.',
] as const;

export interface LongitudinalInput {
  readonly massKg: number;
  /** Spinning parts, as I/r^2 added to the translating mass. */
  readonly equivalentMassKg?: number;
  readonly targetSpeedMps: number;
  /** Constant force along the track, newtons. Thrusters, a winch, a tow. */
  readonly propulsionN?: number;
  /** Caps the friction force at power/speed. Omit to leave traction uncapped by power. */
  readonly powerW?: number;
  /** Friction coefficient. Omit or 0 for no traction force. */
  readonly friction?: number;
  /** Normal force. Defaults to weight. */
  readonly normalN?: number;
  /** Extra normal that depends on speed: downforce, suction, a fan. */
  readonly extraNormalN?: (speedMps: number) => number;
  readonly drag?: { readonly cd: number; readonly areaM2: number; readonly rhoKgM3?: number };
  readonly maxTimeS?: number;
  readonly dtS?: number;
}

export interface LongitudinalResult {
  readonly reached: boolean;
  readonly seconds: number;
  readonly distanceM: number;
  readonly endSpeedMps: number;
  /** Which cap was active at the end: traction, power, or propulsion-only. */
  readonly limit: 'traction' | 'power' | 'propulsion';
}

export function runLongitudinal(input: LongitudinalInput): LongitudinalResult {
  if (!(input.massKg > 0) || !(input.targetSpeedMps > 0)) {
    throw new DynamicsError(
      'dynamics.longitudinal.invalid',
      'Longitudinal run needs a positive mass and a positive target speed.',
    );
  }
  const dt = input.dtS ?? 0.002;
  if (!(dt > 0) || dt > 0.05) {
    throw new DynamicsError('dynamics.longitudinal.invalid', 'dtS must be in (0, 0.05].');
  }
  const maxTime = input.maxTimeS ?? 30;
  const movingMass = input.massKg + (input.equivalentMassKg ?? 0);
  const propulsion = input.propulsionN ?? 0;
  const mu = input.friction ?? 0;
  const baseNormal = input.normalN ?? input.massKg * GRAVITY;
  let speed = Math.min(0.05, input.targetSpeedMps * 0.01);
  let distance = 0;
  let time = 0;
  let limit: LongitudinalResult['limit'] = propulsion !== 0 && mu === 0 ? 'propulsion' : 'traction';
  while (speed < input.targetSpeedMps && time < maxTime) {
    const extra = input.extraNormalN?.(speed) ?? 0;
    const normal = Math.max(0, baseNormal + extra);
    const traction = mu * normal;
    const powerCap = input.powerW !== undefined && input.powerW > 0 ? input.powerW / Math.max(speed, 0.05) : Number.POSITIVE_INFINITY;
    const frictionForce = Math.min(traction, powerCap);
    if (powerCap < traction) limit = 'power';
    else if (mu > 0) limit = 'traction';
    const drag = input.drag
      ? 0.5 * (input.drag.rhoKgM3 ?? 1.225) * input.drag.cd * input.drag.areaM2 * speed * speed
      : 0;
    const accel = (frictionForce + propulsion - drag) / movingMass;
    if (accel <= 0) break;
    speed += accel * dt;
    distance += speed * dt;
    time += dt;
  }
  return {
    reached: speed >= input.targetSpeedMps,
    seconds: time,
    distanceM: distance,
    endSpeedMps: speed,
    limit,
  };
}

export interface ThrusterSpec {
  readonly name: string;
  readonly positionM: Vec3;
  readonly direction: Vec3;
  /** Tank id. Defaults to the only tank, or 'main'. */
  readonly tank?: string;
  /** Geometric throat. Use this or maxThrustN, not both. */
  readonly throatM2?: number;
  /** Thrust this nozzle makes at the tank's initial state. The throat is sized from it. */
  readonly maxThrustN?: number;
}

export interface ResolvedThruster {
  readonly name: string;
  readonly tank: string;
  readonly positionM: Vec3;
  readonly direction: Vec3;
  readonly throatM2: number;
}

export interface WrenchSegment {
  readonly untilS: number;
  /** World-frame force the thrusters should produce. Gravity is applied separately. */
  readonly forceN: Vec3;
  readonly torqueNm?: Vec3;
}

export interface ThrottleSegment {
  readonly untilS: number;
  readonly throttle: Readonly<Record<string, number>>;
}

export interface GroundContact {
  /** Centre-of-mass height at rest, metres. */
  readonly restHeightM: number;
  readonly stiffnessNpm?: number;
  readonly dampingNsPerM?: number;
  readonly friction?: number;
}

export interface FloatingInput {
  readonly dryMassKg: number;
  readonly inertiaKgM2: Vec3;
  readonly tanks: Readonly<Record<string, Tank>>;
  readonly thrusters: readonly ResolvedThruster[];
  readonly durationS: number;
  readonly dtS?: number;
  readonly gravity?: Vec3;
  readonly ambientPa?: number;
  readonly positionM?: Vec3;
  readonly velocityMps?: Vec3;
  readonly command: { readonly kind: 'wrench'; readonly segments: readonly WrenchSegment[] }
    | { readonly kind: 'throttle'; readonly segments: readonly ThrottleSegment[] };
  readonly ground?: GroundContact;
  readonly sampleCount?: number;
}

export interface DynamicsSample {
  readonly t: number;
  readonly positionM: Vec3;
  readonly velocityMps: Vec3;
  readonly tiltDeg: number;
  readonly propellantKg: number;
  readonly residual: number;
}

export interface FloatingResult {
  readonly samples: readonly DynamicsSample[];
  readonly peakHeightM: number;
  readonly minHeightM: number;
  readonly maxTiltDeg: number;
  readonly maxResidual: number;
  readonly propellantInitialKg: number;
  readonly propellantLeftKg: number;
  readonly fuelOutS: number | null;
  readonly limits: readonly string[];
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function resolveThrusters(
  specs: readonly ThrusterSpec[],
  tanks: Readonly<Record<string, Tank>>,
  ambientPa = AMBIENT_PA,
): ResolvedThruster[] {
  const names = new Set<string>();
  const tankIds = Object.keys(tanks);
  if (tankIds.length === 0) {
    throw new DynamicsError('dynamics.tank.missing', 'A floating run needs at least one tank.');
  }
  const defaultTank = tankIds.length === 1 ? tankIds[0] ?? 'main' : 'main';
  return specs.map(spec => {
    if (names.has(spec.name)) {
      throw new DynamicsError('dynamics.thruster.duplicate', `Thruster '${spec.name}' is declared twice.`);
    }
    names.add(spec.name);
    const tankId = spec.tank ?? defaultTank;
    const tank = tanks[tankId];
    if (tank === undefined) {
      throw new DynamicsError('dynamics.thruster.tank', `Thruster '${spec.name}' names unknown tank '${tankId}'.`);
    }
    if (vnorm(spec.direction) === 0) {
      throw new DynamicsError('dynamics.thruster.direction', `Thruster '${spec.name}' needs a non-zero direction.`);
    }
    const hasThroat = spec.throatM2 !== undefined;
    const hasThrust = spec.maxThrustN !== undefined;
    if (hasThroat === hasThrust) {
      throw new DynamicsError(
        'dynamics.thruster.sizing',
        `Thruster '${spec.name}' needs exactly one of throatM2 or maxThrustN.`,
      );
    }
    const throat = spec.throatM2 ?? throatForThrustM2(spec.maxThrustN ?? 0, tank, ambientPa);
    if (!(throat > 0)) {
      throw new DynamicsError('dynamics.thruster.sizing', `Thruster '${spec.name}' resolved a non-positive throat.`);
    }
    return {
      name: spec.name,
      tank: tankId,
      positionM: spec.positionM,
      direction: vunit(spec.direction),
      throatM2: throat,
    };
  });
}

function currentMaxThrust(thruster: ResolvedThruster, tank: Tank, ambientPa: number): number {
  const pressure = tankPressurePa(tank);
  const temperature = tankTemperatureK(tank);
  const ve = exitSpeedMps(pressure, temperature, tank.gas, ambientPa);
  return chokedMassFlowKgS(thruster.throatM2, pressure, temperature, tank.gas, ambientPa) * ve;
}

function segmentAt<T extends { readonly untilS: number }>(segments: readonly T[], time: number): T {
  for (const segment of segments) {
    if (time < segment.untilS) return segment;
  }
  const last = segments[segments.length - 1];
  if (last === undefined) {
    throw new DynamicsError('dynamics.command.invalid', 'A command needs at least one segment.');
  }
  return last;
}

export function runFloating(input: FloatingInput): FloatingResult {
  if (!(input.dryMassKg > 0)) {
    throw new DynamicsError('dynamics.body.invalid', 'Dry mass must be positive.');
  }
  if (input.inertiaKgM2.some(component => !(component > 0))) {
    throw new DynamicsError('dynamics.body.invalid', 'Inertia components must be positive.');
  }
  if (input.thrusters.length === 0) {
    throw new DynamicsError('dynamics.thruster.missing', 'A floating run needs at least one thruster.');
  }
  const dt = input.dtS ?? 0.005;
  if (!(dt >= 0.001) || dt > 0.05) {
    throw new DynamicsError('dynamics.run.invalid', 'dtS must be in [0.001, 0.05].');
  }
  if (!(input.durationS > 0) || input.durationS > 120) {
    throw new DynamicsError('dynamics.run.invalid', 'durationS must be in (0, 120].');
  }
  const steps = Math.ceil(input.durationS / dt);
  if (steps > 120_000) {
    throw new DynamicsError('dynamics.run.invalid', 'The run exceeds 120000 steps. Raise dtS or shorten it.');
  }
  if (input.command.segments.length === 0) {
    throw new DynamicsError('dynamics.command.invalid', 'A command needs at least one segment.');
  }

  const ambient = input.ambientPa ?? AMBIENT_PA;
  const gravity = input.gravity ?? [0, 0, -GRAVITY];
  let tanks: Record<string, Tank> = { ...input.tanks };
  let position: [number, number, number] = [
    input.positionM?.[0] ?? 0,
    input.positionM?.[1] ?? 0,
    input.positionM?.[2] ?? 0,
  ];
  let velocity: [number, number, number] = [
    input.velocityMps?.[0] ?? 0,
    input.velocityMps?.[1] ?? 0,
    input.velocityMps?.[2] ?? 0,
  ];
  let orientation: [number, number, number, number] = [1, 0, 0, 0];
  let omega: [number, number, number] = [0, 0, 0];
  const [ixx, iyy, izz] = input.inertiaKgM2;
  const propellantInitial = Object.values(tanks).reduce((sum, tank) => sum + tank.initialMassKg, 0);
  const sampleEvery = Math.max(1, Math.floor(steps / (input.sampleCount ?? 24)));
  const samples: DynamicsSample[] = [];
  let peak = position[2];
  let floor = position[2];
  let maxTilt = 0;
  let maxResidual = 0;
  let fuelOutS: number | null = null;
  const ground = input.ground;
  const stiffness = ground?.stiffnessNpm ?? Math.max(1000, (input.dryMassKg + propellantInitial) * 400);
  const damping = ground?.dampingNsPerM ?? 2 * Math.sqrt(stiffness * (input.dryMassKg + propellantInitial));

  for (let step = 0; step <= steps; step++) {
    const time = Math.min(input.durationS, step * dt);
    const propellant = Object.values(tanks).reduce((sum, tank) => sum + tank.massKg, 0);
    const mass = input.dryMassKg + propellant;
    const rotation = quatToMat(orientation);
    const rotationT = transpose(rotation);
    const maxThrust = input.thrusters.map(thruster => {
      const tank = tanks[thruster.tank];
      return tank === undefined ? 0 : currentMaxThrust(thruster, tank, ambient);
    });

    let throttles: Record<string, number> = {};
    let residual = 0;
    if (input.command.kind === 'throttle') {
      const segment = segmentAt(input.command.segments, time);
      for (const thruster of input.thrusters) throttles[thruster.name] = clamp01(segment.throttle[thruster.name] ?? 0);
    } else {
      const segment = segmentAt(input.command.segments, time);
      const torque = segment.torqueNm ?? [0, 0, 0];
      const forceBody = matVec(rotationT, segment.forceN);
      const torqueBody = matVec(rotationT, torque);
      const allocation = allocateWrench(
        input.thrusters,
        maxThrust,
        [forceBody[0], forceBody[1], forceBody[2], torqueBody[0], torqueBody[1], torqueBody[2]],
      );
      throttles = allocation.throttle;
      residual = allocation.residual;
    }
    maxResidual = Math.max(maxResidual, residual);

    let forceBody: [number, number, number] = [0, 0, 0];
    let torqueBody: [number, number, number] = [0, 0, 0];
    const usedByTank = new Map<string, number>();
    input.thrusters.forEach((thruster, index) => {
      const thrust = (throttles[thruster.name] ?? 0) * (maxThrust[index] ?? 0);
      const force = vscale(thruster.direction, thrust);
      forceBody = vadd(forceBody, force);
      torqueBody = vadd(torqueBody, vcross(thruster.positionM, force));
      const tank = tanks[thruster.tank];
      if (tank === undefined) return;
      const ve = exitSpeedMps(tankPressurePa(tank), tankTemperatureK(tank), tank.gas, ambient);
      const massFlow = ve > 0 ? thrust / ve : 0;
      usedByTank.set(thruster.tank, (usedByTank.get(thruster.tank) ?? 0) + massFlow);
    });

    if (step < steps) {
      const nextTanks: Record<string, Tank> = {};
      for (const [id, tank] of Object.entries(tanks)) {
        const used = (usedByTank.get(id) ?? 0) * dt;
        nextTanks[id] = tankWithMass(tank, tank.massKg - used);
      }
      tanks = nextTanks;
    }

    let forceWorld = matVec(rotation, forceBody);
    forceWorld = vadd(forceWorld, vscale(gravity, mass));
    if (ground !== undefined) {
      const penetration = ground.restHeightM - position[2];
      if (penetration > 0) {
        const normal = stiffness * penetration - damping * Math.min(0, velocity[2]);
        forceWorld = vadd(forceWorld, [0, 0, Math.max(0, normal)]);
        const horizontal = Math.hypot(velocity[0], velocity[1]);
        const mu = ground.friction ?? 0;
        if (horizontal > 1e-6 && mu > 0 && normal > 0) {
          const cap = Math.min(mu * normal, 1e6 * horizontal);
          forceWorld = vadd(forceWorld, vscale([-velocity[0] / horizontal, -velocity[1] / horizontal, 0], cap));
        }
      }
    }

    const tiltDeg = Math.acos(Math.min(1, Math.max(-1, rotation[2][2]))) * 180 / Math.PI;
    peak = Math.max(peak, position[2]);
    floor = Math.min(floor, position[2]);
    maxTilt = Math.max(maxTilt, tiltDeg);
    if (fuelOutS === null && propellant <= propellantInitial * 1e-4) fuelOutS = time;
    if (step % sampleEvery === 0 || step === steps) {
      samples.push({
        t: time,
        positionM: position,
        velocityMps: velocity,
        tiltDeg,
        propellantKg: propellant,
        residual,
      });
    }
    if (step === steps) break;

    const accel = vscale(forceWorld, 1 / mass);
    velocity = vadd(velocity, vscale(accel, dt));
    position = vadd(position, vscale(velocity, dt));
    omega = vadd(omega, vscale([
      (torqueBody[0] - (izz - iyy) * omega[1] * omega[2]) / ixx,
      (torqueBody[1] - (ixx - izz) * omega[2] * omega[0]) / iyy,
      (torqueBody[2] - (iyy - ixx) * omega[0] * omega[1]) / izz,
    ], dt));
    orientation = integrateQuat(orientation, omega, dt);
  }

  return {
    samples,
    peakHeightM: peak,
    minHeightM: floor,
    maxTiltDeg: maxTilt,
    maxResidual,
    propellantInitialKg: propellantInitial,
    propellantLeftKg: Object.values(tanks).reduce((sum, tank) => sum + tank.massKg, 0),
    fuelOutS,
    limits: MODEL_LIMITS,
  };
}

export interface LongitudinalScenario {
  readonly analysis: 'longitudinal';
  readonly massKg: number;
  readonly equivalentMassKg?: number;
  readonly targetSpeedMps: number;
  readonly propulsionN?: number;
  readonly powerW?: number;
  readonly friction?: number;
  readonly normalN?: number;
  readonly extraNormal?: readonly { readonly untilSpeedMps: number; readonly normalN: number }[];
  readonly drag?: { readonly cd: number; readonly areaM2: number; readonly rhoKgM3?: number };
  readonly maxTimeS?: number;
  readonly dtS?: number;
}

export interface FloatingScenario {
  readonly analysis: 'floating';
  readonly dryMassKg: number;
  readonly inertiaKgM2: Vec3;
  readonly gas?: Gas | GasName;
  readonly tank?: TankFill;
  readonly tanks?: Readonly<Record<string, TankFill>>;
  readonly thrusters: readonly ThrusterSpec[];
  readonly durationS: number;
  readonly dtS?: number;
  readonly gravity?: Vec3;
  readonly ambientPa?: number;
  readonly positionM?: Vec3;
  readonly velocityMps?: Vec3;
  readonly command: FloatingInput['command'];
  readonly ground?: GroundContact;
}

export type Scenario = LongitudinalScenario | FloatingScenario;

export type ScenarioResult =
  | { readonly analysis: 'longitudinal'; readonly result: LongitudinalResult; readonly limits: readonly string[] }
  | { readonly analysis: 'floating'; readonly result: FloatingResult; readonly tanks: Readonly<Record<string, ReturnType<typeof readTank>>> };

function asVec3(value: unknown, label: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3 || value.some(entry => typeof entry !== 'number' || !Number.isFinite(entry))) {
    throw new DynamicsError('dynamics.scenario.invalid', `${label} must be a finite [x, y, z].`);
  }
  return [value[0] as number, value[1] as number, value[2] as number];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DynamicsError('dynamics.scenario.invalid', `${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DynamicsError('dynamics.scenario.invalid', `${label} must be a finite number.`);
  }
  return value;
}

export function parseScenario(value: unknown): Scenario {
  const raw = asRecord(value, 'scenario');
  const analysis = raw.analysis;
  if (analysis === 'longitudinal') {
    const extra = raw.extraNormal;
    let extraNormal: LongitudinalScenario['extraNormal'];
    if (extra !== undefined) {
      if (!Array.isArray(extra)) {
        throw new DynamicsError('dynamics.scenario.invalid', 'extraNormal must be an array of { untilSpeedMps, normalN }.');
      }
      extraNormal = extra.map((entry, index) => {
        const row = asRecord(entry, `extraNormal[${index}]`);
        return {
          untilSpeedMps: asNumber(row.untilSpeedMps, `extraNormal[${index}].untilSpeedMps`),
          normalN: asNumber(row.normalN, `extraNormal[${index}].normalN`),
        };
      });
    }
    let drag: LongitudinalScenario['drag'];
    if (raw.drag !== undefined && raw.drag !== null) {
      const row = asRecord(raw.drag, 'drag');
      drag = {
        cd: asNumber(row.cd, 'drag.cd'),
        areaM2: asNumber(row.areaM2, 'drag.areaM2'),
        ...(row.rhoKgM3 !== undefined ? { rhoKgM3: asNumber(row.rhoKgM3, 'drag.rhoKgM3') } : {}),
      };
    }
    return {
      analysis: 'longitudinal',
      massKg: asNumber(raw.massKg, 'massKg'),
      ...(raw.equivalentMassKg !== undefined ? { equivalentMassKg: asNumber(raw.equivalentMassKg, 'equivalentMassKg') } : {}),
      targetSpeedMps: asNumber(raw.targetSpeedMps, 'targetSpeedMps'),
      ...(raw.propulsionN !== undefined ? { propulsionN: asNumber(raw.propulsionN, 'propulsionN') } : {}),
      ...(raw.powerW !== undefined ? { powerW: asNumber(raw.powerW, 'powerW') } : {}),
      ...(raw.friction !== undefined ? { friction: asNumber(raw.friction, 'friction') } : {}),
      ...(raw.normalN !== undefined ? { normalN: asNumber(raw.normalN, 'normalN') } : {}),
      ...(extraNormal !== undefined ? { extraNormal } : {}),
      ...(drag !== undefined ? { drag } : {}),
      ...(raw.maxTimeS !== undefined ? { maxTimeS: asNumber(raw.maxTimeS, 'maxTimeS') } : {}),
      ...(raw.dtS !== undefined ? { dtS: asNumber(raw.dtS, 'dtS') } : {}),
    };
  }
  if (analysis !== 'floating') {
    throw new DynamicsError('dynamics.scenario.invalid', "analysis must be 'longitudinal' or 'floating'.");
  }
  if (!Array.isArray(raw.thrusters)) {
    throw new DynamicsError('dynamics.scenario.invalid', 'floating scenarios need a thrusters array.');
  }
  const command = asRecord(raw.command, 'command');
  const kind = command.kind;
  if (kind !== 'wrench' && kind !== 'throttle') {
    throw new DynamicsError('dynamics.scenario.invalid', "command.kind must be 'wrench' or 'throttle'.");
  }
  if (!Array.isArray(command.segments) || command.segments.length === 0) {
    throw new DynamicsError('dynamics.scenario.invalid', 'command.segments must be a non-empty array.');
  }
  const parsedCommand: FloatingInput['command'] = kind === 'wrench'
    ? {
        kind: 'wrench',
        segments: command.segments.map((entry, index) => {
          const row = asRecord(entry, `segments[${index}]`);
          return {
            untilS: asNumber(row.untilS, `segments[${index}].untilS`),
            forceN: asVec3(row.forceN, `segments[${index}].forceN`),
            ...(row.torqueNm !== undefined ? { torqueNm: asVec3(row.torqueNm, `segments[${index}].torqueNm`) } : {}),
          };
        }),
      }
    : {
        kind: 'throttle',
        segments: command.segments.map((entry, index) => {
          const row = asRecord(entry, `segments[${index}]`);
          const throttle = asRecord(row.throttle, `segments[${index}].throttle`);
          const values: Record<string, number> = {};
          for (const [name, throttleValue] of Object.entries(throttle)) values[name] = asNumber(throttleValue, `throttle.${name}`);
          return { untilS: asNumber(row.untilS, `segments[${index}].untilS`), throttle: values };
        }),
      };
  const thrusters: ThrusterSpec[] = raw.thrusters.map((entry, index) => {
    const row = asRecord(entry, `thrusters[${index}]`);
    if (typeof row.name !== 'string' || row.name.length === 0) {
      throw new DynamicsError('dynamics.scenario.invalid', `thrusters[${index}].name must be a string.`);
    }
    return {
      name: row.name,
      positionM: asVec3(row.positionM, `thrusters[${index}].positionM`),
      direction: asVec3(row.direction, `thrusters[${index}].direction`),
      ...(typeof row.tank === 'string' ? { tank: row.tank } : {}),
      ...(row.throatM2 !== undefined ? { throatM2: asNumber(row.throatM2, `thrusters[${index}].throatM2`) } : {}),
      ...(row.maxThrustN !== undefined ? { maxThrustN: asNumber(row.maxThrustN, `thrusters[${index}].maxThrustN`) } : {}),
    };
  });
  const gas = raw.gas === undefined || typeof raw.gas === 'string' || (typeof raw.gas === 'object' && raw.gas !== null)
    ? raw.gas as Gas | GasName | undefined
    : undefined;
  let tanks: Record<string, TankFill> | undefined;
  if (raw.tanks !== undefined) {
    const rows = asRecord(raw.tanks, 'tanks');
    tanks = {};
    for (const [id, fill] of Object.entries(rows)) {
      const row = asRecord(fill, `tanks.${id}`);
      tanks[id] = {
        volumeM3: asNumber(row.volumeM3, `tanks.${id}.volumeM3`),
        massKg: asNumber(row.massKg, `tanks.${id}.massKg`),
        temperatureK: asNumber(row.temperatureK, `tanks.${id}.temperatureK`),
        ...(gas !== undefined ? { gas } : {}),
      };
    }
  }
  let tank: TankFill | undefined;
  if (raw.tank !== undefined) {
    const row = asRecord(raw.tank, 'tank');
    tank = {
      volumeM3: asNumber(row.volumeM3, 'tank.volumeM3'),
      massKg: asNumber(row.massKg, 'tank.massKg'),
      temperatureK: asNumber(row.temperatureK, 'tank.temperatureK'),
      ...(gas !== undefined ? { gas } : {}),
    };
  }
  let ground: GroundContact | undefined;
  if (raw.ground !== undefined) {
    const row = asRecord(raw.ground, 'ground');
    ground = {
      restHeightM: asNumber(row.restHeightM, 'ground.restHeightM'),
      ...(row.stiffnessNpm !== undefined ? { stiffnessNpm: asNumber(row.stiffnessNpm, 'ground.stiffnessNpm') } : {}),
      ...(row.dampingNsPerM !== undefined ? { dampingNsPerM: asNumber(row.dampingNsPerM, 'ground.dampingNsPerM') } : {}),
      ...(row.friction !== undefined ? { friction: asNumber(row.friction, 'ground.friction') } : {}),
    };
  }
  return {
    analysis: 'floating',
    dryMassKg: asNumber(raw.dryMassKg, 'dryMassKg'),
    inertiaKgM2: asVec3(raw.inertiaKgM2, 'inertiaKgM2'),
    ...(gas !== undefined ? { gas } : {}),
    ...(tank !== undefined ? { tank } : {}),
    ...(tanks !== undefined ? { tanks } : {}),
    thrusters,
    durationS: asNumber(raw.durationS, 'durationS'),
    ...(raw.dtS !== undefined ? { dtS: asNumber(raw.dtS, 'dtS') } : {}),
    ...(raw.gravity !== undefined ? { gravity: asVec3(raw.gravity, 'gravity') } : {}),
    ...(raw.ambientPa !== undefined ? { ambientPa: asNumber(raw.ambientPa, 'ambientPa') } : {}),
    ...(raw.positionM !== undefined ? { positionM: asVec3(raw.positionM, 'positionM') } : {}),
    ...(raw.velocityMps !== undefined ? { velocityMps: asVec3(raw.velocityMps, 'velocityMps') } : {}),
    command: parsedCommand,
    ...(ground !== undefined ? { ground } : {}),
  };
}

function tanksFromScenario(scenario: FloatingScenario): Record<string, Tank> {
  const fills: Record<string, TankFill> = {};
  if (scenario.tank !== undefined) fills.main = scenario.tank;
  if (scenario.tanks !== undefined) Object.assign(fills, scenario.tanks);
  const ids = Object.keys(fills);
  if (ids.length === 0) {
    throw new DynamicsError('dynamics.tank.missing', 'Provide tank or tanks.');
  }
  const tanks: Record<string, Tank> = {};
  for (const id of ids) {
    const fill = fills[id];
    if (fill === undefined) continue;
    tanks[id] = tankFromFill(id, { ...fill, gas: fill.gas ?? scenario.gas });
  }
  return tanks;
}

export function runScenario(value: unknown): ScenarioResult {
  const scenario = parseScenario(value);
  if (scenario.analysis === 'longitudinal') {
    const extra = scenario.extraNormal;
    return {
      analysis: 'longitudinal',
      limits: MODEL_LIMITS,
      result: runLongitudinal({
        massKg: scenario.massKg,
        ...(scenario.equivalentMassKg !== undefined ? { equivalentMassKg: scenario.equivalentMassKg } : {}),
        targetSpeedMps: scenario.targetSpeedMps,
        ...(scenario.propulsionN !== undefined ? { propulsionN: scenario.propulsionN } : {}),
        ...(scenario.powerW !== undefined ? { powerW: scenario.powerW } : {}),
        ...(scenario.friction !== undefined ? { friction: scenario.friction } : {}),
        ...(scenario.normalN !== undefined ? { normalN: scenario.normalN } : {}),
        ...(extra !== undefined
          ? {
              extraNormalN: speed => {
                let normal = 0;
                for (const band of extra) {
                  if (speed < band.untilSpeedMps) normal = band.normalN;
                }
                return normal;
              },
            }
          : {}),
        ...(scenario.drag !== undefined ? { drag: scenario.drag } : {}),
        ...(scenario.maxTimeS !== undefined ? { maxTimeS: scenario.maxTimeS } : {}),
        ...(scenario.dtS !== undefined ? { dtS: scenario.dtS } : {}),
      }),
    };
  }
  const tanks = tanksFromScenario(scenario);
  const readings: Record<string, ReturnType<typeof readTank>> = {};
  for (const [id, tank] of Object.entries(tanks)) readings[id] = readTank(tank, scenario.ambientPa);
  return {
    analysis: 'floating',
    tanks: readings,
    result: runFloating({
      dryMassKg: scenario.dryMassKg,
      inertiaKgM2: scenario.inertiaKgM2,
      tanks,
      thrusters: resolveThrusters(scenario.thrusters, tanks, scenario.ambientPa),
      durationS: scenario.durationS,
      ...(scenario.dtS !== undefined ? { dtS: scenario.dtS } : {}),
      ...(scenario.gravity !== undefined ? { gravity: scenario.gravity } : {}),
      ...(scenario.ambientPa !== undefined ? { ambientPa: scenario.ambientPa } : {}),
      ...(scenario.positionM !== undefined ? { positionM: scenario.positionM } : {}),
      ...(scenario.velocityMps !== undefined ? { velocityMps: scenario.velocityMps } : {}),
      command: scenario.command,
      ...(scenario.ground !== undefined ? { ground: scenario.ground } : {}),
    }),
  };
}

