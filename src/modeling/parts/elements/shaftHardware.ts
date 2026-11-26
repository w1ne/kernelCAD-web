// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { axisConnector, frameConnector, resolveFromSpec, type ElementFamilySpec, type ElementRequest, type ResolvedElement } from './types';

export const SHAFT_SUPPORTS: ElementFamilySpec = {
  family: 'shaft-support', category: 'mechanical', standard: 'shaft support envelope',
  sizes: {
    SK8: support(8, 40, 16, 28, 20, 6, 18), SK10: support(10, 40, 16, 28, 20, 6, 18),
    SK12: support(12, 40, 16, 28, 22, 6, 20), SK16: support(16, 50, 20, 32, 25, 7, 22),
    SHF8: support(8, 50, 20, 36, 15, 6, 18), SHF10: support(10, 50, 20, 36, 17, 6, 18),
    SHF12: support(12, 60, 22, 42, 20, 7, 20),
  },
};

function support(shaft: number, baseLength: number, baseWidth: number, spacing: number,
  centerHeight: number, baseHeight: number, blockHeight: number) {
  return { dims: { shaftDiameterMm: shaft, baseLengthMm: baseLength, baseWidthMm: baseWidth,
    mountSpacingMm: spacing, centerHeightMm: centerHeight, baseHeightMm: baseHeight,
    blockHeightMm: blockHeight, splitWidthMm: 1 } };
}

export const LEADSCREW_NUTS: ElementFamilySpec = {
  family: 'leadscrew-nut', category: 'mechanical', standard: 'T8 leadscrew nut envelope',
  sizes: {
    'T8-flange': { dims: { flangeDiameterMm: 22, barrelDiameterMm: 10.2, heightMm: 15,
      flangeThicknessMm: 3, boltCircleMm: 16, boltHoleMm: 3.5, boreMm: 8 } },
    'T8-anti-backlash': { dims: { flangeDiameterMm: 22, barrelDiameterMm: 10.2, heightMm: 28,
      flangeThicknessMm: 3, boltCircleMm: 16, boltHoleMm: 3.5, boreMm: 8, springSeatMm: 2 } },
  },
};

export const SHAFT_COLLARS: ElementFamilySpec = {
  family: 'shaft-collar', category: 'mechanical', standard: 'shaft collar envelope',
  sizes: {
    '5': collar(5, 12, 5), '6': collar(6, 12, 5), '8': collar(8, 16, 6), '10': collar(10, 19, 6),
    '12': collar(12, 21, 7), '16': collar(16, 25, 8), '20': collar(20, 32, 10),
    'split-8': collar(8, 16, 6, true), 'split-10': collar(10, 19, 6, true),
    'split-12': collar(12, 21, 7, true), 'split-16': collar(16, 25, 8, true),
    'split-20': collar(20, 32, 10, true),
  },
};

function collar(bore: number, outer: number, width: number, split = false) {
  return { dims: { boreMm: bore, outerDiameterMm: outer, widthMm: width,
    splitCode: split ? 1 : 0, setScrewMm: bore <= 6 ? 3 : 4, clampSlotMm: 1.2 } };
}

export const SHAFT_COUPLERS: ElementFamilySpec = {
  family: 'shaft-coupler', category: 'mechanical', standard: 'flexible shaft coupler envelope',
  sizes: {
    'jaw-5x5': coupler('jaw', 5, 5, 25, 30), 'jaw-5x8': coupler('jaw', 5, 8, 25, 30),
    'jaw-6.35x8': coupler('jaw', 6.35, 8, 25, 30), 'jaw-8x8': coupler('jaw', 8, 8, 25, 30),
    'jaw-8x10': coupler('jaw', 8, 10, 25, 30), 'jaw-10x12': coupler('jaw', 10, 12, 25, 30),
    'beam-5x5': coupler('beam', 5, 5, 19, 25), 'beam-5x8': coupler('beam', 5, 8, 19, 25),
    'beam-6.35x8': coupler('beam', 6.35, 8, 19, 25), 'beam-8x8': coupler('beam', 8, 8, 19, 25),
  },
};

function coupler(kind: 'jaw' | 'beam', boreA: number, boreB: number, outer: number, length: number) {
  return { dims: { kindCode: kind === 'jaw' ? 1 : 2, boreAMm: boreA, boreBMm: boreB,
    outerDiameterMm: outer, lengthMm: length, centerGapMm: kind === 'jaw' ? 2 : 1 } };
}

const shaftConnectors = (_size: string, d: Record<string, number>) => [
  frameConnector('base-mount', [0, 0, 0], [0, 0, -1]),
  axisConnector('shaft-axis', [0, 0, d.centerHeightMm], [1, 0, 0]),
];

const nutConnectors = () => [
  frameConnector('flange-seat', [0, 0, 0], [0, 0, -1]),
  axisConnector('screw-axis', [0, 0, 0], [0, 0, 1]),
];

const collarConnectors = (_size: string, d: Record<string, number>) => [
  axisConnector('bore-axis', [0, 0, 0], [0, 0, 1]),
  frameConnector('face-a', [0, 0, 0], [0, 0, -1]),
  frameConnector('face-b', [0, 0, d.widthMm], [0, 0, 1]),
];

const couplerConnectors = (_size: string, d: Record<string, number>) => [
  axisConnector('bore-a', [0, 0, 0], [0, 0, -1]),
  axisConnector('bore-b', [0, 0, d.lengthMm], [0, 0, 1]),
];

export const resolveShaftSupport = (request: ElementRequest): ResolvedElement => resolveFromSpec(SHAFT_SUPPORTS, request, shaftConnectors);
export const resolveLeadscrewNut = (request: ElementRequest): ResolvedElement => resolveFromSpec(LEADSCREW_NUTS, request, nutConnectors);
export const resolveShaftCollar = (request: ElementRequest): ResolvedElement => resolveFromSpec(SHAFT_COLLARS, request, collarConnectors);
export const resolveShaftCoupler = (request: ElementRequest): ResolvedElement => resolveFromSpec(SHAFT_COUPLERS, request, couplerConnectors);
