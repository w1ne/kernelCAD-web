// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/generateSeedCatalog.ts
//
// Build-time generator for the bundled parts catalog. Emits one STEP file
// and one connector-manifest sidecar per record into <outDir>/<family>/,
// plus a top-level index.json and a sha256 manifest.
//
// Primitive families are MIT. Imported community families retain their own
// geometry licenses and provenance (see assets/reference-parts).

import { sg90Families } from './sg90Catalog';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { OcctBackend, initOcct } from '../src/kernel/backends/occt/occtBackend';
import { countersunkScrewSolid, headlessSolid, hexHeadBoltSolid } from '../src/modeling/parts/headSolids';
import type { PartRecord } from '../src/shared/parts/types';
import type {
  ConnectorEntry,
  ConnectorManifest,
} from '../src/shared/parts/connectorManifest';
import {
  BHCS_HEAD,
  BHCS_LENGTHS,
  FLATHEAD_HEAD,
  FLATHEAD_LENGTHS,
  FLAT_WASHER,
  HEX_BOLT_HEAD,
  HEX_BOLT_LENGTHS,
  HEX_NUT,
  LOCK_NUT,
  LOCK_WASHER,
  ROD_LENGTHS,
  SET_SCREW_LENGTHS,
  SHCS_HEAD,
  SHCS_LENGTHS,
  FIXTURE_FAMILY_NAMES,
  fixtureVariants,
  isFixtureKind,
  resolvePart,
} from '../src/modeling/parts/familyTable';
import { fixtureSolid } from '../src/modeling/parts/fixtureSolids';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SeedFamily {
  id: string;
  category: string;
  standard?: string;
  variants: ReadonlyArray<Record<string, string | number>>;
  generate(args: Record<string, string | number>): Promise<{
    stepBytes: Uint8Array;
    record: Omit<PartRecord, 'sha256' | 'source'>;
    connectors: ConnectorEntry[];
  }>;
}

export interface GenerateOpts {
  outDir: string;
  /** When true, skip STEP byte emission (records + manifests only). For tests. */
  skipStep?: boolean;
}

export interface GenerateResult {
  records: PartRecord[];
  manifests: ConnectorManifest[];
}

// -----------------------------------------------------------------------------
// Helpers — geometry shorthand
// -----------------------------------------------------------------------------

function threadSlug(t: string): string {
  return t.toLowerCase().replace('.', '-');
}

const HEATSET_INSERT: Record<
  string,
  { Dout: number; lengths: number[] }
> = {
  M2_5: { Dout: 3.8, lengths: [3.8, 5.7] },
  M3: { Dout: 4.5, lengths: [3.8, 5.7] },
  M4: { Dout: 5.5, lengths: [3.8, 5.7] },
};

// Deep-groove ball-bearing dims (ISO 15) — d=bore, D=OD, B=width.
const BEARING: Record<string, { d: number; D: number; B: number }> = {
  '608': { d: 8, D: 22, B: 7 },
  '623': { d: 3, D: 10, B: 4 },
  '624': { d: 4, D: 13, B: 5 },
  '625': { d: 5, D: 16, B: 5 },
  '626': { d: 6, D: 19, B: 6 },
  '6800': { d: 10, D: 19, B: 5 },
  '688': { d: 8, D: 16, B: 5 },
  '6900': { d: 10, D: 22, B: 6 },
};

// NEMA stepper motor body envelope (square body × length, mounting holes).
// Frame is the across-flat width; bolt-circle dimensions match standard.
const NEMA: Record<
  string,
  { frame: number; length: number; boltSpacingMm: number; boltSizeMm: number; shaftDia: number; shaftLen: number }
> = {
  '8': { frame: 20.4, length: 28, boltSpacingMm: 16, boltSizeMm: 2.5, shaftDia: 4, shaftLen: 14 },
  '11': { frame: 28.2, length: 32, boltSpacingMm: 23, boltSizeMm: 2.5, shaftDia: 5, shaftLen: 18 },
  '14': { frame: 35.2, length: 36, boltSpacingMm: 26, boltSizeMm: 3, shaftDia: 5, shaftLen: 22 },
  '17': { frame: 42.3, length: 40, boltSpacingMm: 31, boltSizeMm: 3, shaftDia: 5, shaftLen: 24 },
  '23': { frame: 56.4, length: 56, boltSpacingMm: 47.14, boltSizeMm: 5, shaftDia: 6.35, shaftLen: 21 },
};

// Pin-header pitch and post height.
const HEADER_254 = { pitch: 2.54, postHeight: 11.5, postWidth: 0.64, baseHeight: 2.54 };
const HEADER_127 = { pitch: 1.27, postHeight: 6.0, postWidth: 0.4, baseHeight: 1.5 };

// JST-XH housing dims (1 row, 2.5 mm pitch).
const JST_XH = { pitch: 2.5, depth: 6.0, height: 8.6, baseHeight: 1.5 };

function fastenerStep(
  thread: string,
  lengthMm: number,
  head: { D: number; K: number },
  countersunk = false,
): Promise<{ bytes: Uint8Array; tNum: number; headD: number; headK: number }> {
  const tNum = parseFloat(thread.slice(1));
  const headD = head.D;
  const headK = head.K;
  // Cylindrical heads sit on the seat plane (Z=0..K). A countersunk head seats
  // in its cone: rim on Z=0, cone down to the nominal Ø at Z=-K.
  const fused = countersunk
    ? countersunkScrewSolid(tNum, headD, headK, lengthMm)
    : OcctBackend.cylinder(headK, headD / 2).union(
        OcctBackend.cylinder(lengthMm, tNum / 2).translate(0, 0, -lengthMm),
      );
  return fused.exportSTEPAsync().then((bytes) => ({ bytes, tNum, headD, headK }));
}

function washerStep(
  thread: string,
  dims: { Dout: number; Din: number; t: number },
): Promise<Uint8Array> {
  const outer = OcctBackend.cylinder(dims.t, dims.Dout / 2);
  const inner = OcctBackend.cylinder(dims.t, dims.Din / 2);
  return outer.subtract(inner).exportSTEPAsync();
}

function bearingStep(dims: {
  d: number;
  D: number;
  B: number;
}): Promise<Uint8Array> {
  const outer = OcctBackend.cylinder(dims.B, dims.D / 2);
  const inner = OcctBackend.cylinder(dims.B, dims.d / 2);
  return outer.subtract(inner).exportSTEPAsync();
}

async function hexNutStep(
  thread: string,
  dims: { S: number; m: number },
): Promise<Uint8Array> {
  const tNum = parseFloat(thread.slice(1));
  // Hex prism via extrudePolygon. The vertices start at 30 degrees so a FLAT
  // faces +X, the same orientation the in-memory envelope builds (nutSolid);
  // both doors must produce the same solid.
  const r = dims.S / Math.sqrt(3);
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const prism = OcctBackend.extrudePolygon(pts, dims.m);
  const bore = OcctBackend.cylinder(dims.m, tNum / 2);
  return prism.subtract(bore).exportSTEPAsync();
}

async function lockNutStep(
  thread: string,
  dims: { S: number; m: number },
): Promise<Uint8Array> {
  return hexNutStep(thread, dims);
}

async function heatsetInsertStep(args: {
  Dout: number;
  lengthMm: number;
  thread: string;
}): Promise<Uint8Array> {
  const tNum = parseFloat(args.thread.slice(1));
  const outer = OcctBackend.cylinder(args.lengthMm, args.Dout / 2);
  const bore = OcctBackend.cylinder(args.lengthMm, tNum / 2);
  return outer.subtract(bore).exportSTEPAsync();
}

async function linearShaftStep(args: {
  dia: number;
  length: number;
}): Promise<Uint8Array> {
  const shaft = OcctBackend.cylinder(args.length, args.dia / 2);
  return shaft.exportSTEPAsync();
}

// Spur-gear envelope. Like the bearing/NEMA records, this is fit-and-clearance
// geometry, not a manufacturing-accurate involute: a toothed prism (trapezoidal
// teeth around the pitch circle) bored down the axis. Standard 20° proportions —
// pitch d = m·z, addendum = m, dedendum = 1.25·m. Teeth occupy ~50% of the
// circular pitch, narrowing tip→root so the profile reads as a gear and meshes
// at the correct centre distance (rp1 + rp2).
async function spurGearStep(args: {
  module: number;
  teeth: number;
  faceWidth: number;
  boreDia: number;
}): Promise<Uint8Array> {
  const rp = (args.module * args.teeth) / 2; // pitch radius
  const ra = rp + args.module; // addendum (outer) radius
  const rf = rp - 1.25 * args.module; // root radius
  const pa = (2 * Math.PI) / args.teeth; // angular pitch
  const tipHalf = 0.16 * pa; // tooth half-width at the tip
  const rootHalf = 0.3 * pa; // tooth half-width at the root
  const pts: [number, number][] = [];
  const polar = (r: number, a: number): [number, number] => [
    r * Math.cos(a),
    r * Math.sin(a),
  ];
  for (let i = 0; i < args.teeth; i++) {
    const c = i * pa;
    pts.push(polar(rf, c - rootHalf)); // root, leading flank
    pts.push(polar(ra, c - tipHalf)); // tip, leading
    pts.push(polar(ra, c + tipHalf)); // tip, trailing
    pts.push(polar(rf, c + rootHalf)); // root, trailing flank
    pts.push(polar(rf, c + pa / 2)); // root land in the gap to the next tooth
  }
  const blank = OcctBackend.extrudePolygon(pts, args.faceWidth);
  const bore = OcctBackend.cylinder(args.faceWidth, args.boreDia / 2);
  return blank.subtract(bore).exportSTEPAsync();
}

async function stepperMotorStep(args: {
  frame: number;
  length: number;
  boltSpacingMm: number;
  boltSizeMm: number;
  shaftDia: number;
  shaftLen: number;
}): Promise<Uint8Array> {
  // Body: square prism centered on XY, extruded from Z=0 to Z=length.
  let body = OcctBackend.extrudeRect(args.frame, args.frame, args.length);
  // Cut 4 mounting holes — pattern at (±s/2, ±s/2) on top face (Z=length).
  const s = args.boltSpacingMm / 2;
  const holeR = args.boltSizeMm / 2;
  // Drill through-holes the full motor length so bolts can pass.
  for (const dx of [-1, 1]) {
    for (const dy of [-1, 1]) {
      const hole = OcctBackend.cylinder(args.length, holeR).translate(dx * s, dy * s, 0);
      body = body.subtract(hole);
    }
  }
  // Output shaft on +Z.
  const shaft = OcctBackend.cylinder(args.shaftLen, args.shaftDia / 2).translate(0, 0, args.length);
  return body.union(shaft).exportSTEPAsync();
}

async function pinHeaderStep(args: {
  pins: number;
  pitch: number;
  postHeight: number;
  postWidth: number;
  baseHeight: number;
}): Promise<Uint8Array> {
  // Plastic base — flat rectangular bar.
  const baseLen = args.pins * args.pitch;
  const baseW = args.pitch;
  let assembly = OcctBackend.extrudeRect(baseLen, baseW, args.baseHeight);
  // Pin posts — square cross-section, post on each pin position.
  for (let i = 0; i < args.pins; i++) {
    const x = (i - (args.pins - 1) / 2) * args.pitch;
    const post = OcctBackend.extrudeRect(
      args.postWidth,
      args.postWidth,
      args.postHeight,
    ).translate(x, 0, args.baseHeight);
    assembly = assembly.union(post);
  }
  return assembly.exportSTEPAsync();
}

async function jstXhStep(args: {
  pins: number;
}): Promise<Uint8Array> {
  const baseLen = args.pins * JST_XH.pitch + 2;
  const housing = OcctBackend.extrudeRect(baseLen, JST_XH.depth, JST_XH.height);
  return housing.exportSTEPAsync();
}

// -----------------------------------------------------------------------------
// Family definitions
// -----------------------------------------------------------------------------

function fixtureSeedFamily(family: string): SeedFamily {
  return {
    id: family,
    category: 'fixture',
    variants: fixtureVariants(family),
    async generate(variant) {
      const part = resolvePart({
        family,
        thread: String(variant.thread),
        ...(variant.lengthMm !== undefined ? { lengthMm: Number(variant.lengthMm) } : {}),
      });
      if (!isFixtureKind(part.kind)) throw new Error(`${family}: not a fixture family`);
      const backend = fixtureSolid(part.kind, part.dims ?? {}, part.nominalMm);
      const bytes = await backend.exportSTEPAsync();
      return {
        stepBytes: bytes,
        record: {
          id: part.id,
          name: part.name,
          category: 'fixture',
          family,
          tags: part.tags,
          attributes: {
            thread: part.thread,
            nominalMm: part.nominalMm,
            ...(part.lengthMm > 0 ? { lengthMm: part.lengthMm } : {}),
            ...(part.dims ?? {}),
          },
          license: 'MIT',
          connectors: part.connectors.map((connector) => connector.name),
        },
        connectors: part.connectors,
      };
    },
  };
}

/** Stocked threads of one table, with '_' decimal keys turned back into '.'. */
function threadsOf(table: Record<string, unknown>): string[] {
  return Object.keys(table).map((key) => key.replace('_', '.'));
}

/** Stocked lengths of one thread, or none. */
function lengthsOf(table: Record<string, readonly number[]>, thread: string): readonly number[] {
  return table[thread.replace('.', '_')] ?? [];
}

/** One variant per (thread, stocked length). */
function threadLengthVariants(
  threads: string[],
  lengths: Record<string, readonly number[]>,
): Array<{ thread: string; lengthMm: number }> {
  return threads.flatMap((thread) =>
    lengthsOf(lengths, thread).map((lengthMm) => ({ thread, lengthMm })),
  );
}

function socketHeadCapScrew(): SeedFamily {
  const threads = threadsOf(SHCS_HEAD);
  const variants = threadLengthVariants(threads, SHCS_LENGTHS);
  return {
    id: 'socket-head-cap-screw',
    category: 'fastener',
    standard: 'ISO 4762',
    variants,
    async generate({ thread, lengthMm }) {
      const head = SHCS_HEAD[(thread as string).replace('.', '_')];
      const { bytes, tNum, headD, headK } = await fastenerStep(
        thread as string,
        lengthMm as number,
        head,
      );
      const id = `iso-4762-${threadSlug(thread as string)}x${lengthMm}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} × ${lengthMm} socket head cap screw (ISO 4762)`,
          category: 'fastener',
          family: 'socket-head-cap-screw',
          standard: 'ISO 4762',
          tags: ['screw', 'shcs', 'metric', 'DIN 912', String(thread)],
          attributes: {
            thread: String(thread),
            lengthMm: Number(lengthMm),
            headDiameterMm: headD,
            headHeightMm: headK,
            shankDiameterMm: tNum,
          },
          license: 'MIT',
          connectors: ['head-bearing', 'thread-tip', 'head-top'],
        },
        connectors: [
          { name: 'head-bearing', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'thread-tip', type: 'axis', origin: [0, 0, -Number(lengthMm)], axis: [0, 0, 1] },
          { name: 'head-top', type: 'frame', origin: [0, 0, headK], normal: [0, 0, 1] },
        ],
      };
    },
  };
}

function buttonHeadCapScrew(): SeedFamily {
  const threads = threadsOf(BHCS_HEAD);
  const variants = threadLengthVariants(threads, BHCS_LENGTHS);
  return {
    id: 'button-head-cap-screw',
    category: 'fastener',
    standard: 'ISO 7380',
    variants,
    async generate({ thread, lengthMm }) {
      const head = BHCS_HEAD[thread as string];
      const { bytes, headD, headK } = await fastenerStep(
        thread as string,
        lengthMm as number,
        head,
      );
      const id = `iso-7380-${threadSlug(thread as string)}x${lengthMm}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} × ${lengthMm} button head cap screw (ISO 7380)`,
          category: 'fastener',
          family: 'button-head-cap-screw',
          standard: 'ISO 7380',
          tags: ['screw', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            lengthMm: Number(lengthMm),
            headDiameterMm: headD,
            headHeightMm: headK,
          },
          license: 'MIT',
          connectors: ['head-bearing', 'thread-tip', 'head-top'],
        },
        connectors: [
          { name: 'head-bearing', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'thread-tip', type: 'axis', origin: [0, 0, -Number(lengthMm)], axis: [0, 0, 1] },
          { name: 'head-top', type: 'frame', origin: [0, 0, headK], normal: [0, 0, 1] },
        ],
      };
    },
  };
}

function flatHeadCountersunk(): SeedFamily {
  const threads = threadsOf(FLATHEAD_HEAD);
  const variants = threadLengthVariants(threads, FLATHEAD_LENGTHS);
  return {
    id: 'flat-head-countersunk',
    category: 'fastener',
    standard: 'ISO 10642',
    variants,
    async generate({ thread, lengthMm }) {
      const head = FLATHEAD_HEAD[thread as string];
      const { bytes, headD, headK } = await fastenerStep(
        thread as string,
        lengthMm as number,
        head,
        true,
      );
      const id = `iso-10642-${threadSlug(thread as string)}x${lengthMm}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} × ${lengthMm} flat-head countersunk (ISO 10642)`,
          category: 'fastener',
          family: 'flat-head-countersunk',
          standard: 'ISO 10642',
          tags: ['screw', 'countersunk', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            lengthMm: Number(lengthMm),
            headDiameterMm: headD,
            headHeightMm: headK,
          },
          license: 'MIT',
          connectors: ['mating-face', 'thread-tip'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'thread-tip', type: 'axis', origin: [0, 0, -Number(lengthMm)], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function hexNut(): SeedFamily {
  const threads = threadsOf(HEX_NUT);
  const variants = threads.map((t) => ({ thread: t }));
  return {
    id: 'hex-nut',
    category: 'fastener',
    standard: 'ISO 4032',
    variants,
    async generate({ thread }) {
      const dims = HEX_NUT[(thread as string).replace('.', '_')];
      const bytes = await hexNutStep(thread as string, dims);
      const id = `iso-4032-${threadSlug(thread as string)}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} hex nut (ISO 4032)`,
          category: 'fastener',
          family: 'hex-nut',
          standard: 'ISO 4032',
          tags: ['nut', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            acrossFlatsMm: dims.S,
            heightMm: dims.m,
          },
          license: 'MIT',
          connectors: ['mating-face', 'inner-bore', 'top-face'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'top-face', type: 'frame', origin: [0, 0, dims.m], normal: [0, 0, 1] },
          { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function lockNut(): SeedFamily {
  const threads = threadsOf(LOCK_NUT);
  const variants = threads.map((t) => ({ thread: t }));
  return {
    id: 'lock-nut',
    category: 'fastener',
    standard: 'DIN 985',
    variants,
    async generate({ thread }) {
      const dims = LOCK_NUT[(thread as string).replace('.', '_')];
      const bytes = await lockNutStep(thread as string, dims);
      const id = `din-985-${threadSlug(thread as string)}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} lock nut (DIN 985)`,
          category: 'fastener',
          family: 'lock-nut',
          standard: 'DIN 985',
          tags: ['nut', 'lock', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            acrossFlatsMm: dims.S,
            heightMm: dims.m,
          },
          license: 'MIT',
          connectors: ['mating-face', 'inner-bore', 'top-face'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'top-face', type: 'frame', origin: [0, 0, dims.m], normal: [0, 0, 1] },
          { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function flatWasher(): SeedFamily {
  const threads = threadsOf(FLAT_WASHER);
  const variants = threads.map((t) => ({ thread: t }));
  return {
    id: 'flat-washer',
    category: 'fastener',
    standard: 'ISO 7089',
    variants,
    async generate({ thread }) {
      const dims = FLAT_WASHER[(thread as string).replace('.', '_')];
      const bytes = await washerStep(thread as string, dims);
      const id = `iso-7089-${threadSlug(thread as string)}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} flat washer (ISO 7089)`,
          category: 'fastener',
          family: 'flat-washer',
          standard: 'ISO 7089',
          tags: ['washer', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            outerDiameterMm: dims.Dout,
            innerDiameterMm: dims.Din,
            thicknessMm: dims.t,
          },
          license: 'MIT',
          connectors: ['mating-face', 'inner-bore', 'top-face'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'top-face', type: 'frame', origin: [0, 0, dims.t], normal: [0, 0, 1] },
          { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function lockWasher(): SeedFamily {
  const threads = threadsOf(LOCK_WASHER);
  const variants = threads.map((t) => ({ thread: t }));
  return {
    id: 'lock-washer',
    category: 'fastener',
    standard: 'DIN 127B',
    variants,
    async generate({ thread }) {
      const dims = LOCK_WASHER[(thread as string).replace('.', '_')];
      const bytes = await washerStep(thread as string, dims);
      const id = `din-127b-${threadSlug(thread as string)}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} lock washer (DIN 127B)`,
          category: 'fastener',
          family: 'lock-washer',
          standard: 'DIN 127B',
          tags: ['washer', 'lock', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            outerDiameterMm: dims.Dout,
            innerDiameterMm: dims.Din,
            thicknessMm: dims.t,
          },
          license: 'MIT',
          connectors: ['mating-face', 'inner-bore', 'top-face'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'top-face', type: 'frame', origin: [0, 0, dims.t], normal: [0, 0, 1] },
          { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function heatSetInsert(): SeedFamily {
  const variants: Array<Record<string, string | number>> = [];
  for (const [thread, def] of Object.entries(HEATSET_INSERT)) {
    for (const length of def.lengths) {
      variants.push({ thread: thread.replace('_', '.'), lengthMm: length });
    }
  }
  return {
    id: 'heat-set-insert',
    category: 'fastener',
    variants,
    async generate({ thread, lengthMm }) {
      const def = HEATSET_INSERT[(thread as string).replace('.', '_')];
      const bytes = await heatsetInsertStep({
        Dout: def.Dout,
        lengthMm: lengthMm as number,
        thread: thread as string,
      });
      const id = `heatset-${threadSlug(thread as string)}-l${String(lengthMm).replace('.', '-')}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} heat-set insert L${lengthMm}`,
          category: 'fastener',
          family: 'heat-set-insert',
          tags: ['insert', 'heatset', 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            lengthMm: Number(lengthMm),
            outerDiameterMm: def.Dout,
          },
          license: 'MIT',
          connectors: ['mating-face', 'inner-bore', 'top-face'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'top-face', type: 'frame', origin: [0, 0, Number(lengthMm)], normal: [0, 0, 1] },
          { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function deepGrooveBallBearing(): SeedFamily {
  const sizes = Object.keys(BEARING);
  const variants = sizes.map((s) => ({ size: s }));
  return {
    id: 'deep-groove-ball-bearing',
    category: 'bearing',
    standard: 'ISO 15',
    variants,
    async generate({ size }) {
      const dims = BEARING[size as string];
      const bytes = await bearingStep(dims);
      const id = `bearing-${size}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${size} deep-groove ball bearing`,
          category: 'bearing',
          family: 'deep-groove-ball-bearing',
          standard: 'ISO 15',
          tags: ['bearing', 'ball', String(size)],
          attributes: {
            boreMm: dims.d,
            outerDiameterMm: dims.D,
            widthMm: dims.B,
          },
          license: 'MIT',
          connectors: ['inner-bore', 'outer-face', 'mating-face', 'top-face'],
        },
        connectors: [
          { name: 'inner-bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
          { name: 'outer-face', type: 'frame', origin: [0, 0, dims.B / 2], normal: [1, 0, 0] },
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'top-face', type: 'frame', origin: [0, 0, dims.B], normal: [0, 0, 1] },
        ],
      };
    },
  };
}

function linearShaft(): SeedFamily {
  const diameters = [3, 4, 5, 6, 8, 10, 12];
  const lengths = [20, 30, 50, 75, 100, 150, 200];
  const variants: Array<Record<string, string | number>> = [];
  for (const d of diameters) {
    for (const l of lengths) {
      variants.push({ dia: d, length: l });
    }
  }
  return {
    id: 'linear-shaft',
    category: 'shaft',
    variants,
    async generate({ dia, length }) {
      const bytes = await linearShaftStep({ dia: dia as number, length: length as number });
      const id = `shaft-d${dia}-l${length}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `Linear shaft Ø${dia} × ${length} mm`,
          category: 'shaft',
          family: 'linear-shaft',
          tags: ['shaft', 'linear', `d${dia}`],
          attributes: {
            diameterMm: Number(dia),
            lengthMm: Number(length),
          },
          license: 'MIT',
          connectors: ['end-a', 'end-b', 'axis'],
        },
        connectors: [
          { name: 'end-a', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'end-b', type: 'frame', origin: [0, 0, Number(length)], normal: [0, 0, 1] },
          { name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

function spurGear(): SeedFamily {
  // Module → (face width, bore) so each gear lands on a shaft you already stock
  // (linear-shaft Ø5 / Ø6 are bundled). Teeth span the common small-mechanism range.
  const byModule: Record<number, { faceWidth: number; boreDia: number }> = {
    1: { faceWidth: 6, boreDia: 5 },
    2: { faceWidth: 10, boreDia: 6 },
  };
  const teeth = [12, 16, 20, 24, 30, 40];
  const variants: Array<Record<string, string | number>> = [];
  for (const module of Object.keys(byModule).map(Number)) {
    for (const z of teeth) variants.push({ module, teeth: z });
  }
  return {
    id: 'spur-gear',
    category: 'gear',
    variants,
    async generate({ module, teeth: z }) {
      const m = module as number;
      const teethN = z as number;
      const { faceWidth, boreDia } = byModule[m];
      const bytes = await spurGearStep({ module: m, teeth: teethN, faceWidth, boreDia });
      const id = `spur-gear-m${m}-z${teethN}`;
      const pitchDia = m * teethN;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `Spur gear module ${m}, ${teethN} teeth`,
          category: 'gear',
          family: 'spur-gear',
          tags: ['gear', 'spur', 'mechanism', `m${m}`, `z${teethN}`],
          attributes: {
            module: m,
            teeth: teethN,
            pitchDiameterMm: pitchDia,
            outerDiameterMm: pitchDia + 2 * m,
            boreMm: boreDia,
            faceWidthMm: faceWidth,
            pressureAngleDeg: 20,
          },
          license: 'MIT',
          connectors: ['bore', 'front-face', 'back-face'],
        },
        connectors: [
          { name: 'bore', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
          { name: 'front-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'back-face', type: 'frame', origin: [0, 0, faceWidth], normal: [0, 0, 1] },
        ],
      };
    },
  };
}

function stepperMotor(): SeedFamily {
  const sizes = Object.keys(NEMA);
  const variants = sizes.map((s) => ({ size: s }));
  return {
    id: 'stepper-motor',
    category: 'motor',
    variants,
    async generate({ size }) {
      const dims = NEMA[size as string];
      const bytes = await stepperMotorStep(dims);
      const id = `nema-${size}`;
      const sHalf = dims.boltSpacingMm / 2;
      const connectors: ConnectorEntry[] = [
        { name: 'mounting-face', type: 'frame', origin: [0, 0, dims.length], normal: [0, 0, 1] },
        { name: 'output-shaft', type: 'axis', origin: [0, 0, dims.length], axis: [0, 0, 1] },
        { name: 'back-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
        { name: 'bolt-holes-1', type: 'frame', origin: [-sHalf, -sHalf, dims.length], normal: [0, 0, 1] },
        { name: 'bolt-holes-2', type: 'frame', origin: [sHalf, -sHalf, dims.length], normal: [0, 0, 1] },
        { name: 'bolt-holes-3', type: 'frame', origin: [-sHalf, sHalf, dims.length], normal: [0, 0, 1] },
        { name: 'bolt-holes-4', type: 'frame', origin: [sHalf, sHalf, dims.length], normal: [0, 0, 1] },
      ];
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `NEMA ${size} stepper motor`,
          category: 'motor',
          family: 'stepper-motor',
          tags: ['motor', 'stepper', `nema${size}`],
          attributes: {
            frameMm: dims.frame,
            lengthMm: dims.length,
            boltSpacingMm: dims.boltSpacingMm,
            boltSizeMm: dims.boltSizeMm,
            shaftDiameterMm: dims.shaftDia,
            shaftLengthMm: dims.shaftLen,
          },
          license: 'MIT',
          connectors: connectors.map((c) => c.name),
        },
        connectors,
      };
    },
  };
}

function pinHeader(): SeedFamily {
  const counts = [2, 4, 6, 8, 10, 20];
  const variants: Array<Record<string, string | number>> = [];
  for (const p of counts) {
    variants.push({ pitch: 2.54, pins: p, angle: 'straight' });
    variants.push({ pitch: 2.54, pins: p, angle: 'right' });
    variants.push({ pitch: 1.27, pins: p, angle: 'straight' });
  }
  return {
    id: 'pin-header',
    category: 'connector',
    variants,
    async generate({ pitch, pins, angle }) {
      const conf = (pitch as number) === 2.54 ? HEADER_254 : HEADER_127;
      const bytes = await pinHeaderStep({
        pins: pins as number,
        pitch: conf.pitch,
        postHeight: conf.postHeight,
        postWidth: conf.postWidth,
        baseHeight: conf.baseHeight,
      });
      const pitchSlug = String(pitch).replace('.', '');
      const id =
        pitchSlug === '254'
          ? `pin-header-254-${pins}p${angle === 'right' ? '-ra' : ''}`
          : `pin-header-127-${pins}p`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${pitch} mm pin header ${pins}-pin${angle === 'right' ? ' (right-angle)' : ''}`,
          category: 'connector',
          family: 'pin-header',
          tags: ['header', 'connector', `${pitch}mm`, `${pins}p`],
          attributes: {
            pitchMm: Number(pitch),
            pins: Number(pins),
            angle: String(angle),
          },
          license: 'MIT',
          connectors: ['mating-face', 'pin-1'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          {
            name: 'pin-1',
            type: 'frame',
            origin: [-((pins as number) - 1) / 2 * conf.pitch, 0, conf.baseHeight + conf.postHeight],
            normal: [0, 0, 1],
          },
        ],
      };
    },
  };
}

function jstXh(): SeedFamily {
  const variants = [2, 3, 4, 5, 6].map((p) => ({ pins: p }));
  return {
    id: 'jst-xh',
    category: 'connector',
    variants,
    async generate({ pins }) {
      const bytes = await jstXhStep({ pins: pins as number });
      const id = `jst-xh-${pins}p`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `JST-XH ${pins}-pin connector housing`,
          category: 'connector',
          family: 'jst-xh',
          tags: ['connector', 'jst', `${pins}p`],
          attributes: {
            pitchMm: JST_XH.pitch,
            pins: Number(pins),
          },
          license: 'MIT',
          connectors: ['mating-face', 'back-face'],
        },
        connectors: [
          { name: 'mating-face', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'back-face', type: 'frame', origin: [0, 0, JST_XH.height], normal: [0, 0, 1] },
        ],
      };
    },
  };
}


function hexHeadBolt(): SeedFamily {
  const threads = threadsOf(HEX_BOLT_HEAD);
  const variants = threadLengthVariants(threads, HEX_BOLT_LENGTHS);
  return {
    id: 'hex-head-bolt',
    category: 'fastener',
    standard: 'ISO 4017',
    variants,
    async generate({ thread, lengthMm }) {
      const head = HEX_BOLT_HEAD[(thread as string).replace('.', '_')];
      const tNum = parseFloat(String(thread).slice(1));
      const fused = hexHeadBoltSolid(tNum, head.S, head.K, Number(lengthMm));
      const bytes = await fused.exportSTEPAsync();
      const id = `iso-4017-${threadSlug(String(thread))}x${lengthMm}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} × ${lengthMm} hex head bolt (ISO 4017)`,
          category: 'fastener',
          family: 'hex-head-bolt',
          standard: 'ISO 4017',
          tags: ['bolt', 'hex', 'metric', 'DIN 933', String(thread)],
          attributes: {
            thread: String(thread),
            lengthMm: Number(lengthMm),
            headDiameterMm: head.D,
            acrossFlatsMm: head.S,
            headHeightMm: head.K,
            shankDiameterMm: tNum,
          },
          license: 'MIT',
          connectors: ['head-bearing', 'thread-tip', 'head-top'],
        },
        connectors: [
          { name: 'head-bearing', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'thread-tip', type: 'axis', origin: [0, 0, -Number(lengthMm)], axis: [0, 0, 1] },
          { name: 'head-top', type: 'frame', origin: [0, 0, head.K], normal: [0, 0, 1] },
        ],
      };
    },
  };
}

/** Headless families: set screws (ISO 4026) and threaded rod (DIN 975) share
 *  the same cylinder envelope and their two ends as connectors. */
function headlessFamily(args: {
  family: 'set-screw' | 'threaded-rod';
  standard: string;
  idPrefix: string;
  label: string;
  lengths: Record<string, readonly number[]>;
  tags: string[];
}): SeedFamily {
  const threads = threadsOf(args.lengths);
  const variants = threadLengthVariants(threads, args.lengths);
  return {
    id: args.family,
    category: 'fastener',
    standard: args.standard,
    variants,
    async generate({ thread, lengthMm }) {
      const tNum = parseFloat(String(thread).slice(1));
      const bytes = await headlessSolid(tNum, Number(lengthMm)).exportSTEPAsync();
      const id = `${args.idPrefix}-${threadSlug(String(thread))}x${lengthMm}`;
      return {
        stepBytes: bytes,
        record: {
          id,
          name: `${thread} × ${lengthMm} ${args.label} (${args.standard})`,
          category: 'fastener',
          family: args.family,
          standard: args.standard,
          tags: [...args.tags, 'metric', String(thread)],
          attributes: {
            thread: String(thread),
            lengthMm: Number(lengthMm),
            shankDiameterMm: tNum,
          },
          license: 'MIT',
          connectors: ['first-end', 'second-end', 'axis'],
        },
        connectors: [
          { name: 'first-end', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
          { name: 'second-end', type: 'frame', origin: [0, 0, -Number(lengthMm)], normal: [0, 0, -1] },
          { name: 'axis', type: 'axis', origin: [0, 0, 0], axis: [0, 0, 1] },
        ],
      };
    },
  };
}

// -----------------------------------------------------------------------------
// Top-level driver
// -----------------------------------------------------------------------------

export const SEED_FAMILIES: SeedFamily[] = [
  socketHeadCapScrew(),
  buttonHeadCapScrew(),
  flatHeadCountersunk(),
  hexHeadBolt(),
  headlessFamily({
    family: 'set-screw',
    standard: 'ISO 4026',
    idPrefix: 'iso-4026',
    label: 'set screw',
    lengths: SET_SCREW_LENGTHS,
    tags: ['set-screw', 'headless'],
  }),
  headlessFamily({
    family: 'threaded-rod',
    standard: 'DIN 975',
    idPrefix: 'din-975',
    label: 'threaded rod',
    lengths: ROD_LENGTHS,
    tags: ['rod', 'headless'],
  }),
  hexNut(),
  lockNut(),
  flatWasher(),
  lockWasher(),
  heatSetInsert(),
  deepGrooveBallBearing(),
  linearShaft(),
  spurGear(),
  stepperMotor(),
  pinHeader(),
  jstXh(),
  ...sg90Families(),
  ...FIXTURE_FAMILY_NAMES.map(fixtureSeedFamily),
];

export async function generateSeedCatalog(
  opts: GenerateOpts,
): Promise<GenerateResult> {
  await initOcct();
  mkdirSync(opts.outDir, { recursive: true });
  const records: PartRecord[] = [];
  const manifests: ConnectorManifest[] = [];
  for (const family of SEED_FAMILIES) {
    const familyDir = join(opts.outDir, family.id);
    mkdirSync(familyDir, { recursive: true });
    for (const variant of family.variants) {
      const built = await family.generate(variant);
      const id = built.record.id;
      const sha256 = createHash('sha256').update(built.stepBytes).digest('hex');
      const record: PartRecord = {
        ...built.record,
        sha256,
        source: 'local-catalog',
      };
      records.push(record);

      const manifest: ConnectorManifest = {
        schemaVersion: 1,
        partId: id,
        family: family.id,
        connectors: built.connectors,
        license: record.license,
        attribution: record.attribution ?? null,
        generatedAt: new Date().toISOString(),
      };
      manifests.push(manifest);

      if (!opts.skipStep) {
        writeFileSync(join(familyDir, `${id}.step`), Buffer.from(built.stepBytes));
      }
      writeFileSync(
        join(familyDir, `${id}.json`),
        JSON.stringify(manifest, null, 2),
      );
    }
  }
  writeFileSync(
    join(opts.outDir, 'index.json'),
    JSON.stringify({ schemaVersion: 1, records }, null, 2),
  );
  const shaManifest = Object.fromEntries(records.map((r) => [r.id, r.sha256]));
  writeFileSync(
    join(opts.outDir, 'sha256-manifest.json'),
    JSON.stringify(shaManifest, null, 2),
  );
  return { records, manifests };
}

// CLI entry point.
const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('generateSeedCatalog.ts') ||
    process.argv[1].endsWith('generateSeedCatalog.js'));

if (isMain) {
  const outDir = process.argv[2] ?? join(process.cwd(), 'assets', 'parts');
  generateSeedCatalog({ outDir })
    .then((r) => {
      console.log(`generated ${r.records.length} records in ${outDir}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
