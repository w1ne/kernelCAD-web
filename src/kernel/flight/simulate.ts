// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/simulate.ts
//
// Point-mass flight in the vertical plane of the launch: x downrange, z up
// (above the launch site). Fixed-step RK4 on (x, z, vx, vz):
//
//   - thrust from the tabulated motor; mass = dry + motor mass, the
//     propellant burning in proportion to delivered impulse;
//   - drag 0.5 rho |va| va (Cd A) with ISA density at the site altitude + z,
//     va the airspeed (velocity minus a horizontal wind);
//   - a launch rail: motion constrained along the rail until the vehicle has
//     travelled its length; the vehicle sits on the pad until thrust exceeds
//     weight;
//   - off the rail the thrust acts along the airspeed (zero angle of attack:
//     a statically stable rocket weathercocks into the relative wind);
//   - recovery devices add Cd A once deployed, with an optional linear
//     inflation ramp.
//
// Not modelled: pitch dynamics / angle of attack, spin, Mach effects, motor
// ejection delay, drift under a turning chute. An engineering estimate, not
// a certification.

import { G0, isa } from './atmosphere';
import type { Motor } from './motor';

export interface SimRecovery {
  /** Cd x canopy area, m^2. */
  cdA: number;
  deploy: { kind: 'apogee'; delayS: number } | { kind: 'time'; atS: number };
  inflateS: number;
}

export interface SimInput {
  dryMassKg: number;
  motor: Motor;
  /** Vehicle drag area Cd x A_ref, m^2. */
  cdA: number;
  recovery: readonly SimRecovery[];
  railM: number;
  angleDeg: number;
  siteAltitudeM: number;
  windMs: number;
  maxTimeS: number;
  dtS: number;
  /** Output row spacing, s. Default 0.01. */
  sampleS?: number;
}

export interface FlightRow {
  t: number;
  x: number;
  z: number;
  /** Speed, m/s. */
  v: number;
  vz: number;
  /** Kinematic vertical acceleration, m/s^2. */
  az: number;
  /** Sensed specific force along the vehicle axis (accelerometer), m/s^2. 1 g on the pad. */
  aAxial: number;
  pHpa: number;
  tempC: number;
  massKg: number;
  thrustN: number;
  /** Deployed recovery area fraction, 0..n devices. */
  chute: number;
}

export interface FlightEvent {
  name: 'ignition' | 'liftoff' | 'rail-exit' | 'burnout' | 'apogee' | 'deploy' | 'landing' | 'timeout';
  t: number;
  z: number;
  index?: number;
}

export interface SimResult {
  apogeeM: number;
  apogeeTimeS: number;
  maxSpeedMs: number;
  maxAccelMs2: number;
  railExitSpeedMs: number;
  railExitTimeS: number;
  burnoutTimeS: number;
  /** Mean |vz| over the last 5 s before landing (excluding the final 1 s). */
  descentRateMs: number;
  landingTimeS: number;
  landed: boolean;
  downrangeM: number;
  liftoffMassKg: number;
  liftedOff: boolean;
  events: FlightEvent[];
  rows: FlightRow[];
}

type Vec2 = [number, number];

/** Deployed fraction of one recovery device at `t`, given its deploy time. */
function deployedFraction(r: SimRecovery, deployT: number | undefined, t: number): number {
  if (deployT === undefined || t < deployT) return 0;
  if (r.inflateS <= 0) return 1;
  return Math.min(1, (t - deployT) / r.inflateS);
}

interface Accel { a: Vec2; axis: Vec2; thrust: number }

/** Integrator state and bookkeeping; one instance per simulation. */
class Flight {
  t = 0;
  x = 0;
  z = 0;
  vx = 0;
  vz = 0;
  onRail = true;
  liftedOff = false;
  /** Distance travelled along the rail. */
  s = 0;
  readonly rail: Vec2;
  readonly wind: Vec2;
  readonly deployTimes: Array<number | undefined>;
  readonly events: FlightEvent[] = [{ name: 'ignition', t: 0, z: 0 }];
  readonly rows: FlightRow[] = [];
  maxSpeed = 0;
  maxAccel = 0;
  maxZ = 0;
  railExitSpeed = 0;
  railExitTime = 0;
  apogeeM = 0;
  apogeeT: number | undefined;
  landed = false;
  landingT: number;
  readonly input: SimInput;

  constructor(input: SimInput) {
    this.input = input;
    const theta = (input.angleDeg * Math.PI) / 180;
    this.rail = [Math.sin(theta), Math.cos(theta)];
    this.wind = [input.windMs, 0];
    this.deployTimes = input.recovery.map(r => (r.deploy.kind === 'time' ? r.deploy.atS : undefined));
    this.landingT = input.maxTimeS;
  }

  mass(t: number): number {
    return this.input.dryMassKg + this.input.motor.massAt(t);
  }

  /** Total deployed recovery fraction (0..n) and drag area at `t`. */
  recoveryAt(t: number): { fraction: number; cdA: number } {
    let fraction = 0;
    let cdA = 0;
    this.input.recovery.forEach((r, i) => {
      const f = deployedFraction(r, this.deployTimes[i], t);
      fraction += f;
      cdA += r.cdA * f;
    });
    return { fraction, cdA };
  }

  /** Forces -> acceleration for a state, with the rail constraint applied. */
  accel(t: number, z: number, vx: number, vz: number): Accel {
    const m = this.mass(t);
    const rho = isa(this.input.siteAltitudeM + Math.max(z, 0)).density;
    const va: Vec2 = [vx - this.wind[0], vz - this.wind[1]];
    const vaMag = Math.hypot(va[0], va[1]);
    const cdA = this.input.cdA + this.recoveryAt(t).cdA;
    const thrust = this.input.motor.thrust(t);
    const dir: Vec2 = this.onRail || vaMag < 1e-6 ? this.rail : [va[0] / vaMag, va[1] / vaMag];
    const k = 0.5 * rho * vaMag * cdA;
    const fx = thrust * dir[0] - k * va[0];
    const fz = thrust * dir[1] - k * va[1] - m * G0;
    if (!this.onRail) return { a: [fx / m, fz / m], axis: dir, thrust };
    // Constrained to the rail; the pad holds the vehicle until it pushes off.
    let as = (fx * this.rail[0] + fz * this.rail[1]) / m;
    const vs = vx * this.rail[0] + vz * this.rail[1];
    if (this.s <= 0 && as < 0 && vs <= 0) as = 0;
    return { a: [as * this.rail[0], as * this.rail[1]], axis: this.rail, thrust };
  }

  /** One RK4 step of (x, z, vx, vz). */
  rk4(dt: number): void {
    const { t, vx, vz } = this;
    const h = dt / 2;
    const k1 = this.accel(t, this.z, vx, vz).a;
    const v2: Vec2 = [vx + k1[0] * h, vz + k1[1] * h];
    const k2 = this.accel(t + h, this.z + vz * h, v2[0], v2[1]).a;
    const v3: Vec2 = [vx + k2[0] * h, vz + k2[1] * h];
    const k3 = this.accel(t + h, this.z + v2[1] * h, v3[0], v3[1]).a;
    const v4: Vec2 = [vx + k3[0] * dt, vz + k3[1] * dt];
    const k4 = this.accel(t + dt, this.z + v3[1] * dt, v4[0], v4[1]).a;
    this.x += (dt / 6) * (vx + 2 * v2[0] + 2 * v3[0] + v4[0]);
    this.z += (dt / 6) * (vz + 2 * v2[1] + 2 * v3[1] + v4[1]);
    this.vx += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    this.vz += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }

  /** Rail phase bookkeeping after a step that ended at `t` (began at prevT). */
  updateRail(prevT: number): void {
    if (!this.onRail) return;
    this.s = this.x * this.rail[0] + this.z * this.rail[1];
    if (this.s <= 0) {
      this.s = 0; this.x = 0; this.z = 0; this.vx = 0; this.vz = 0;
    }
    if (!this.liftedOff && this.s > 0) {
      this.liftedOff = true;
      this.events.push({ name: 'liftoff', t: prevT, z: 0 });
    }
    if (this.s >= this.input.railM) {
      this.onRail = false;
      this.railExitSpeed = Math.hypot(this.vx, this.vz);
      this.railExitTime = this.t;
      this.events.push({ name: 'rail-exit', t: this.t, z: this.z });
    }
  }

  /** Apogee detection (schedules apogee-relative deploys) and deploy events. */
  updateEvents(prevT: number): void {
    const { t, z } = this;
    const burn = this.input.motor.burnTimeS;
    if (prevT < burn && t >= burn) this.events.push({ name: 'burnout', t: burn, z });
    if (this.apogeeT === undefined && this.liftedOff && !this.onRail && this.vz <= 0) {
      this.apogeeT = t;
      this.apogeeM = z;
      this.events.push({ name: 'apogee', t, z });
      this.input.recovery.forEach((r, i) => {
        if (r.deploy.kind === 'apogee') this.deployTimes[i] = t + r.deploy.delayS;
      });
    }
    this.deployTimes.forEach((td, i) => {
      if (td !== undefined && prevT < td && t >= td) this.events.push({ name: 'deploy', t: td, z, index: i });
    });
  }

  pushRow(acc: Accel): void {
    const atm = isa(this.input.siteAltitudeM + Math.max(this.z, 0));
    // Specific force = a - g; the accelerometer reads its component on the axis.
    const sf: Vec2 = [acc.a[0], acc.a[1] + G0];
    this.rows.push({
      t: Math.round(this.t * 1e6) / 1e6,
      x: this.x,
      z: this.z,
      v: Math.hypot(this.vx, this.vz),
      vz: this.vz,
      az: acc.a[1],
      aAxial: sf[0] * acc.axis[0] + sf[1] * acc.axis[1],
      pHpa: atm.pressurePa / 100,
      tempC: atm.temperatureK - 273.15,
      massKg: this.mass(this.t),
      thrustN: acc.thrust,
      chute: this.recoveryAt(this.t).fraction,
    });
  }

  /** Ground contact inside the last step: interpolate and record the landing. */
  land(prevT: number, prevZ: number, dt: number, acc: Accel): void {
    const frac = prevZ > this.z ? prevZ / (prevZ - this.z) : 1;
    this.landingT = prevT + frac * dt;
    this.z = 0;
    this.landed = true;
    this.pushRow(acc);
    this.rows[this.rows.length - 1].t = Math.round(this.landingT * 1e6) / 1e6;
    this.events.push({ name: 'landing', t: this.landingT, z: 0 });
  }

  /** Mean |vz| over [landing - 6 s, landing - 1 s], after apogee. */
  descentRate(): number {
    const apogee = this.apogeeT ?? 0;
    const w = this.rows.filter(r => r.t > this.landingT - 6 && r.t < this.landingT - 1 && r.t > apogee);
    if (w.length > 0) return w.reduce((a, r) => a + Math.abs(r.vz), 0) / w.length;
    return Math.abs(this.rows[this.rows.length - 1]?.vz ?? 0);
  }
}

export function simulateFlight(input: SimInput): SimResult {
  const dt = input.dtS;
  const sampleEvery = Math.max(1, Math.round((input.sampleS ?? 0.01) / dt));
  const f = new Flight(input);
  f.pushRow(f.accel(0, 0, 0, 0));
  for (let step = 1; f.t < input.maxTimeS; step++) {
    const prevT = f.t;
    const prevZ = f.z;
    f.rk4(dt);
    f.t = step * dt;
    f.updateRail(prevT);
    // Never left the pad and the motor is spent: nothing more will happen.
    if (!f.liftedOff && f.t > input.motor.burnTimeS) break;
    f.updateEvents(prevT);
    const now = f.accel(f.t, f.z, f.vx, f.vz);
    f.maxSpeed = Math.max(f.maxSpeed, Math.hypot(f.vx, f.vz));
    if (f.liftedOff) f.maxAccel = Math.max(f.maxAccel, Math.hypot(now.a[0], now.a[1]));
    f.maxZ = Math.max(f.maxZ, f.z);
    if (!f.onRail && f.liftedOff && f.z <= 0) {
      f.land(prevT, prevZ, dt, now);
      break;
    }
    if (step % sampleEvery === 0) f.pushRow(now);
  }
  if (!f.landed && f.liftedOff) f.events.push({ name: 'timeout', t: f.t, z: f.z });
  const apogeeT = f.apogeeT ?? f.t;
  return {
    apogeeM: f.apogeeT !== undefined ? f.apogeeM : f.maxZ,
    apogeeTimeS: apogeeT,
    maxSpeedMs: f.maxSpeed,
    maxAccelMs2: f.maxAccel,
    railExitSpeedMs: f.railExitSpeed,
    railExitTimeS: f.railExitTime,
    burnoutTimeS: input.motor.burnTimeS,
    descentRateMs: f.descentRate(),
    landingTimeS: f.landingT,
    landed: f.landed,
    downrangeM: f.x,
    liftoffMassKg: f.mass(0),
    liftedOff: f.liftedOff,
    events: f.events,
    rows: f.rows,
  };
}
