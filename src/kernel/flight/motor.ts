// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/motor.ts
//
// Tabulated motor: linear thrust interpolation, exact (trapezoid) cumulative
// impulse, and a RASP .eng parser. Propellant burns in proportion to the
// impulse delivered so far, the usual assumption when only the curve and the
// two masses are known.

export type ThrustPoint = readonly [number, number];

export interface ParsedEng {
  designation: string;
  diameterMm: number;
  lengthMm: number;
  propellantKg: number;
  totalMassKg: number;
  thrustCurve: ThrustPoint[];
}

/** Parse RASP .eng text (first motor in the file). Throws Error with the reason. */
export function parseEngFile(text: string): ParsedEng {
  const lines = text.split(/\r?\n/).map(l => l.replace(/;.*$/, '').trim()).filter(l => l.length > 0);
  if (lines.length < 2) throw new Error('an .eng file needs a header line and at least one thrust point');
  const head = lines[0].split(/\s+/);
  if (head.length < 7) {
    throw new Error(`the .eng header needs 7 fields (name diameter length delays propellantKg totalKg maker); got '${lines[0]}'`);
  }
  const [designation, dia, len, , prop, total] = head;
  const nums = [dia, len, prop, total].map(Number);
  if (nums.some(n => !Number.isFinite(n) || n <= 0)) throw new Error(`the .eng header has a non-positive number: '${lines[0]}'`);
  const curve: ThrustPoint[] = [];
  for (const l of lines.slice(1)) {
    const parts = l.split(/\s+/).map(Number);
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) break; // next motor
    curve.push([parts[0], parts[1]]);
    if (parts[1] === 0 && curve.length > 1) break;
  }
  if (curve.length === 0) throw new Error('the .eng file has no thrust points');
  if (curve[0][0] > 0) curve.unshift([0, 0]);
  return { designation, diameterMm: nums[0], lengthMm: nums[1], propellantKg: nums[2], totalMassKg: nums[3], thrustCurve: curve };
}

export class Motor {
  private readonly t: number[];
  private readonly f: number[];
  /** Cumulative impulse at each table point, N*s. */
  private readonly cum: number[];
  readonly totalImpulseNs: number;
  readonly burnTimeS: number;
  readonly peakThrustN: number;
  readonly totalMassKg: number;
  readonly propellantKg: number;

  constructor(curve: ReadonlyArray<ThrustPoint>, totalMassKg: number, propellantKg: number) {
    this.totalMassKg = totalMassKg;
    this.propellantKg = propellantKg;
    this.t = curve.map(p => p[0]);
    this.f = curve.map(p => p[1]);
    this.cum = [0];
    for (let i = 1; i < this.t.length; i++) {
      this.cum.push(this.cum[i - 1] + 0.5 * (this.f[i] + this.f[i - 1]) * (this.t[i] - this.t[i - 1]));
    }
    this.totalImpulseNs = this.cum[this.cum.length - 1];
    this.burnTimeS = this.t[this.t.length - 1];
    this.peakThrustN = Math.max(...this.f);
  }

  private segment(time: number): number {
    // Tables are short (tens of points): a linear scan is cheaper than bisection set-up.
    let i = 0;
    while (i < this.t.length - 2 && time > this.t[i + 1]) i++;
    return i;
  }

  thrust(time: number): number {
    if (time <= this.t[0] || time >= this.burnTimeS) return 0;
    const i = this.segment(time);
    const span = this.t[i + 1] - this.t[i];
    return span <= 0 ? this.f[i + 1] : this.f[i] + ((this.f[i + 1] - this.f[i]) * (time - this.t[i])) / span;
  }

  /** Impulse delivered from ignition to `time`, N*s. */
  impulseUntil(time: number): number {
    if (time <= this.t[0]) return 0;
    if (time >= this.burnTimeS) return this.totalImpulseNs;
    const i = this.segment(time);
    const dt = time - this.t[i];
    return this.cum[i] + 0.5 * (this.f[i] + this.thrust(time)) * dt;
  }

  /** Motor mass at `time`, kg. */
  massAt(time: number): number {
    const frac = this.totalImpulseNs > 0 ? this.impulseUntil(time) / this.totalImpulseNs : 1;
    return this.totalMassKg - this.propellantKg * frac;
  }

  /** NAR letter class from total impulse (A = 1.26-2.5 N*s, doubling). */
  impulseClass(): string {
    const I = this.totalImpulseNs;
    if (I <= 0.3125) return '1/8A';
    if (I <= 0.625) return '1/4A';
    if (I <= 1.25) return '1/2A';
    const n = Math.ceil(Math.log2(I / 2.5));
    return String.fromCharCode('A'.charCodeAt(0) + Math.max(0, n));
  }
}
