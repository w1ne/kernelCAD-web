// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Discrete generating cut. One driver tooth of relative motion is sampled,
// each pose is intersected with a tip-radius blank, the pieces are united,
// and that one tooth space is copied around the driven gear at tooth pitch.
// The copies are the same chip, not a second sweep. The scallop figure is
// the chordal sagitta of the driver tip about the ratio's pitch point for
// one sample step: an upper bound on that path, not a measured flank error,
// and not a continuous envelope.

import { OcctBackend } from '../kernel/backends/occt/occtBackend';
import type { CaptureSession } from './capture/captureSession';
import type { Shape } from './capture/proxy';
import { Transform } from '../shared/runtime/se3';
import { KernelError } from '../shared/intent/kernelError';
import { invalidArgs } from '../shared/intent/invalidArgs';
import { mm, ul } from './apiSupport';
import {
  SPUR_GEAR_MAX_CUT_SAMPLES,
  SPUR_GEAR_MIN_CUT_SAMPLES,
  driverInDrivenFrame,
  generatingScallopMm,
  tipPenetrationMm,
  tipRadiusMm,
  type ScallopInput,
} from './spurGearPairMath';

const CHIP_VOLUME_MM3 = 1e-6;
const CUT_EXAMPLE = 'pair.withGeneratingCut({ samples: 8 })';

export const SPUR_GEAR_CUT_NOTE =
  'Discrete union of the mating driver at N poses over one driver tooth, subtracted from a tip-radius blank and repeated at the driven tooth pitch. scallopMm is the chordal sagitta of the driver tip about the ratio pitch point for one step: an upper bound on that tip path, not a measured flank error and not a continuous generating cut.';

export interface SpurGearGeneratingCut {
  samples: number;
  /** Chordal sagitta bound for one sample step, mm. Not a measured flank error. */
  scallopMm: number;
  method: 'discrete-union';
  cycle: 'one-driver-tooth';
  repetition: 'tooth-pitch';
  note: string;
}

export interface SpurGearGeneratingCutOptions {
  /** Poses across one driver tooth. Default 8. Integer in [3, 24]. */
  samples?: number;
  /**
   * Raise the pose count until the chordal sagitta is at most this many mm.
   * Throws when 24 poses still miss the bound.
   */
  scallopMm?: number;
}

export interface SpurGearCutRequest {
  driver: OcctBackend;
  moduleMm: number;
  drivenModuleMm: number;
  teeth: number;
  drivenTeeth: number;
  faceWidth: number;
  alignDeg: number;
  phaseDeg: number;
  ratio: number;
  centerDistanceMm: number;
  drivenBore?: number;
  samples?: number;
  scallopMm?: number;
}

function rejectCut(path: string, got: unknown, requires: string): never {
  invalidArgs({
    api: 'spurGearPair(...).withGeneratingCut(opts)',
    path,
    got,
    showType: true,
    requires,
    example: CUT_EXAMPLE,
    featureId: 'spurGearPair',
  });
}

function resolveCutSamples(req: SpurGearCutRequest): { samples: number; scallopMm: number } {
  const basis: Omit<ScallopInput, 'samples'> = {
    moduleMm: req.moduleMm,
    teeth: req.teeth,
    drivenTeeth: req.drivenTeeth,
    centerDistanceMm: req.centerDistanceMm,
  };
  let samples = req.samples ?? 8;
  if (!Number.isInteger(samples) || samples < SPUR_GEAR_MIN_CUT_SAMPLES || samples > SPUR_GEAR_MAX_CUT_SAMPLES) {
    rejectCut(
      'opts.samples',
      req.samples,
      `an integer in [${SPUR_GEAR_MIN_CUT_SAMPLES}, ${SPUR_GEAR_MAX_CUT_SAMPLES}] — each pose is one boolean`,
    );
  }
  if (req.scallopMm !== undefined) {
    if (typeof req.scallopMm !== 'number' || !Number.isFinite(req.scallopMm) || req.scallopMm <= 0) {
      rejectCut('opts.scallopMm', req.scallopMm, 'a finite length > 0, in mm');
    }
    while (generatingScallopMm({ ...basis, samples }) > req.scallopMm) {
      if (samples >= SPUR_GEAR_MAX_CUT_SAMPLES) {
        const atCap = generatingScallopMm({ ...basis, samples: SPUR_GEAR_MAX_CUT_SAMPLES });
        rejectCut(
          'opts.scallopMm',
          req.scallopMm,
          `a bound ${SPUR_GEAR_MAX_CUT_SAMPLES} poses can meet; the step sagitta at that cap is ${atCap.toFixed(4)} mm`,
        );
      }
      samples += 1;
    }
  }
  return { samples, scallopMm: generatingScallopMm({ ...basis, samples }) };
}

function cutterPose(req: SpurGearCutRequest, driverDeg: number): Transform {
  const pose = driverInDrivenFrame(driverDeg, req.alignDeg, req.phaseDeg, req.ratio, req.centerDistanceMm);
  return Transform.translation(pose.xMm, pose.yMm, 0)
    .compose(Transform.rotationAxisAngleDeg([0, 0, 1], pose.rotationDeg));
}

function pieceAt(driver: OcctBackend, blank: OcctBackend, req: SpurGearCutRequest, driverDeg: number): OcctBackend | undefined {
  const posed = driver.located(cutterPose(req, driverDeg)).clone();
  const common = posed.intersect(blank.clone());
  if (common.volume() <= CHIP_VOLUME_MM3) return undefined;
  return common;
}

async function buildChip(
  driver: OcctBackend,
  blank: OcctBackend,
  req: SpurGearCutRequest,
  samples: number,
): Promise<OcctBackend> {
  let chip: OcctBackend | undefined;
  const step = (360 / req.teeth) / samples;
  for (let i = 0; i < samples; i += 1) {
    await Promise.resolve();
    const piece = pieceAt(driver, blank, req, i * step);
    if (piece === undefined) continue;
    chip = chip === undefined ? piece : chip.union(piece);
  }
  if (chip === undefined || chip.volume() <= CHIP_VOLUME_MM3) {
    throw new KernelError(
      'feature.kernel-failed',
      'spurGearPair generating cut removed nothing: every sampled pose missed the tip blank.',
      'spurGearPair',
      'The driver tip should enter the blank. Check the centre distance and the tooth counts.',
    );
  }
  return chip;
}

async function subtractPitchCopies(blank: OcctBackend, chip: OcctBackend, drivenTeeth: number): Promise<OcctBackend> {
  let cut = blank.clone();
  const pitch = 360 / drivenTeeth;
  for (let k = 0; k < drivenTeeth; k += 1) {
    await Promise.resolve();
    const tool = k === 0 ? chip.clone() : chip.clone().rotate([0, 0, 1], k * pitch);
    cut = cut.subtract(tool);
  }
  return cut;
}

function subtractBore(cut: OcctBackend, faceWidth: number, bore: number | undefined): OcctBackend {
  if (bore === undefined) return cut;
  return cut.subtract(OcctBackend.cylinder(faceWidth + 2, bore / 2).translate(0, 0, -1));
}

function parkCut(
  session: CaptureSession,
  solid: OcctBackend,
  req: SpurGearCutRequest,
  resolved: { samples: number; scallopMm: number },
): Shape {
  const shape = session.createShape({
    kind: 'spurGearCut',
    params: {
      samples: ul(resolved.samples),
      scallopMm: mm(resolved.scallopMm),
      faceWidth: mm(req.faceWidth),
      centerDistance: mm(req.centerDistanceMm),
      ...(req.drivenBore !== undefined ? { bore: mm(req.drivenBore) } : {}),
    },
    inputs: {},
    metadata: {
      method: 'discrete-union',
      cycle: 'one-driver-tooth',
      repetition: 'tooth-pitch',
      note: SPUR_GEAR_CUT_NOTE,
      samples: resolved.samples,
      scallopMm: resolved.scallopMm,
    },
  });
  session.importedGeometry.set(shape.id, solid);
  return shape;
}

function placeCut(shape: Shape, alignDeg: number, phaseDeg: number, centerMm: number): Shape {
  const turn = alignDeg + phaseDeg;
  const turned = Math.abs(turn) < 1e-12 ? shape : shape.rotateZ(turn);
  return turned.translate(centerMm, 0, 0);
}

/**
 * Cut the driven blank with the already-lowered driver. The caller lowers
 * the driver first so OCCT is initialised. Returns the cut solid placed at
 * the mesh (rotate by align+phase, then translate to the centre distance).
 */
export async function cutDrivenByDriver(
  session: CaptureSession,
  req: SpurGearCutRequest,
): Promise<{ shape: Shape; cut: SpurGearGeneratingCut }> {
  const penetration = tipPenetrationMm(
    req.moduleMm,
    req.teeth,
    req.drivenModuleMm,
    req.drivenTeeth,
    req.centerDistanceMm,
  );
  if (penetration <= 0) {
    rejectCut(
      'centerDistance',
      req.centerDistanceMm,
      `a centre where the driver tip enters the driven tip circle (penetration is ${penetration.toFixed(3)} mm)`,
    );
  }
  const resolved = resolveCutSamples(req);
  const blank = OcctBackend.cylinder(req.faceWidth, tipRadiusMm(req.drivenModuleMm, req.drivenTeeth));
  const chip = await buildChip(req.driver, blank, req, resolved.samples);
  const solid = subtractBore(await subtractPitchCopies(blank, chip, req.drivenTeeth), req.faceWidth, req.drivenBore);
  return {
    shape: placeCut(parkCut(session, solid, req, resolved), req.alignDeg, req.phaseDeg, req.centerDistanceMm),
    cut: {
      samples: resolved.samples,
      scallopMm: resolved.scallopMm,
      method: 'discrete-union',
      cycle: 'one-driver-tooth',
      repetition: 'tooth-pitch',
      note: SPUR_GEAR_CUT_NOTE,
    },
  };
}
