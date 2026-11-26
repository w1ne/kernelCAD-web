// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { axisConnector, frameConnector, resolveFromSpec, type ElementFamilySpec, type ElementRequest, type ResolvedElement } from './types';

export const LINEAR_BEARINGS: ElementFamilySpec = {
  family: 'linear-bearing', category: 'mechanical', standard: 'ISO 10285 envelope',
  sizes: {
    LM6UU: { dims: { boreMm: 6, outerDiameterMm: 12, lengthMm: 19, grooveWidthMm: 1, grooveDepthMm: 0.4 } },
    LM8UU: { dims: { boreMm: 8, outerDiameterMm: 15, lengthMm: 24, grooveWidthMm: 1.2, grooveDepthMm: 0.5 } },
    LM10UU: { dims: { boreMm: 10, outerDiameterMm: 19, lengthMm: 29, grooveWidthMm: 1.4, grooveDepthMm: 0.6 } },
    LM12UU: { dims: { boreMm: 12, outerDiameterMm: 21, lengthMm: 30, grooveWidthMm: 1.5, grooveDepthMm: 0.6 } },
    LM16UU: { dims: { boreMm: 16, outerDiameterMm: 28, lengthMm: 37, grooveWidthMm: 1.8, grooveDepthMm: 0.7 } },
    LM20UU: { dims: { boreMm: 20, outerDiameterMm: 32, lengthMm: 42, grooveWidthMm: 2, grooveDepthMm: 0.8 } },
  },
};

export const LEADSCREWS: ElementFamilySpec = {
  family: 'leadscrew', category: 'mechanical', standard: 'ISO metric trapezoidal thread',
  lengthMm: { min: 50, max: 1500, default: 300, exemplars: [200, 300, 400] },
  sizes: {
    Tr8x2: { dims: { nominalDiameterMm: 8, pitchMm: 2, rootDiameterMm: 6.2 } },
    Tr8x4: { dims: { nominalDiameterMm: 8, pitchMm: 4, rootDiameterMm: 6.2 } },
    Tr8x8: { dims: { nominalDiameterMm: 8, pitchMm: 8, rootDiameterMm: 6.2 } },
  },
};

function bearingConnectors(_size: string, d: Record<string, number>) {
  return [
    axisConnector('bore-axis', [0, 0, 0], [0, 0, 1]),
    frameConnector('end-a', [0, 0, 0], [0, 0, -1]),
    frameConnector('end-b', [0, 0, d.lengthMm], [0, 0, 1]),
  ];
}

function leadscrewConnectors(_size: string, _d: Record<string, number>, length?: number) {
  const l = length ?? 300;
  return [
    frameConnector('end-a', [0, 0, 0], [0, 0, -1]),
    frameConnector('end-b', [0, 0, l], [0, 0, 1]),
    axisConnector('axis', [0, 0, 0], [0, 0, 1]),
  ];
}

export const resolveLinearBearing = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(LINEAR_BEARINGS, request, bearingConnectors);

export const resolveLeadscrew = (request: ElementRequest): ResolvedElement =>
  resolveFromSpec(LEADSCREWS, request, leadscrewConnectors);
