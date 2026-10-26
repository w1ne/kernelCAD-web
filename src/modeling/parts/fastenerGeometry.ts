// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Standard fastener solids at two levels of detail. One builder serves the
// in-memory path (envelopePart.ts; the browser has no filesystem) and the
// catalog STEP generator (scripts/generateSeedCatalog.ts).
//
//   'full'     — the hardware as its standard draws it: head form, hex socket
//                with a 118° drill-point bottom, 30° hex chamfers, washer
//                face, under-head fillet, and a modeled ISO 68-1 external
//                thread at the ISO 261 coarse pitch over the standard's thread
//                length, with a 45° chamfered start. Nuts carry a modeled
//                internal thread and a 120° countersink on both faces.
//   'envelope' — the nominal solid (head envelope + nominal-Ø shank; a nut
//                with a nominal bore). This is also the ANALYSIS body every
//                fit / clash / installation check measures: a modeled thread
//                in a tapped or clearance hole, or in its nut, is not a clash.
//
// Dimensions are nominal values from the standards' tables (familyTable.ts);
// they are not certified geometry.
//
// Cost model: a thread is ONE screw-motion sweep of the thread's transverse
// section (modeling/threads.ts). Every boolean touching it skips replicad's
// face-unification pass (`booleanUnsimplified`, occtRawBoolean.ts), which
// on helical faces runs for minutes. Past MAX_HELICAL_TURNS (long threaded rods) the thread is the
// same ISO profile revolved as rings: one analytic revolve, no helix. That
// form is reported on the part record (`threadForm: 'annular'`).

import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { booleanUnsimplified } from '../../kernel/backends/occt/occtRawBoolean';
import { isoInternalGrooveProfile, isoMinorRadius } from '../../kernel/backends/occt/isoThread';
import type { Param } from '../../shared/intent/types';
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import { externalThreadSection, isoThreadInfo, type IsoThreadInfo } from '../threads';
import { isFixtureKind, type FastenerDetail, type FastenerIsoDims, type ResolvedPart } from './familyTable';
import { countersunkScrewSolid, headlessSolid, hexHeadBoltSolid } from './headSolids';
import { fixtureSolid } from './fixtureSolids';

export type { FastenerDetail };

export const FASTENER_DETAILS: readonly FastenerDetail[] = ['full', 'envelope'];

/** Helical threads above this many turns are built in the annular form. */
export const MAX_HELICAL_TURNS = 100;

/** How the 'full' solid draws the thread of a part. */
export type ThreadForm = 'helical' | 'annular' | 'none';

function mm(evaluated: number): Param {
  return { expression: String(evaluated), unit: 'mm', evaluated };
}

type ProfileStep =
  | { kind: 'line'; r: number; z: number }
  | { kind: 'arc'; r: number; z: number; midR: number; midZ: number };

const line = (r: number, z: number): ProfileStep => ({ kind: 'line', r, z });

/** Revolve a closed (r, z) profile about +Z. */
function revolveProfile(start: [number, number], steps: readonly ProfileStep[]): OcctBackend {
  const commands: SketchCommand[] = [{ kind: 'moveTo', x: mm(start[0]), y: mm(start[1]) }];
  for (const s of steps) {
    if (s.kind === 'line') commands.push({ kind: 'lineTo', x: mm(s.r), y: mm(s.z) });
    else commands.push({ kind: 'threePointsArc', x: mm(s.r), y: mm(s.z), midX: mm(s.midR), midY: mm(s.midZ) });
  }
  commands.push({ kind: 'close' });
  return OcctBackend.revolveFromSketch(OcctBackend.fromSketchCommands(commands), 360);
}

/** Regular hexagon, across flats `s`, a flat facing +X (the orientation of
 *  every hex in the catalog). */
export function hexPoints(s: number): [number, number][] {
  const r = s / Math.sqrt(3);
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

/** Hex socket cutter: across flats `s`, full-hex depth `t` below `topZ`,
 *  ending in a 118° drill point. It rises above `topZ` so the cut opens
 *  cleanly through the face. */
function hexSocketTool(s: number, t: number, topZ: number): OcctBackend {
  const over = 0.5;
  const prism = OcctBackend.extrudePolygon(hexPoints(s), t + over).translate(0, 0, topZ - t);
  const rDrill = s / 2;
  const coneDepth = rDrill / Math.tan((59 * Math.PI) / 180);
  const bottom = topZ - t;
  const cone = revolveProfile([0, bottom - coneDepth], [line(rDrill, bottom), line(rDrill, bottom + 0.05), line(0, bottom + 0.05)]);
  return prism.union(cone);
}

/** Hex prism across flats `s` from z0 to z1 with the 30° chamfer cone on the
 *  top face (and the bottom face when `bottom`), meeting the face at Ø 0.95·s
 *  as ISO 4017 / ISO 4032 draw it. */
function chamferedHex(s: number, z0: number, z1: number, bottom: boolean): OcctBackend {
  const prism = OcctBackend.extrudePolygon(hexPoints(s), z1 - z0).translate(0, 0, z0);
  const outerR = s / Math.sqrt(3) + 0.2;
  const r0 = 0.475 * s;
  const drop = (outerR - r0) * Math.tan(Math.PI / 6);
  const top: ProfileStep[] = [line(outerR, z1 - drop), line(r0, z1), line(0, z1)];
  const crown = bottom
    ? revolveProfile([0, z0], [line(r0, z0), line(outerR, z0 + drop), ...top])
    : revolveProfile([0, z0], [line(outerR, z0), ...top]);
  return prism.intersect(crown);
}

/** Concave under-head fillet from the bearing face (z = 0) to the shank. */
function filletSteps(d: number, rf: number): ProfileStep[] {
  const c = Math.SQRT1_2;
  return [line(d / 2 + rf, 0), { kind: 'arc', r: d / 2, z: -rf, midR: d / 2 + rf - rf * c, midZ: -rf + rf * c }];
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

/** The transverse section of an external thread as sketch commands. */
function sectionSketch(info: IsoThreadInfo): OcctBackend {
  const commands: SketchCommand[] = [];
  for (const st of externalThreadSection(info, 0)) {
    if (st.kind === 'moveTo') commands.push({ kind: 'moveTo', x: mm(st.p[0]), y: mm(st.p[1]) });
    else if (st.kind === 'arc') {
      commands.push({ kind: 'threePointsArc', x: mm(st.to[0]), y: mm(st.to[1]), midX: mm(st.via[0]), midY: mm(st.via[1]) });
    } else {
      commands.push({
        kind: 'spline',
        points: st.points.map(([x, y]) => ({ x: mm(x), y: mm(y) })),
        startTangent: { x: mm(st.startTangent[0]), y: mm(st.startTangent[1]) },
        endTangent: { x: mm(st.endTangent[0]), y: mm(st.endTangent[1]) },
      });
    }
  }
  commands.push({ kind: 'close' });
  return OcctBackend.fromSketchCommands(commands);
}

/** Right-hand helical thread from z0 up to z1, square ends. */
function helicalThread(info: IsoThreadInfo, z0: number, z1: number): OcctBackend {
  return OcctBackend.sweepSketchAlongHelix(sectionSketch(info), {
    origin: [0, 0, z0],
    axis: [0, 0, 1],
    refDir: [1, 0, 0],
    normalDir: [0, 1, 0],
    radius: info.minorDiameter / 2,
    pitch: info.pitch,
    turns: (z1 - z0) / info.pitch,
    startAngle: 0,
    section: 'transverse',
  });
}

/** 45° ring cutter chamfering a thread end at `z` down to radius `innerR`.
 *  `up`: the material lies above z (a tip at the bottom). */
function endChamferRing(info: IsoThreadInfo, z: number, up: boolean, innerR: number): OcctBackend {
  const R = info.diameter / 2 + 0.5;
  const e = 0.1 * info.pitch;
  const reach = R - innerR;
  return up
    ? revolveProfile([innerR - e, z - e], [line(R, z - e), line(R, z + reach - e)])
    : revolveProfile([innerR - e, z + e], [line(R, z - reach + e), line(R, z + e)]);
}

/** Chamfer radius at the thread start: just below the thread root. */
function rootChamferRadius(info: IsoThreadInfo): number {
  return info.minorDiameter / 2 - 0.05 * info.pitch;
}

export function threadFormFor(part: ResolvedPart): ThreadForm {
  if (part.kind === 'nut') return part.iso ? 'helical' : 'none';
  if (part.kind !== 'screw' || !part.iso) return 'none';
  const turns = (part.iso.threadLengthMm ?? part.lengthMm) / part.iso.pitchMm;
  return turns > MAX_HELICAL_TURNS ? 'annular' : 'helical';
}

/** Basic ISO profile radius at axial offset `u` (mm) from a ridge centre. */
function basicProfileRadius(info: IsoThreadInfo, u: number): number {
  const P = info.pitch;
  const R = info.diameter / 2;
  const r = info.minorDiameter / 2;
  const s = Math.abs(((u % P) + 1.5 * P) % P - P / 2);
  const crest = P / 16;
  const root = (3 / 8) * P;
  if (s <= crest) return R;
  if (s >= root) return r;
  return R - ((s - crest) / (root - crest)) * (R - r);
}

/** Annular (revolved, non-helical) ISO thread from z0 to z1 with 45° end
 *  chamfers, for very long threads. Breakpoints of the profile are sampled
 *  exactly at the profile corners; the chamfer clips them. */
function annularThread(info: IsoThreadInfo, z0: number, z1: number): OcctBackend {
  const P = info.pitch;
  const rc = rootChamferRadius(info);
  const clip = (z: number, r: number) => Math.min(r, rc + (z - z0), rc + (z1 - z));
  const corners = [-(3 / 8) * P, -P / 16, P / 16, (3 / 8) * P];
  const steps: ProfileStep[] = [];
  const turns = Math.ceil((z1 - z0) / P) + 1;
  const zs: number[] = [];
  for (let k = 0; k <= turns; k++) for (const c of corners) zs.push(z0 + k * P + c);
  const inside = zs.filter((z) => z > z0 && z < z1);
  const pts: Array<[number, number]> = [[rc, z0]];
  for (const z of inside) pts.push([clip(z, basicProfileRadius(info, z - z0)), z]);
  pts.push([rc, z1]);
  for (const [r, z] of pts) steps.push(line(r, z));
  steps.push(line(0, z1));
  return revolveProfile([0, z0], steps);
}

// ---------------------------------------------------------------------------
// Screws
// ---------------------------------------------------------------------------

/** Plain-shank end (z of the thread's upper end). Partial-thread screws run
 *  plain shank down to b from the tip; full-thread screws keep a runout of
 *  ~1.5·P under the head (or under the countersunk cone). */
function threadTop(part: ResolvedPart, iso: FastenerIsoDims): number {
  if (part.family === 'set-screw' || part.family === 'threaded-rod') return 0;
  const L = part.lengthMm;
  const below = part.family === 'flat-head-countersunk' ? part.headHeightMm : 0;
  const runout = Math.min(1.5 * iso.pitchMm + (iso.underHeadFilletMm ?? 0), (L - below) / 3);
  return Math.min(-L + (iso.threadLengthMm ?? L), -below - runout);
}

/** Revolved head + plain shank down to `shankEnd`. */
function revolvedHead(part: ResolvedPart, iso: FastenerIsoDims, shankEnd: number): OcctBackend {
  const d = part.nominalMm;
  const rk = part.headDiameterMm / 2;
  const k = part.headHeightMm;
  const rf = Math.min(iso.underHeadFilletMm ?? 0.1, -shankEnd / 2);
  const shank: ProfileStep[] = [...filletSteps(d, rf), line(d / 2, shankEnd), line(0, shankEnd)];
  if (part.family === 'button-head-cap-screw') {
    // ISO 7380-1: spherical dome on a short cylindrical rim.
    const rim = 0.12 * k;
    const R = (rk * rk + (k - rim) ** 2) / (2 * (k - rim));
    const cz = k - R;
    const mid = (Math.PI / 2 + Math.atan2(rim - cz, rk)) / 2;
    return revolveProfile([0, k], [
      { kind: 'arc', r: rk, z: rim, midR: R * Math.cos(mid), midZ: cz + R * Math.sin(mid) },
      line(rk, 0),
      ...shank,
    ]);
  }
  if (part.family === 'flat-head-countersunk') {
    // ISO 10642: 90° cone, rim on the seat plane z = 0, nominal Ø at z = -k.
    return revolveProfile([0, 0], [line(rk, 0), line(d / 2, -k), line(d / 2, shankEnd), line(0, shankEnd)]);
  }
  // ISO 4762: cylindrical head, chamfered top edge, broken bearing edge.
  const ch = 0.06 * part.headDiameterMm;
  const eb = 0.03 * part.headDiameterMm;
  return revolveProfile([0, k], [line(rk - ch, k), line(rk, k - ch), line(rk, eb), line(rk - eb, 0), ...shank]);
}

/** ISO 4017 head: chamfered hex over a washer face, fillet into the shank. */
function hexHead(part: ResolvedPart, iso: FastenerIsoDims, shankEnd: number): OcctBackend {
  const d = part.nominalMm;
  const c = iso.washerFaceHeightMm ?? 0.5;
  const dw = iso.washerFaceDiameterMm ?? 0.9 * part.acrossFlatsMm;
  const rf = Math.min(iso.underHeadFilletMm ?? 0.2, -shankEnd / 2);
  const hex = chamferedHex(part.acrossFlatsMm, c - 0.01, part.headHeightMm, false);
  const body = revolveProfile([0, c], [line(dw / 2, c), line(dw / 2, 0), ...filletSteps(d, rf), line(d / 2, shankEnd), line(0, shankEnd)]);
  return hex.union(body);
}

function headWithSocket(part: ResolvedPart, iso: FastenerIsoDims, shankEnd: number): OcctBackend {
  if (part.family === 'hex-head-bolt') return hexHead(part, iso, shankEnd);
  const head = revolvedHead(part, iso, shankEnd);
  if (iso.socketAcrossFlatsMm === undefined || iso.socketDepthMm === undefined) return head;
  const top = part.family === 'flat-head-countersunk' ? 0 : part.headHeightMm;
  return head.subtract(hexSocketTool(iso.socketAcrossFlatsMm, iso.socketDepthMm, top));
}

interface ThreadCut {
  /** Chamfer the upper end too (headless parts). */
  chamferTop?: boolean;
  /** Bottom chamfer radius; a set screw's flat point. Default: thread root. */
  bottomR?: number;
  /** Further cutters taken in the same boolean (a set screw's socket). */
  tools?: OcctBackend[];
}

/** Threaded run from z0 to z1 in the part's thread form, chamfered at the
 *  bottom (and at the top when asked), all cutters in ONE boolean. */
function threadRun(part: ResolvedPart, info: IsoThreadInfo, z0: number, z1: number, extra: ThreadCut = {}): OcctBackend {
  if (threadFormFor(part) === 'annular') {
    const rod = annularThread(info, z0, z1);
    return extra.tools && extra.tools.length > 0 ? rod.subtract(extra.tools.reduce((a, b) => a.union(b))) : rod;
  }
  const rod = helicalThread(info, z0, z1);
  const cutters = [endChamferRing(info, z0, true, extra.bottomR ?? rootChamferRadius(info)), ...(extra.tools ?? [])];
  if (extra.chamferTop) cutters.push(endChamferRing(info, z1, false, rootChamferRadius(info)));
  return booleanUnsimplified(rod, 'cut', cutters);
}

/** ISO 4026 body. Cutting the hex socket straight into the threaded rod
 *  costs ~6-7 s: its planar faces are intersected against every helical
 *  face. Instead the rod takes a cylindrical pocket at the top chamfer's
 *  inner radius (cut in the same boolean as the end chamfers), and an
 *  analytic sleeve carrying the socket is glued back in. The sleeve only
 *  touches the rod on coincident faces, so the glue fuse skips face/face
 *  intersection: about half the time, same volume and surface. */
function setScrewFull(part: ResolvedPart, info: IsoThreadInfo, s: number, t: number, bottomR: number): OcctBackend {
  const L = part.lengthMm;
  const rPocket = rootChamferRadius(info);
  if (s / Math.sqrt(3) >= rPocket - 0.05) {
    return threadRun(part, info, -L, 0, { chamferTop: true, bottomR, tools: [hexSocketTool(s, t, 0)] });
  }
  const coneDepth = s / 2 / Math.tan((59 * Math.PI) / 180);
  const zb = Math.max(-t - coneDepth - 0.3, -0.8 * L);
  const pocket = OcctBackend.cylinder(0.5 - zb, rPocket).translate(0, 0, zb);
  const sleeve = OcctBackend.cylinder(-zb, rPocket).translate(0, 0, zb).subtract(hexSocketTool(s, t, 0));
  const rod = threadRun(part, info, -L, 0, { chamferTop: true, bottomR, tools: [pocket] });
  return booleanUnsimplified(rod, 'fuse', sleeve, { glue: true });
}

function screwFull(part: ResolvedPart, iso: FastenerIsoDims): OcctBackend {
  const info = isoThreadInfo(`M${part.nominalMm}x${iso.pitchMm}`);
  const L = part.lengthMm;
  if (part.family === 'threaded-rod') return threadRun(part, info, -L, 0, { chamferTop: true });
  if (part.family === 'set-screw') {
    // ISO 4026 flat point Ø dp at the tip; socket in the first end (z = 0).
    const s = iso.socketAcrossFlatsMm ?? 0.5 * part.nominalMm;
    const t = Math.min(iso.socketDepthMm ?? 0.5 * part.nominalMm, 0.6 * L);
    const bottomR = (iso.pointDiameterMm ?? info.minorDiameter) / 2;
    return setScrewFull(part, info, s, t, bottomR);
  }
  const z1 = threadTop(part, iso);
  const head = headWithSocket(part, iso, z1);
  return booleanUnsimplified(head, 'fuse', threadRun(part, info, -L, z1));
}

// ---------------------------------------------------------------------------
// Nuts and washers
// ---------------------------------------------------------------------------

/** ISO 4032 / DIN 985 body: hex chamfered on both faces, bored to the basic
 *  minor diameter D1 with a 120° countersink on both faces (da ≈ 1.08·d),
 *  then the ISO internal groove swept one pitch past each face. The groove's
 *  straight-sided root extension crosses the bore wall transversally, which
 *  keeps the cut a few seconds instead of the tens a coincident-root form
 *  costs. */
function nutFull(part: ResolvedPart, iso: FastenerIsoDims): OcctBackend {
  const d = part.nominalMm;
  const m = part.headHeightMm;
  const P = iso.pitchMm;
  const r1 = isoMinorRadius(d, P);
  const rc = 0.54 * d;
  const ov = 0.2;
  const t60 = Math.tan(Math.PI / 3);
  const dz = (rc - r1) / t60;
  const bore = revolveProfile([0, -ov], [
    line(rc + ov * t60, -ov), line(r1, dz), line(r1, m - dz), line(rc + ov * t60, m + ov), line(0, m + ov),
  ]);
  const body = chamferedHex(part.acrossFlatsMm, 0, m, true).subtract(bore);
  const groove = isoInternalGrooveProfile(d, P, 0);
  const sketch = OcctBackend.fromSketchCommands([
    { kind: 'moveTo', x: mm(groove[0][0]), y: mm(groove[0][1]) },
    ...groove.slice(1).map(([x, y]): SketchCommand => ({ kind: 'lineTo', x: mm(x), y: mm(y) })),
    { kind: 'close' },
  ]);
  const helix = OcctBackend.sweepSketchAlongHelix(sketch, {
    origin: [0, 0, -P], axis: [0, 0, 1], refDir: [1, 0, 0], normalDir: [0, 1, 0],
    radius: r1, pitch: P, turns: (m + 2 * P) / P, startAngle: 0,
  });
  return booleanUnsimplified(body, 'cut', helix);
}

/** DIN 127 B spring washer: the annulus with its split. */
function lockWasherFull(part: ResolvedPart): OcctBackend {
  const ring = washerEnvelope(part);
  const gap = Math.max(0.6 * part.headHeightMm, 0.4);
  const cut = OcctBackend.box(part.headDiameterMm, gap, part.headHeightMm + 1).translate(0, -gap / 2, -0.5);
  return ring.subtract(cut);
}

// ---------------------------------------------------------------------------
// Envelope (nominal) solids — the analysis bodies.
// ---------------------------------------------------------------------------

function screwEnvelope(part: ResolvedPart): OcctBackend {
  if (part.family === 'flat-head-countersunk') {
    return countersunkScrewSolid(part.nominalMm, part.headDiameterMm, part.headHeightMm, part.lengthMm);
  }
  if (part.family === 'hex-head-bolt') {
    return hexHeadBoltSolid(part.nominalMm, part.acrossFlatsMm, part.headHeightMm, part.lengthMm);
  }
  if (part.family === 'set-screw' || part.family === 'threaded-rod') {
    return headlessSolid(part.nominalMm, part.lengthMm);
  }
  const head = OcctBackend.cylinder(part.headHeightMm, part.headDiameterMm / 2);
  const shank = OcctBackend.cylinder(part.lengthMm, part.nominalMm / 2).translate(0, 0, -part.lengthMm);
  return head.union(shank);
}

function washerEnvelope(part: ResolvedPart): OcctBackend {
  const outer = OcctBackend.cylinder(part.headHeightMm, part.headDiameterMm / 2);
  const inner = OcctBackend.cylinder(part.headHeightMm, part.innerDiameterMm / 2);
  return outer.subtract(inner);
}

function nutEnvelope(part: ResolvedPart): OcctBackend {
  const prism = OcctBackend.extrudePolygon(hexPoints(part.acrossFlatsMm), part.headHeightMm);
  const bore = OcctBackend.cylinder(part.headHeightMm, part.nominalMm / 2);
  return prism.subtract(bore);
}

/** The nominal envelope of a catalog part — also its analysis body. */
export function envelopeSolid(part: ResolvedPart): OcctBackend {
  if (isFixtureKind(part.kind)) return fixtureSolid(part.kind, part.dims ?? {}, part.nominalMm);
  if (part.kind === 'washer') return washerEnvelope(part);
  if (part.kind === 'nut') return nutEnvelope(part);
  return screwEnvelope(part);
}

/** The display solid of a catalog part at `detail`. Parts with no finer
 *  form (fixtures, flat washers) are the same solid at both levels. */
export function fastenerSolid(part: ResolvedPart, detail: FastenerDetail): OcctBackend {
  if (detail === 'envelope' || isFixtureKind(part.kind)) return envelopeSolid(part);
  if (part.kind === 'washer') return part.family === 'lock-washer' ? lockWasherFull(part) : washerEnvelope(part);
  if (part.kind === 'nut') return part.iso ? nutFull(part, part.iso) : nutEnvelope(part);
  return part.iso ? screwFull(part, part.iso) : screwEnvelope(part);
}

// ---------------------------------------------------------------------------
// Build-once cache
// ---------------------------------------------------------------------------

const MAX_CACHED = 64;
const solidCache = new Map<string, OcctBackend>();

/** {@link fastenerSolid}, built once per (part id, detail) and handed out as
 *  copies: eight identical bolts cost one thread sweep. The cache holds the
 *  most recent MAX_CACHED solids. */
export function cachedFastenerSolid(part: ResolvedPart, detail: FastenerDetail): OcctBackend {
  const key = `${part.id}|${detail}`;
  let solid = solidCache.get(key);
  if (solid === undefined) {
    solid = fastenerSolid(part, detail);
    if (solidCache.size >= MAX_CACHED) {
      const oldest = solidCache.keys().next().value as string;
      solidCache.get(oldest)?.dispose();
      solidCache.delete(oldest);
    }
    solidCache.set(key, solid);
  } else {
    solidCache.delete(key);
    solidCache.set(key, solid);
  }
  return solid.clone();
}

/** Test seam: drop every cached solid. */
export function clearFastenerSolidCache(): void {
  for (const solid of solidCache.values()) solid.dispose();
  solidCache.clear();
}
