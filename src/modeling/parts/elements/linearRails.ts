// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { axisConnector, frameConnector, resolveFromSpec, type ElementFamilySpec, type ElementRequest, type ResolvedElement } from './types';

export const LINEAR_RAILS: ElementFamilySpec = {
  family: 'linear-rail', category: 'mechanical', standard: 'linear guide rail',
  lengthMm: { min: 50, max: 2000, default: 300, exemplars: [200, 300, 400] },
  sizes: {
    MGN7: { dims: { widthMm: 7, heightMm: 4.8, holePitchMm: 15, holeMm: 1.2, counterboreMm: 2.4, grooveMm: 0.8 } },
    MGN9: { dims: { widthMm: 9, heightMm: 6.5, holePitchMm: 20, holeMm: 1.4, counterboreMm: 2.8, grooveMm: 1 } },
    MGN12: { dims: { widthMm: 12, heightMm: 8, holePitchMm: 25, holeMm: 2, counterboreMm: 4, grooveMm: 1.2 } },
    MGN15: { dims: { widthMm: 15, heightMm: 10, holePitchMm: 40, holeMm: 3, counterboreMm: 5.5, grooveMm: 1.5 } },
    HGR15: { dims: { widthMm: 15, heightMm: 15, holePitchMm: 60, holeMm: 4.5, counterboreMm: 7.5, grooveMm: 2 } },
    HGR20: { dims: { widthMm: 20, heightMm: 17.5, holePitchMm: 60, holeMm: 6, counterboreMm: 9.5, grooveMm: 2.5 } },
    HGR25: { dims: { widthMm: 23, heightMm: 22, holePitchMm: 60, holeMm: 7, counterboreMm: 11, grooveMm: 3 } },
  },
};

export const LINEAR_CARRIAGES: ElementFamilySpec = {
  family: 'linear-carriage', category: 'mechanical', standard: 'linear guide carriage',
  sizes: {
    MGN7C: carriage(17, 22.5, 7, 4.8, 10, 10, 2, 8),
    MGN7H: carriage(17, 30.8, 7, 4.8, 10, 10, 2, 8),
    MGN9C: carriage(20, 28.9, 9, 6.5, 15, 15, 3, 10),
    MGN9H: carriage(20, 39.9, 9, 6.5, 20, 15, 3, 10),
    MGN12C: carriage(27, 34.7, 12, 8, 15, 20, 3, 13),
    MGN12H: carriage(27, 45.4, 12, 8, 20, 20, 3, 13),
    MGN15C: carriage(32, 42.1, 15, 10, 20, 25, 3, 16),
    MGN15H: carriage(32, 58.8, 15, 10, 25, 25, 3, 16),
    HGH15CA: carriage(34, 61.4, 15, 15, 39.4, 26, 4, 28),
    HGH20CA: carriage(44, 77.5, 20, 17.5, 36, 32, 5, 30),
    HGW20CC: carriage(63, 63.5, 20, 17.5, 35, 53, 5, 30),
    HGH25CA: carriage(48, 84, 23, 22, 35, 35, 6, 40),
  },
};

function carriage(width: number, length: number, railWidth: number, railHeight: number,
  pitchX: number, pitchY: number, hole: number, totalHeight?: number) {
  const height = totalHeight ?? (railHeight + (railWidth <= 9 ? 3.5 : 5));
  return { dims: { outerWidthMm: width, outerLengthMm: length, railWidthMm: railWidth,
    railHeightMm: railHeight, overallHeightMm: height, topAboveRailMm: height - railHeight,
    mountPitchXmm: pitchX, mountPitchYmm: pitchY, mountHoleMm: hole } };
}

function railConnectors(_size: string, d: Record<string, number>, l?: number) {
  const length = l ?? 0;
  return [
    frameConnector('base-mount', [0, 0, 0], [0, 0, -1]),
    axisConnector('rail-axis', [0, 0, d.heightMm], [1, 0, 0]),
    frameConnector('end-a', [-length / 2, 0, d.heightMm / 2], [-1, 0, 0]),
    frameConnector('end-b', [length / 2, 0, d.heightMm / 2], [1, 0, 0]),
  ];
}

function carriageConnectors(_size: string, d: Record<string, number>) {
  const half = d.outerLengthMm / 2;
  return [
    axisConnector('rail-mate', [0, 0, 0], [1, 0, 0]),
    frameConnector('top-mount', [0, 0, d.topAboveRailMm], [0, 0, 1]),
    frameConnector('front-end', [-half, 0, d.topAboveRailMm / 2], [-1, 0, 0]),
    frameConnector('rear-end', [half, 0, d.topAboveRailMm / 2], [1, 0, 0]),
  ];
}

export const resolveLinearRail = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(LINEAR_RAILS, request, railConnectors);

export const resolveLinearCarriage = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(LINEAR_CARRIAGES, request, carriageConnectors);
