// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { axisConnector, frameConnector, resolveFromSpec, type ElementFamilySpec, type ElementRequest, type ResolvedElement } from './types';

export const ALUMINUM_EXTRUSIONS: ElementFamilySpec = {
  family: 'aluminum-extrusion', category: 'mechanical', standard: 'T-slot profile',
  lengthMm: { min: 50, max: 3000, default: 400, exemplars: [200, 400] },
  sizes: {
    '2020': profile(20, 20, 6, 5), '2040': profile(20, 40, 6, 5), '2060': profile(20, 60, 6, 5),
    '3030': profile(30, 30, 8, 6.8), '4040': profile(40, 40, 8, 8), '4080': profile(40, 80, 8, 8),
    'v-slot-2020': { ...profile(20, 20, 6, 5), tags: ['v-slot'] },
    'v-slot-2040': { ...profile(20, 40, 6, 5), tags: ['v-slot'] },
  },
};

function profile(width: number, height: number, slot: number, bore: number) {
  return { dims: { widthMm: width, heightMm: height, slotMm: slot,
    slotInnerMm: slot + 4, slotDepthMm: slot, boreMm: bore } };
}

function extrusionConnectors(_size: string, d: Record<string, number>, l?: number) {
  const length = l ?? 0;
  return [
    frameConnector('end-a', [0, 0, 0], [0, 0, -1]),
    frameConnector('end-b', [0, 0, length], [0, 0, 1]),
    frameConnector('slot-pos-x', [d.widthMm / 2, 0, length / 2], [1, 0, 0]),
    frameConnector('slot-neg-x', [-d.widthMm / 2, 0, length / 2], [-1, 0, 0]),
    frameConnector('slot-pos-y', [0, d.heightMm / 2, length / 2], [0, 1, 0]),
    frameConnector('slot-neg-y', [0, -d.heightMm / 2, length / 2], [0, -1, 0]),
  ];
}

export const EXTRUSION_BRACKETS: ElementFamilySpec = {
  family: 'extrusion-bracket', category: 'mechanical', standard: 'profile joining hardware',
  sizes: {
    '2020-corner': bracket(20, 30, 4, 5.5), '3030-corner': bracket(30, 42, 5, 6.5),
    '4040-corner': bracket(40, 55, 6, 8.5),
    '2020-l-plate': plate(20, 40, 3, 'L'), '2020-t-plate': plate(20, 60, 3, 'T'),
    '4040-l-plate': plate(40, 80, 4, 'L'),
  },
};

function bracket(profileMm: number, legMm: number, thicknessMm: number, holeMm: number) {
  return { dims: { profileMm, legMm, thicknessMm, holeMm, kindCode: 1 } };
}

function plate(profileMm: number, legMm: number, thicknessMm: number, kind: 'L' | 'T') {
  return { dims: { profileMm, legMm, thicknessMm, holeMm: profileMm === 20 ? 5.5 : 8.5,
    kindCode: kind === 'L' ? 2 : 3 } };
}

export const EXTRUSION_T_NUTS: ElementFamilySpec = {
  family: 'extrusion-t-nut', category: 'mechanical', standard: 'profile T-nut',
  sizes: {
    '20-M3': tNut(5.6, 8.0, 3.0, 1.6, 2.5), '20-M4': tNut(5.6, 8.0, 3.0, 1.6, 3.3),
    '20-M5': tNut(5.6, 8.0, 3.0, 1.6, 4.2), '30-M5': tNut(7.6, 12.2, 4.2, 2.0, 4.2),
    '30-M6': tNut(7.6, 12.2, 4.2, 2.0, 5.0), '40-M6': tNut(8.0, 15.2, 5.0, 2.4, 5.0),
    '40-M8': tNut(8.0, 15.2, 5.0, 2.4, 6.8),
  },
};

function tNut(slot: number, base: number, baseHeight: number, neckHeight: number, tap: number) {
  return { dims: { slotMm: slot, baseWidthMm: base, baseHeightMm: baseHeight,
    neckWidthMm: slot - 0.4, neckHeightMm: neckHeight, tapDrillMm: tap,
    lengthMm: Math.round(slot + 4.4), threadMajorMm: tap + 0.5 } };
}

function tNutConnectors(_size: string, d: Record<string, number>) {
  const top = d.baseHeightMm + d.neckHeightMm;
  return [frameConnector('slot-seat', [0, 0, top], [0, 0, 1]),
    axisConnector('thread-axis', [0, 0, top], [0, 0, 1])];
}

export const resolveAluminumExtrusion = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(ALUMINUM_EXTRUSIONS, request, extrusionConnectors);

export const resolveExtrusionBracket = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(EXTRUSION_BRACKETS, request, () => [
    frameConnector('leg-a', [0, 0, 0], [0, 0, -1]),
    frameConnector('leg-b', [0, 0, 0], [1, 0, 0]),
  ]);

export const resolveExtrusionTNut = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(EXTRUSION_T_NUTS, request, tNutConnectors);
