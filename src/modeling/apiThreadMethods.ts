// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/apiThreadMethods.ts
//
// Script globals for ISO metric threads (`isoThread`, `threadedRod`) and the
// 3D Bézier convenience (`bezier`).
//
// A modelled `threadedRod` is ONE helical sweep of the thread's transverse
// cross-section (see modeling/threads.ts): the section turns a full revolution
// per pitch as it advances, so the rod comes out of the sweep as a finished
// solid with planar ends. No core-cylinder fuse, which on helical B-spline
// faces costs ~0.4 s per turn; the optional end chamfers are the only boolean.

import type { CaptureSession } from './capture/captureSession';
import type { Shape } from './capture/proxy';
import { makePath, type PathBuilder } from './capture/sketch';
import type { Curve3D } from './capture/curveProxy';
import { invalidArgs } from '../shared/intent/invalidArgs';
import type { Vec3 } from '../shared/intent/types';
import { mm } from './apiSupport';
import {
  externalThreadSection,
  isoThreadInfo,
  maxRodClearance,
  type IsoThreadInfo,
  type SectionStep,
} from './threads';
import type { KernelCadApi } from './api';

export type { IsoThreadInfo } from './threads';

/** Options of {@link KernelCadApi.threadedRod}. */
export interface ThreadedRodOptions {
  /** ISO metric designation: `'M6'` (coarse pitch) or `'M6x0.75'`. */
  spec: string;
  /** Rod length along +Z from z = 0, mm. */
  length: number;
  /** 45° end chamfers: `true` chamfers both ends down to the thread root,
   *  a number sets the radial chamfer size in mm. Default `false` (square
   *  ends; the chamfer is the only boolean in the build, ~1–2 s). */
  chamfer?: boolean | number;
  /** `true` returns a plain cylinder at the major diameter carrying the
   *  thread spec as metadata — instant, for layout and drawings. */
  cosmetic?: boolean;
  /** Radial / flank allowance taken OFF the external thread, mm (0 = basic
   *  ISO profile). Use 0.1–0.2 for an FDM rod; capped at pitch / 10. */
  clearance?: number;
}

const ROD_KEYS = new Set(['spec', 'length', 'chamfer', 'cosmetic', 'clearance']);
const ROD_EXAMPLE = "threadedRod({ spec: 'M6', length: 20, chamfer: true })";

function rodArgError(path: string, got: unknown, requires: string, unit?: string): never {
  return invalidArgs({
    api: 'threadedRod(opts)',
    path,
    got,
    showType: typeof got !== 'number' && typeof got !== 'boolean',
    requires,
    unit,
    example: ROD_EXAMPLE,
    featureId: 'threadedRod',
  });
}

interface ResolvedRod {
  info: IsoThreadInfo;
  length: number;
  chamfer: number;
  cosmetic: boolean;
  clearance: number;
}

function resolveRodChamfer(raw: unknown, info: IsoThreadInfo, length: number): number {
  if (raw === undefined || raw === false) return 0;
  if (raw === true) return info.threadDepth;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0 || raw > info.diameter / 2 || 2 * raw >= length) {
    rodArgError(
      'opts.chamfer',
      raw,
      `true (chamfer to the thread root, ${info.threadDepth.toFixed(3)} mm on ${info.spec}) or a radial size > 0, ≤ diameter / 2 and < length / 2`,
      'mm',
    );
  }
  return raw;
}

function resolveRod(opts: ThreadedRodOptions): ResolvedRod {
  if (!opts || typeof opts !== 'object') {
    rodArgError('opts', opts, "an options object { spec, length, chamfer?, cosmetic?, clearance? }");
  }
  for (const k of Object.keys(opts)) {
    if (!ROD_KEYS.has(k)) rodArgError(`opts.${k}`, k, 'one of spec, length, chamfer, cosmetic, clearance');
  }
  const info = isoThreadInfo(opts.spec, 'threadedRod({ spec })');
  const length = opts.length;
  if (typeof length !== 'number' || !Number.isFinite(length) || length <= 0) {
    rodArgError('opts.length', length, 'a finite number > 0 — the rod length along +Z from z = 0', 'mm');
  }
  const clearance = opts.clearance ?? 0;
  if (typeof clearance !== 'number' || !Number.isFinite(clearance) || clearance < 0 || clearance > maxRodClearance(info.pitch)) {
    rodArgError(
      'opts.clearance',
      clearance,
      `a number in [0, pitch / 10] — ${info.spec} allows up to ${maxRodClearance(info.pitch)}; for more play also give the mating hole a clearance`,
      'mm',
    );
  }
  if (opts.cosmetic !== undefined && typeof opts.cosmetic !== 'boolean') {
    rodArgError('opts.cosmetic', opts.cosmetic, 'a boolean — true returns a plain major-diameter cylinder with the thread recorded as metadata');
  }
  return { info, length, chamfer: resolveRodChamfer(opts.chamfer, info, length), cosmetic: opts.cosmetic === true, clearance };
}

function drawSection(start: PathBuilder, steps: SectionStep[]): PathBuilder {
  let p = start;
  for (const st of steps) {
    if (st.kind === 'moveTo') p = p.moveTo(st.p[0], st.p[1]);
    else if (st.kind === 'arc') p = p.threePointsArc(st.to[0], st.to[1], st.via[0], st.via[1]);
    else p = p.spline(st.points, { startTangent: st.startTangent, endTangent: st.endTangent });
  }
  return p;
}

/** Ring cutters that turn the square rod ends into 45° chamfers. Each is a
 *  triangle revolved about Z, kept short so it only meets the end turns. */
function chamferRings(session: CaptureSession, r: ResolvedRod): Shape[] {
  const R = r.info.diameter / 2 + 0.5;
  const inner = r.info.diameter / 2 - r.chamfer;
  const e = 0.1 * r.info.pitch;
  // The cone continues past both the end plane and the crest so the cut
  // never grazes a face of the rod.
  const reach = R - inner;
  const bottom = makePath(session).moveTo(inner - e, -e).lineTo(R, -e).lineTo(R, reach).close().revolve();
  const L = r.length;
  const top = makePath(session).moveTo(inner - e, L + e).lineTo(R, L - reach).lineTo(R, L + e).close().revolve();
  return [bottom, top];
}

function cosmeticRod(session: CaptureSession, r: ResolvedRod): Shape {
  return session.createShape({
    kind: 'cylinder',
    params: { h: mm(r.length), r: mm(r.info.diameter / 2 - r.clearance) },
    inputs: {},
    metadata: { thread: { ...r.info, kind: 'external', modeled: false, length: r.length } },
  });
}

export function makeThreadMethods(
  session: CaptureSession,
  self: () => KernelCadApi,
): Pick<KernelCadApi, 'isoThread' | 'threadedRod' | 'bezier'> {
  return {
    isoThread(spec) {
      return isoThreadInfo(spec);
    },
    threadedRod(opts) {
      const r = resolveRod(opts);
      if (r.cosmetic) {
        const rod = cosmeticRod(session, r);
        return r.chamfer > 0 ? rod.subtract(...chamferRings(session, r)) : rod;
      }
      const section = drawSection(makePath(session), externalThreadSection(r.info, r.clearance)).close();
      // Pitch and turns set the twist; the helix radius only shapes the spine.
      const rail = self().helix({ radius: r.info.minorDiameter / 2, pitch: r.info.pitch, turns: r.length / r.info.pitch });
      const rod = section.sweep(rail, { spine: 'helix', section: 'transverse' });
      return r.chamfer > 0 ? rod.subtract(...chamferRings(session, r)) : rod;
    },
    bezier(points: Vec3[]): Curve3D {
      if (!Array.isArray(points) || points.length < 2 || points.length > 26) {
        invalidArgs({
          api: 'bezier(points)',
          path: 'points',
          got: Array.isArray(points) ? `${points.length} points` : points,
          showType: !Array.isArray(points),
          requires: 'an array of 2–26 [x, y, z] control points — 3 for a quadratic, 4 for a cubic Bézier',
          example: 'bezier([[0, 0, 0], [10, 0, 10], [20, 10, 10], [30, 10, 0]])',
          featureId: 'bezier',
        });
      }
      // A clamped B-spline of degree n − 1 on n control points with no
      // interior knots IS the Bézier curve of those points.
      return self().nurbsCurve(points, { degree: points.length - 1 });
    },
  };
}
