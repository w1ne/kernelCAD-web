// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { axisConnector, frameConnector, resolveFromSpec, type ElementFamilySpec, type ElementRequest, type ResolvedElement } from './types';

const timingRow = (teeth: number, bore: number, idler = false) => ({ dims: {
  teethCount: teeth, boreMm: bore, pitchMm: 2, pitchDiameterMm: teeth * 2 / Math.PI,
  idlerCode: idler ? 1 : 0, flangeThicknessMm: 1, hubDiameterMm: idler ? 0 : Math.max(10, bore + 4),
  hubHeightMm: idler ? 0 : 3,
} });

export const TIMING_PULLEYS: ElementFamilySpec = {
  family: 'timing-pulley', category: 'mechanical', standard: 'GT2 timing pulley',
  sizes: {
    'GT2-16T-5': timingRow(16, 5), 'GT2-20T-5': timingRow(20, 5),
    'GT2-20T-6.35': timingRow(20, 6.35), 'GT2-20T-8': timingRow(20, 8),
    'GT2-30T-5': timingRow(30, 5), 'GT2-36T-8': timingRow(36, 8),
    'GT2-40T-8': timingRow(40, 8), 'GT2-60T-8': timingRow(60, 8),
    'GT2-20T-idler-3': timingRow(20, 3, true), 'GT2-20T-idler-5': timingRow(20, 5, true),
  },
};

function pulleyConnectors(_size: string, d: Record<string, number>, _length?: number, belt?: number) {
  const width = belt ?? 6;
  const face = 2 * d.flangeThicknessMm + width + d.hubHeightMm;
  return [
    axisConnector('bore-axis', [0, 0, 0], [0, 0, 1]),
    frameConnector('hub-face', [0, 0, face], [0, 0, 1]),
    frameConnector('belt-center', [0, 0, d.flangeThicknessMm + width / 2], [0, 0, 1]),
  ];
}

export function resolveTimingPulley(request: ElementRequest): ResolvedElement {
  return resolveFromSpec(TIMING_PULLEYS, request, pulleyConnectors, { beltWidths: [6, 9, 10] });
}

export function timingPulleySolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const beltWidth = part.beltWidthMm ?? 6;
  const flange = d.flangeThicknessMm ?? 1;
  const pitchRadius = (d.pitchDiameterMm ?? 12) / 2;
  const totalHeight = flange * 2 + beltWidth + (d.hubHeightMm ?? 0);
  const rimRadius = d.idlerCode === 1 ? pitchRadius + 1 : pitchRadius - 0.2;
  let body = d.idlerCode === 1
    ? OcctBackend.cylinder(beltWidth, rimRadius).translate(0, 0, flange)
    : OcctBackend.extrudePolygon(toothProfile(d.teethCount ?? 20, pitchRadius), beltWidth)
      .translate(0, 0, flange);
  body = body.union(OcctBackend.cylinder(flange, rimRadius + 1.2));
  body = body.union(OcctBackend.cylinder(flange, rimRadius + 1.2).translate(0, 0, flange + beltWidth));
  if ((d.hubHeightMm ?? 0) > 0) {
    body = body.union(OcctBackend.cylinder(d.hubHeightMm, (d.hubDiameterMm ?? 10) / 2)
      .translate(0, 0, flange * 2 + beltWidth));
  }
  return body.subtract(OcctBackend.cylinder(totalHeight + 2, (d.boreMm ?? 5) / 2).translate(0, 0, -1));
}

function toothProfile(teeth: number, pitchRadius: number): [number, number][] {
  const pitchAngle = Math.PI * 2 / teeth;
  const root = pitchRadius - 0.75;
  const tip = pitchRadius - 0.25;
  const points: [number, number][] = [];
  for (let index = 0; index < teeth; index += 1) {
    const center = index * pitchAngle;
    for (const [offset, radius] of [[-0.5, root], [-0.22, root], [-0.12, tip], [0.12, tip], [0.22, root]]) {
      const angle = center + offset * pitchAngle;
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
  }
  return points;
}
