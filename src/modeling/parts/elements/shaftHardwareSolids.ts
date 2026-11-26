// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ResolvedElement } from './types';

export function shaftSupportSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const baseH = d.baseHeightMm ?? 6;
  const center = d.centerHeightMm ?? 20;
  const top = center + (d.blockHeightMm ?? 18) / 2;
  const blockLength = d.baseWidthMm ?? 16;
  const base = OcctBackend.box(d.baseLengthMm ?? 40, d.baseWidthMm ?? 16, baseH, true)
    .translate(0, 0, baseH / 2);
  let support = base.union(OcctBackend.box(blockLength, d.baseWidthMm ?? 16, top - baseH, true)
    .translate(0, 0, (top + baseH) / 2));
  const bore = OcctBackend.cylinder(blockLength + 2, (d.shaftDiameterMm ?? 8) / 2)
    .rotate([0, 1, 0], 90).translate(-blockLength / 2 - 1, 0, center);
  support = support.subtract(bore);
  const split = OcctBackend.box(blockLength + 2, d.splitWidthMm ?? 1, top - center + 1, true)
    .translate(0, 0, (top + center) / 2);
  support = support.subtract(split);
  const mountR = 2.75;
  for (const x of [-(d.mountSpacingMm ?? 28) / 2, (d.mountSpacingMm ?? 28) / 2]) {
    support = support.subtract(OcctBackend.cylinder(baseH + 2, mountR).translate(x, 0, -1));
  }
  return support;
}

export function leadscrewNutSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const height = d.heightMm ?? 15;
  const flangeH = d.flangeThicknessMm ?? 3;
  const flange = OcctBackend.cylinder(flangeH, (d.flangeDiameterMm ?? 22) / 2);
  let body = flange;
  if (part.size === 'T8-anti-backlash') {
    const section = (height - flangeH - 2) / 2;
    body = body.union(OcctBackend.cylinder(section, (d.barrelDiameterMm ?? 10.2) / 2).translate(0, 0, flangeH));
    body = body.union(OcctBackend.cylinder(section, (d.barrelDiameterMm ?? 10.2) / 2)
      .translate(0, 0, flangeH + section + 2));
    body = body.union(OcctBackend.cylinder(2, 7).translate(0, 0, flangeH + section));
  } else {
    body = body.union(OcctBackend.cylinder(height - flangeH, (d.barrelDiameterMm ?? 10.2) / 2).translate(0, 0, flangeH));
  }
  body = body.subtract(OcctBackend.cylinder(height + 2, (d.boreMm ?? 8) / 2).translate(0, 0, -1));
  const boltRadius = (d.boltCircleMm ?? 16) / 2;
  for (const [x, y] of [[boltRadius, 0], [-boltRadius, 0], [0, boltRadius], [0, -boltRadius]]) {
    body = body.subtract(OcctBackend.cylinder(flangeH + 2, (d.boltHoleMm ?? 3.5) / 2).translate(x, y, -1));
  }
  return body;
}

export function shaftCollarSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const width = d.widthMm ?? 6;
  const outer = d.outerDiameterMm ?? 16;
  let collar = OcctBackend.cylinder(width, outer / 2)
    .subtract(OcctBackend.cylinder(width + 2, (d.boreMm ?? 8) / 2).translate(0, 0, -1));
  if (d.splitCode === 1) {
    collar = collar.subtract(OcctBackend.box(outer / 2 + 1, d.clampSlotMm ?? 1.2, width + 2, true)
      .translate(outer / 4 + 0.5, 0, width / 2));
  }
  const screw = OcctBackend.cylinder(outer / 2 + 1, (d.setScrewMm ?? 4) / 2)
    .rotate([1, 0, 0], 90).translate(0, outer / 2 + 1, width / 2);
  return collar.subtract(screw);
}

export function shaftCouplerSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const length = d.lengthMm ?? 25;
  const outer = d.outerDiameterMm ?? 19;
  const gap = d.centerGapMm ?? 1;
  const halfBore = (length - gap) / 2;
  let coupler = OcctBackend.cylinder(length, outer / 2);
  coupler = coupler.subtract(OcctBackend.cylinder(halfBore + 1, (d.boreAMm ?? 5) / 2).translate(0, 0, -1));
  coupler = coupler.subtract(OcctBackend.cylinder(halfBore + 1, (d.boreBMm ?? 5) / 2)
    .translate(0, 0, length - halfBore));
  if (d.kindCode === 2) coupler = addBeamSlots(coupler, outer, length, gap);
  return coupler;
}

function addBeamSlots(shape: OcctBackend, outer: number, length: number, gap: number): OcctBackend {
  const slotLength = (length - gap) / 2;
  for (const angle of [0, 120, 240]) {
    const radialSlot = OcctBackend.box(outer, 1.2, slotLength, true)
      .translate(outer / 2, 0, slotLength / 2)
      .rotate([0, 0, 1], angle);
    shape = shape.subtract(radialSlot);
  }
  for (const angle of [60, 180, 300]) {
    const upper = OcctBackend.box(outer, 1.2, slotLength, true)
      .translate(outer / 2, 0, length - slotLength / 2)
      .rotate([0, 0, 1], angle);
    shape = shape.subtract(upper);
  }
  return shape;
}
