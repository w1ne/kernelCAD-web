// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/standardParts.ts
//
// Typed, autocomplete-friendly shortcuts. Fasteners go through lib.part
// (placePart), so `detail` behaves the same everywhere; the other members map
// onto bundled catalog ids and delegate to fetchPart. None of them needs the
// remote tier.

import { fetchPartHost, type FetchPartCtx } from './fetchPart';
import type { Shape } from '../capture/proxy';
import type { FastenerDetail } from './familyTable';
import { placePart } from './placePart';

export {
  STANDARD_PART_RANGES,
  STANDARD_PART_RANGE_REMAINING,
  standardPartVerificationAttributes,
  type StandardPartRangeDeclaration,
} from './standardPartRanges';

export type MetricThread =
  | 'M2'
  | 'M2.5'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M8'
  | 'M10'
  | 'M12';

function threadSlug(t: string): string {
  return t.toLowerCase().replace('.', '-');
}

export interface StandardParts {
  boltSHCS(args: { thread: MetricThread; lengthMm: number; detail?: FastenerDetail }): Promise<Shape>;
  boltBHCS(args: { thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10'; lengthMm: number; detail?: FastenerDetail }): Promise<Shape>;
  boltFlatHead(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    lengthMm: number;
    detail?: FastenerDetail;
  }): Promise<Shape>;
  boltHex(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12' | 'M16' | 'M20';
    lengthMm: number;
    detail?: FastenerDetail;
  }): Promise<Shape>;
  setScrew(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    lengthMm: number;
    detail?: FastenerDetail;
  }): Promise<Shape>;
  rodThreaded(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    lengthMm: 250 | 1000;
    detail?: FastenerDetail;
  }): Promise<Shape>;
  nutHex(args: { thread: MetricThread; detail?: FastenerDetail }): Promise<Shape>;
  nutLock(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    detail?: FastenerDetail;
  }): Promise<Shape>;
  washerFlat(args: { thread: MetricThread; detail?: FastenerDetail }): Promise<Shape>;
  washerLock(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    detail?: FastenerDetail;
  }): Promise<Shape>;
  heatSetInsert(args: {
    thread: 'M2.5' | 'M3' | 'M4';
    lengthMm: 3.8 | 5.7;
  }): Promise<Shape>;
  bearing608(): Promise<Shape>;
  bearing623(): Promise<Shape>;
  bearing688(): Promise<Shape>;
  bearing6800(): Promise<Shape>;
  /** Community reference geometry, CC-BY-SA-4.0; exact supplier fit unverified. */
  sg90(): Promise<Shape>;
  sg90HornSingleArm(): Promise<Shape>;
  nema17(): Promise<Shape>;
  nema23(): Promise<Shape>;
  pinHeader254(args: {
    pins: number;
    angle?: 'straight' | 'right';
  }): Promise<Shape>;
  pinHeader127(args: { pins: number }): Promise<Shape>;
  jstXH(args: { pins: 2 | 3 | 4 | 5 | 6 }): Promise<Shape>;
}

export function createStandardParts(ctx: FetchPartCtx): StandardParts {
  const fetch = (id: string): Promise<Shape> =>
    fetchPartHost(ctx, id, { strict: true }).then((r) => r.shape);
  return {
    boltSHCS: ({ thread, lengthMm, detail }) =>
      placePart(ctx, { family: 'socket-head-cap-screw', thread, lengthMm, detail }),
    boltBHCS: ({ thread, lengthMm, detail }) =>
      placePart(ctx, { family: 'button-head-cap-screw', thread, lengthMm, detail }),
    boltFlatHead: ({ thread, lengthMm, detail }) =>
      placePart(ctx, { family: 'flat-head-countersunk', thread, lengthMm, detail }),
    boltHex: ({ thread, lengthMm, detail }) =>
      placePart(ctx, { family: 'hex-head-bolt', thread, lengthMm, detail }),
    setScrew: ({ thread, lengthMm, detail }) =>
      placePart(ctx, { family: 'set-screw', thread, lengthMm, detail }),
    rodThreaded: ({ thread, lengthMm, detail }) =>
      placePart(ctx, { family: 'threaded-rod', thread, lengthMm, detail }),
    nutHex: ({ thread, detail }) =>
      placePart(ctx, { family: 'hex-nut', thread, detail }),
    nutLock: ({ thread, detail }) =>
      placePart(ctx, { family: 'lock-nut', thread, detail }),
    washerFlat: ({ thread, detail }) =>
      placePart(ctx, { family: 'flat-washer', thread, detail }),
    washerLock: ({ thread, detail }) =>
      placePart(ctx, { family: 'lock-washer', thread, detail }),
    heatSetInsert: ({ thread, lengthMm }) =>
      fetch(
        `heatset-${threadSlug(thread)}-l${String(lengthMm).replace('.', '-')}`,
      ),
    bearing608: () => fetch('bearing-608'),
    bearing623: () => fetch('bearing-623'),
    bearing688: () => fetch('bearing-688'),
    bearing6800: () => fetch('bearing-6800'),
    sg90: () => fetch('sg90-servo'),
    sg90HornSingleArm: () => fetch('sg90-horn-single-arm'),
    nema17: () => fetch('nema-17'),
    nema23: () => fetch('nema-23'),
    pinHeader254: ({ pins, angle }) =>
      fetch(`pin-header-254-${pins}p${angle === 'right' ? '-ra' : ''}`),
    pinHeader127: ({ pins }) => fetch(`pin-header-127-${pins}p`),
    jstXH: ({ pins }) => fetch(`jst-xh-${pins}p`),
  };
}
