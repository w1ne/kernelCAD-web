// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/standardParts.ts
//
// Typed, autocomplete-friendly shortcuts that map argument records onto
// bundled catalog ids and delegate to fetchPart. These never require the
// remote tier — every wrapper resolves to an id present in the seed
// catalog.

import { fetchPartHost, type FetchPartCtx } from './fetchPart';
import type { Shape } from '../capture/proxy';
import { resolvePart } from './familyTable';

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
  boltSHCS(args: { thread: MetricThread; lengthMm: number }): Promise<Shape>;
  boltBHCS(args: { thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10'; lengthMm: number }): Promise<Shape>;
  boltFlatHead(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    lengthMm: number;
  }): Promise<Shape>;
  boltHex(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12' | 'M16' | 'M20';
    lengthMm: number;
  }): Promise<Shape>;
  setScrew(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    lengthMm: number;
  }): Promise<Shape>;
  rodThreaded(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
    lengthMm: 250 | 1000;
  }): Promise<Shape>;
  nutHex(args: { thread: MetricThread }): Promise<Shape>;
  nutLock(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
  }): Promise<Shape>;
  washerFlat(args: { thread: MetricThread }): Promise<Shape>;
  washerLock(args: {
    thread: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' | 'M12';
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
    boltSHCS: ({ thread, lengthMm }) =>
      fetch(resolvePart({ family: 'socket-head-cap-screw', thread, lengthMm }).id),
    boltBHCS: ({ thread, lengthMm }) =>
      fetch(resolvePart({ family: 'button-head-cap-screw', thread, lengthMm }).id),
    boltFlatHead: ({ thread, lengthMm }) =>
      fetch(resolvePart({ family: 'flat-head-countersunk', thread, lengthMm }).id),
    boltHex: ({ thread, lengthMm }) =>
      fetch(resolvePart({ family: 'hex-head-bolt', thread, lengthMm }).id),
    setScrew: ({ thread, lengthMm }) =>
      fetch(resolvePart({ family: 'set-screw', thread, lengthMm }).id),
    rodThreaded: ({ thread, lengthMm }) =>
      fetch(resolvePart({ family: 'threaded-rod', thread, lengthMm }).id),
    nutHex: ({ thread }) =>
      fetch(resolvePart({ family: 'hex-nut', thread }).id),
    nutLock: ({ thread }) =>
      fetch(resolvePart({ family: 'lock-nut', thread }).id),
    washerFlat: ({ thread }) =>
      fetch(resolvePart({ family: 'flat-washer', thread }).id),
    washerLock: ({ thread }) =>
      fetch(resolvePart({ family: 'lock-washer', thread }).id),
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
