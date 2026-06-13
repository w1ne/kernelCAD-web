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

export type MetricThread = 'M2' | 'M2.5' | 'M3' | 'M4' | 'M5' | 'M6';

function threadSlug(t: string): string {
  return t.toLowerCase().replace('.', '-');
}

export interface StandardParts {
  boltSHCS(args: { thread: MetricThread; lengthMm: number }): Promise<Shape>;
  boltBHCS(args: { thread: 'M3' | 'M4' | 'M5'; lengthMm: number }): Promise<Shape>;
  boltFlatHead(args: {
    thread: 'M3' | 'M4' | 'M5';
    lengthMm: number;
  }): Promise<Shape>;
  nutHex(args: { thread: MetricThread }): Promise<Shape>;
  nutLock(args: { thread: 'M3' | 'M4' | 'M5' }): Promise<Shape>;
  washerFlat(args: {
    thread: 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
  }): Promise<Shape>;
  washerLock(args: { thread: 'M3' | 'M4' | 'M5' }): Promise<Shape>;
  heatSetInsert(args: {
    thread: 'M2.5' | 'M3' | 'M4';
    lengthMm: 3.8 | 5.7;
  }): Promise<Shape>;
  bearing608(): Promise<Shape>;
  bearing623(): Promise<Shape>;
  bearing688(): Promise<Shape>;
  bearing6800(): Promise<Shape>;
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
      fetch(`iso-4762-${threadSlug(thread)}x${lengthMm}`),
    boltBHCS: ({ thread, lengthMm }) =>
      fetch(`iso-7380-${threadSlug(thread)}x${lengthMm}`),
    boltFlatHead: ({ thread, lengthMm }) =>
      fetch(`iso-10642-${threadSlug(thread)}x${lengthMm}`),
    nutHex: ({ thread }) => fetch(`iso-4032-${threadSlug(thread)}`),
    nutLock: ({ thread }) => fetch(`din-985-${threadSlug(thread)}`),
    washerFlat: ({ thread }) => fetch(`iso-7089-${threadSlug(thread)}`),
    washerLock: ({ thread }) => fetch(`din-127b-${threadSlug(thread)}`),
    heatSetInsert: ({ thread, lengthMm }) =>
      fetch(
        `heatset-${threadSlug(thread)}-l${String(lengthMm).replace('.', '-')}`,
      ),
    bearing608: () => fetch('bearing-608'),
    bearing623: () => fetch('bearing-623'),
    bearing688: () => fetch('bearing-688'),
    bearing6800: () => fetch('bearing-6800'),
    nema17: () => fetch('nema-17'),
    nema23: () => fetch('nema-23'),
    pinHeader254: ({ pins, angle }) =>
      fetch(`pin-header-254-${pins}p${angle === 'right' ? '-ra' : ''}`),
    pinHeader127: ({ pins }) => fetch(`pin-header-127-${pins}p`),
    jstXH: ({ pins }) => fetch(`jst-xh-${pins}p`),
  };
}
