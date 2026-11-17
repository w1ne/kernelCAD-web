// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// External spur pair: two involute gears at the pitch centre distance (or an
// explicit override), phased so a tooth space faces the driver, with a
// revolute coupling at ω_driven/ω_driver = −z_driver/z_driven and a gear-pair
// transmission. The tooth-interference report and the discrete generating cut
// are separate, opt-in operations. Neither rates tooth strength.

import type { CaptureSession } from './capture/captureSession';
import type { Assembly } from './capture/assembly';
import type { Shape } from './capture/proxy';
import type { AssemblyConnectorOpts } from './capture/assemblyTypes';
import type { KernelCadApi } from './api';
import type { Editable } from '../shared/runtime/paramRef';
import { isParamRef } from '../shared/runtime/paramRef';
import { currentValue } from '../shared/runtime/editableHelpers';
import { collectParamRefs } from '../shared/runtime/resolveParams';
import { invalidArgs } from '../shared/intent/invalidArgs';
import { assertPositiveFinite } from './apiSupport';
import { spurGearRadii } from './spurGear';
import {
  externalCenterDistanceMm,
  externalSpeedRatio,
  meshAlignDeg,
  pitchRadiusMm,
  tipRadiusMm,
} from './spurGearPairMath';
import {
  measureToothInterference,
  type SpurGearToothInterferenceOptions,
  type SpurGearToothInterferenceReport,
} from './spurGearPairReport';
import {
  cutDrivenByDriver,
  type SpurGearGeneratingCut,
  type SpurGearGeneratingCutOptions,
} from './spurGearPairCut';

export type { SpurGearGeneratingCut, SpurGearGeneratingCutOptions } from './spurGearPairCut';
export type { SpurGearToothInterferenceOptions, SpurGearToothInterferenceReport } from './spurGearPairReport';

const PAIR_EXAMPLE = 'spurGearPair({ module: 1, teeth: 20, drivenTeeth: 40, faceWidth: 6, backlash: 0.05 })';

const PAIR_KEYS = new Set([
  'module', 'teeth', 'drivenTeeth', 'ratio', 'drivenModule', 'pressureAngle',
  'faceWidth', 'backlash', 'phase', 'centerDistance', 'driverBore', 'drivenBore', 'name',
]);

export interface SpurGearPairOptions {
  /** Module m of the driver, mm. Pitch diameter is m · teeth. */
  module: Editable<number>;
  /** Driver tooth count, integer in [6, 400]. */
  teeth: Editable<number>;
  /** Driven tooth count. Omit when `ratio` alone fixes it. */
  drivenTeeth?: Editable<number>;
  /** ω_driven / ω_driver. External mesh, so this is negative. |ratio| = teeth / drivenTeeth. */
  ratio?: Editable<number>;
  /** Driven module, mm. Default: the driver module. A mismatch is a geometry error the report can see. */
  drivenModule?: Editable<number>;
  /** Pressure angle in degrees, shared by both gears. Default 20. */
  pressureAngle?: Editable<number>;
  /** Face width of both gears, mm. */
  faceWidth: Editable<number>;
  /**
   * Circular backlash at the pitch circle, mm, applied as the same value to
   * both gears (each tooth thins by half). Default 0.05 × the driver module.
   * Must be in [0, min(module, drivenModule)).
   */
  backlash?: Editable<number>;
  /** Extra driven rotation, degrees, added to the tooth-space alignment. Default 0. */
  phase?: Editable<number>;
  /** Axis separation, mm. Default (m1·z1 + m2·z2) / 2. */
  centerDistance?: Editable<number>;
  /** Driver bore diameter, mm. */
  driverBore?: Editable<number>;
  /** Driven bore diameter, mm. */
  drivenBore?: Editable<number>;
  /** Assembly name. Default `spur-gear-pair`. */
  name?: string;
}

export interface SpurGearPair {
  assembly: Assembly;
  driver: Shape;
  driven: Shape;
  frame: Shape;
  module: number;
  drivenModule: number;
  teeth: number;
  drivenTeeth: number;
  pressureAngleDeg: number;
  /** Authored circular backlash, mm. The report measures a separate arc. */
  backlashMm: number;
  phaseDeg: number;
  /** Driven rotation that puts a tooth space on the line of centres, degrees. */
  alignDeg: number;
  /** (m1·z1 + m2·z2) / 2, mm, whether or not the pair is placed there. */
  pitchCenterDistanceMm: number;
  centerDistanceMm: number;
  /** ω_driven / ω_driver. Negative for an external mesh. */
  ratio: number;
  faceWidth: number;
  driverBore?: number;
  drivenBore?: number;
  name: string;
  /** Set only on the pair returned by `withGeneratingCut`. */
  generatingCut?: SpurGearGeneratingCut;
  /**
   * Exact BREP distance and common volume over sampled poses of one driver
   * tooth, plus poses refined beside the minimum and the pitch-circle arc
   * between the two flank-contact poses. The clearance aggregates are
   * sample-limited. Geometry only.
   */
  toothInterference(opts?: SpurGearToothInterferenceOptions): Promise<SpurGearToothInterferenceReport>;
  /**
   * A new pair whose driven gear is a tip blank cut by discrete poses of the
   * driver. The original pair is unchanged. Default teeth stay the involute.
   */
  withGeneratingCut(opts?: SpurGearGeneratingCutOptions): Promise<SpurGearPair>;
}

interface ResolvedPair {
  module: number;
  drivenModule: number;
  teeth: number;
  drivenTeeth: number;
  pressureAngleDeg: number;
  faceWidth: number;
  backlashMm: number;
  phaseDeg: number;
  alignDeg: number;
  pitchCenterDistanceMm: number;
  centerDistanceMm: number;
  ratio: number;
  driverBore?: number;
  drivenBore?: number;
  name: string;
}

interface PairSolids {
  driver: Shape;
  driven: Shape;
  frame: Shape;
}

type PairApi = Pick<KernelCadApi, 'spurGear' | 'box' | 'cylinder' | 'assembly'>;

function reject(path: string, got: unknown, requires: string): never {
  invalidArgs({
    api: 'spurGearPair(opts)',
    path,
    got,
    showType: true,
    requires,
    example: PAIR_EXAMPLE,
    featureId: 'spurGearPair',
  });
}

function pairArg(session: CaptureSession, value: unknown): unknown {
  if (!isParamRef(value) || value._type !== 'number') return value;
  for (const name of collectParamRefs(value)) session.captureResolvedParams.add(name);
  return currentValue(value, session.paramTable);
}

function assertKnownOpts(opts: SpurGearPairOptions): void {
  if (!opts || typeof opts !== 'object') {
    reject('opts', opts, 'an options object { module, teeth, drivenTeeth or ratio, faceWidth }');
  }
  for (const key of Object.keys(opts)) {
    if (!PAIR_KEYS.has(key)) reject(`opts.${key}`, key, `one of ${[...PAIR_KEYS].join(', ')}`);
  }
}

function wholeTeeth(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 6 || value > 400) {
    reject(path, value, 'a whole tooth count in [6, 400]');
  }
  return value;
}

function pressureOf(value: unknown): number {
  const pressure = value ?? 20;
  if (typeof pressure !== 'number' || !(pressure >= 10 && pressure <= 35)) {
    reject('opts.pressureAngle', pressure, 'a number in [10, 35] — both gears share it');
  }
  return pressure;
}

function phaseOf(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    reject('opts.phase', value, 'a finite angle in degrees');
  }
  return value;
}

function nameOf(value: unknown): string {
  if (value === undefined) return 'spur-gear-pair';
  if (typeof value !== 'string' || value.trim() === '') reject('opts.name', value, 'a non-empty string');
  return value.trim();
}

function backlashOf(value: unknown, moduleMm: number, drivenModule: number): number {
  const backlash = value ?? 0.05 * moduleMm;
  const limit = Math.min(moduleMm, drivenModule);
  if (typeof backlash !== 'number' || !Number.isFinite(backlash) || backlash < 0 || backlash >= limit) {
    reject('opts.backlash', backlash, `a finite number in [0, ${limit}) — one circular backlash for both gears`);
  }
  return backlash;
}

function boreOf(
  value: unknown,
  path: 'driverBore' | 'drivenBore',
  moduleMm: number,
  teeth: number,
  pressure: number,
): number | undefined {
  if (value === undefined) return undefined;
  const bore = assertPositiveFinite('spurGearPair', path, value);
  const root = spurGearRadii(moduleMm, teeth, pressure).root;
  if (bore / 2 >= root - 0.5 * moduleMm) {
    reject(`opts.${path}`, bore, `a bore leaving at least 0.5 × module under the root (root diameter ${(2 * root).toFixed(3)} mm)`);
  }
  return bore;
}

function negativeRatio(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value < 0)) {
    reject('opts.ratio', value, 'a finite number < 0 — an external mesh turns the gears opposite ways');
  }
  return value;
}

function teethFromRatio(teeth: number, ratioRaw: unknown): number {
  const ratio = negativeRatio(ratioRaw);
  const raw = teeth / Math.abs(ratio);
  const driven = Math.round(raw);
  if (Math.abs(raw - driven) >= 1e-9 || driven < 6 || driven > 400) {
    reject('opts.ratio', ratioRaw, 'a negative ratio whose tooth count teeth/|ratio| is a whole number in [6, 400]');
  }
  return driven;
}

function countsOf(teeth: number, drivenRaw: unknown, ratioRaw: unknown): { drivenTeeth: number; ratio: number } {
  if (drivenRaw === undefined && ratioRaw === undefined) {
    reject('opts.drivenTeeth', undefined, 'drivenTeeth, or a negative ratio, or both when they agree');
  }
  const drivenTeeth = drivenRaw === undefined ? teethFromRatio(teeth, ratioRaw) : wholeTeeth(drivenRaw, 'opts.drivenTeeth');
  const ratio = externalSpeedRatio(teeth, drivenTeeth);
  if (ratioRaw !== undefined && Math.abs(teeth - drivenTeeth * Math.abs(negativeRatio(ratioRaw))) > 1e-6) {
    reject('opts.ratio', ratioRaw, `a ratio consistent with teeth/drivenTeeth (this pair is ${ratio})`);
  }
  return { drivenTeeth, ratio };
}

function resolvePair(session: CaptureSession, opts: SpurGearPairOptions): ResolvedPair {
  assertKnownOpts(opts);
  const module = assertPositiveFinite('spurGearPair', 'module', pairArg(session, opts.module));
  const drivenModule = opts.drivenModule === undefined
    ? module
    : assertPositiveFinite('spurGearPair', 'drivenModule', pairArg(session, opts.drivenModule));
  const faceWidth = assertPositiveFinite('spurGearPair', 'faceWidth', pairArg(session, opts.faceWidth));
  const teeth = wholeTeeth(pairArg(session, opts.teeth), 'opts.teeth');
  const pressureAngleDeg = pressureOf(pairArg(session, opts.pressureAngle));
  const counts = countsOf(teeth, pairArg(session, opts.drivenTeeth), pairArg(session, opts.ratio));
  const backlashMm = backlashOf(pairArg(session, opts.backlash), module, drivenModule);
  const pitchCenterDistanceMm = externalCenterDistanceMm(module, teeth, drivenModule, counts.drivenTeeth);
  const centerDistanceMm = opts.centerDistance === undefined
    ? pitchCenterDistanceMm
    : assertPositiveFinite('spurGearPair', 'centerDistance', pairArg(session, opts.centerDistance));
  const driverBore = boreOf(pairArg(session, opts.driverBore), 'driverBore', module, teeth, pressureAngleDeg);
  const drivenBore = boreOf(
    pairArg(session, opts.drivenBore),
    'drivenBore',
    drivenModule,
    counts.drivenTeeth,
    pressureAngleDeg,
  );
  return {
    module,
    drivenModule,
    teeth,
    drivenTeeth: counts.drivenTeeth,
    pressureAngleDeg,
    faceWidth,
    backlashMm,
    phaseDeg: phaseOf(pairArg(session, opts.phase)),
    alignDeg: meshAlignDeg(counts.drivenTeeth),
    pitchCenterDistanceMm,
    centerDistanceMm,
    ratio: counts.ratio,
    ...(driverBore !== undefined ? { driverBore } : {}),
    ...(drivenBore !== undefined ? { drivenBore } : {}),
    name: nameOf(opts.name),
  };
}

function involute(api: PairApi, moduleMm: number, teeth: number, spec: ResolvedPair, bore: number | undefined): Shape {
  return api.spurGear({
    module: moduleMm,
    teeth,
    faceWidth: spec.faceWidth,
    pressureAngle: spec.pressureAngleDeg,
    backlash: spec.backlashMm,
    ...(bore !== undefined ? { bore } : {}),
  });
}

function placeDriven(gear: Shape, spec: ResolvedPair): Shape {
  const turn = spec.alignDeg + spec.phaseDeg;
  const turned = Math.abs(turn) < 1e-12 ? gear : gear.rotateZ(turn);
  return turned.translate(spec.centerDistanceMm, 0, 0);
}

function supportAt(api: PairApi, x: number, bore: number | undefined, faceWidth: number, centerMm: number): Shape {
  const shaftR = bore === undefined ? 0 : bore / 2 - 0.2;
  if (shaftR > 0.15) return api.cylinder(faceWidth + 1.2, shaftR).translate(x, 0, -1.2);
  const span = Math.min(4, centerMm / 2 - 0.5);
  return api.cylinder(1.1, span > 0.4 ? span : 0.4).translate(x, 0, -1.2);
}

function frameFor(api: PairApi, spec: ResolvedPair): Shape {
  const tip1 = tipRadiusMm(spec.module, spec.teeth);
  const tip2 = tipRadiusMm(spec.drivenModule, spec.drivenTeeth);
  const x0 = -tip1 - 4;
  const width = spec.centerDistanceMm + tip2 + 4 - x0;
  const yHalf = Math.max(tip1, tip2) + 4;
  const plate = api.box(width, yHalf * 2, 2).translate(x0, -yHalf, -3);
  return plate.union(
    supportAt(api, 0, spec.driverBore, spec.faceWidth, spec.centerDistanceMm),
    supportAt(api, spec.centerDistanceMm, spec.drivenBore, spec.faceWidth, spec.centerDistanceMm),
  );
}

function axisAt(x: number, clearance: number | undefined): AssemblyConnectorOpts {
  const opts: AssemblyConnectorOpts = {
    type: 'axis',
    origin: { kind: 'vec3', value: [x, 0, 0] },
    axis: [0, 0, 1],
  };
  if (clearance !== undefined) opts.jointClearanceRadius = clearance;
  return opts;
}

function measureSpecOf(spec: ResolvedPair) {
  return {
    teeth: spec.teeth,
    drivenTeeth: spec.drivenTeeth,
    module: spec.module,
    alignDeg: spec.alignDeg,
    phaseDeg: spec.phaseDeg,
    centerDistanceMm: spec.centerDistanceMm,
    pitchCenterDistanceMm: spec.pitchCenterDistanceMm,
    ratio: spec.ratio,
    backlashMm: spec.backlashMm,
  };
}

async function reportOf(
  solids: PairSolids,
  spec: ResolvedPair,
  opts: SpurGearToothInterferenceOptions | undefined,
): Promise<SpurGearToothInterferenceReport> {
  return measureToothInterference(
    await solids.driver.lower(),
    await solids.driven.lower(),
    measureSpecOf(spec),
    pitchRadiusMm(spec.drivenModule, spec.drivenTeeth),
    opts,
  );
}

function assemble(
  session: CaptureSession,
  api: PairApi,
  spec: ResolvedPair,
  solids: PairSolids,
  cut: SpurGearGeneratingCut | undefined,
): SpurGearPair {
  const assembly = api.assembly(spec.name);
  const driverClearance = spec.driverBore === undefined ? undefined : spec.driverBore / 2;
  const drivenClearance = spec.drivenBore === undefined ? undefined : spec.drivenBore / 2;
  assembly.part('frame', solids.frame.color('frame'))
    .connector('driver-axis', axisAt(0, undefined))
    .connector('driven-axis', axisAt(spec.centerDistanceMm, undefined));
  assembly.part('driver', solids.driver.color('#c4a35a'))
    .connector('axis', axisAt(0, driverClearance));
  assembly.part('driven', solids.driven.color('#8aa0b4'))
    .connector('axis', axisAt(spec.centerDistanceMm, drivenClearance));
  assembly.mate('driver-turn', 'frame.driver-axis', 'driver.axis', 'revolute', {
    limitsDeg: [-180, 180],
    exposure: 'concealed',
  });
  assembly.mate('driven-turn', 'frame.driven-axis', 'driven.axis', 'revolute', {
    limitsDeg: [-180, 180],
    exposure: 'concealed',
  });
  assembly.coupleMates('driven-turn', { source: 'driver-turn', ratio: spec.ratio, offset: 0 });
  assembly.transmission('spur-mesh', {
    kind: 'gear-pair',
    sourceMate: 'driver-turn',
    drivenMates: ['driven-turn'],
    input: 'driver',
    output: 'driven',
    path: ['driver', 'driven'],
    ratio: spec.ratio,
    notes: 'External spur mesh. The ratio is the constraint; tooth contact is not a second one.',
  });
  return {
    assembly,
    driver: solids.driver,
    driven: solids.driven,
    frame: solids.frame,
    ...spec,
    ...(cut !== undefined ? { generatingCut: cut } : {}),
    toothInterference: (opts) => reportOf(solids, spec, opts),
    withGeneratingCut: (opts) => rebuildCut(session, api, spec, opts),
  };
}

async function rebuildCut(
  session: CaptureSession,
  api: PairApi,
  spec: ResolvedPair,
  opts: SpurGearGeneratingCutOptions | undefined,
): Promise<SpurGearPair> {
  const driver = involute(api, spec.module, spec.teeth, spec, spec.driverBore);
  const cut = await cutDrivenByDriver(session, {
    driver: await driver.lower(),
    moduleMm: spec.module,
    drivenModuleMm: spec.drivenModule,
    teeth: spec.teeth,
    drivenTeeth: spec.drivenTeeth,
    faceWidth: spec.faceWidth,
    alignDeg: spec.alignDeg,
    phaseDeg: spec.phaseDeg,
    ratio: spec.ratio,
    centerDistanceMm: spec.centerDistanceMm,
    ...(spec.drivenBore !== undefined ? { drivenBore: spec.drivenBore } : {}),
    samples: opts?.samples,
    scallopMm: opts?.scallopMm,
  });
  return assemble(session, api, spec, {
    driver,
    driven: cut.shape,
    frame: frameFor(api, spec),
  }, cut.cut);
}

export function buildSpurGearPair(session: CaptureSession, api: PairApi, opts: SpurGearPairOptions): SpurGearPair {
  const spec = resolvePair(session, opts);
  const driver = involute(api, spec.module, spec.teeth, spec, spec.driverBore);
  const driven = placeDriven(involute(api, spec.drivenModule, spec.drivenTeeth, spec, spec.drivenBore), spec);
  return assemble(session, api, spec, { driver, driven, frame: frameFor(api, spec) }, undefined);
}
