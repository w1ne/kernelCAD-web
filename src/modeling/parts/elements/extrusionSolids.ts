// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ResolvedElement } from './types';

export function aluminumExtrusionSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const width = d.widthMm ?? 20;
  const height = d.heightMm ?? 20;
  const length = part.lengthMm ?? 400;
  let bar = OcctBackend.box(width, height, length, true).translate(0, 0, length / 2);
  bar = cutFaceSlot(bar, 'x', width, height, length, 1);
  bar = cutFaceSlot(bar, 'x', width, height, length, -1);
  bar = cutFaceSlot(bar, 'y', width, height, length, 1);
  bar = cutFaceSlot(bar, 'y', width, height, length, -1);
  bar = bar.subtract(OcctBackend.cylinder(length + 2, (d.boreMm ?? 5) / 2).translate(0, 0, -1));
  if (part.size.startsWith('v-slot')) bar = chamferVProfile(bar, width, height, length);
  return bar;
}

function cutFaceSlot(shape: OcctBackend, face: 'x' | 'y', width: number, height: number,
  length: number, side: number): OcctBackend {
  const series = Math.min(width, height);
  const opening = series >= 40 ? 8.0 : series >= 30 ? 7.6 : 5.6;
  const inner = series >= 40 ? 16.0 : series >= 30 ? 12.8 : 8.4;
  const depth = series >= 40 ? 9.4 : series >= 30 ? 7.4 : 5.0;
  const lip = series >= 40 ? 2.4 : series >= 30 ? 2.0 : 1.6;
  const faceSize = face === 'x' ? width : height;
  const mouth = face === 'x'
    ? OcctBackend.box(lip + 0.2, opening, length + 2, true).translate(side * (faceSize / 2 - lip / 2 + 0.1), 0, length / 2)
    : OcctBackend.box(opening, lip + 0.2, length + 2, true).translate(0, side * (faceSize / 2 - lip / 2 + 0.1), length / 2);
  const innerDepth = depth - lip;
  const chamber = face === 'x'
    ? OcctBackend.box(innerDepth, inner, length + 2, true).translate(side * (faceSize / 2 - depth + innerDepth / 2), 0, length / 2)
    : OcctBackend.box(inner, innerDepth, length + 2, true).translate(0, side * (faceSize / 2 - depth + innerDepth / 2), length / 2);
  return shape.subtract(mouth).subtract(chamber);
}

function chamferVProfile(shape: OcctBackend, width: number, height: number, length: number): OcctBackend {
  const cut = Math.min(2.5, width / 8, height / 8);
  for (const xSide of [-1, 1]) {
    for (const ySide of [-1, 1]) {
      const x = xSide * width / 2;
      const y = ySide * height / 2;
      const points: [number, number][] = [[x, y], [x - xSide * cut, y], [x, y - ySide * cut]];
      shape = shape.subtract(OcctBackend.extrudePolygon(points, length + 2).translate(0, 0, -1));
    }
  }
  return shape;
}

export function extrusionBracketSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const profile = d.profileMm ?? 20;
  const leg = d.legMm ?? profile * 2;
  const thickness = d.thicknessMm ?? 3;
  let plate = OcctBackend.box(leg, profile, thickness).union(OcctBackend.box(profile, leg, thickness));
  if (d.kindCode === 3) plate = plate.union(OcctBackend.box(leg, profile, thickness).translate(0, profile, 0));
  const holeR = (d.holeMm ?? 5.5) / 2;
  const pitch = profile;
  for (const station of [leg - pitch / 2, pitch / 2]) {
    plate = plate.subtract(OcctBackend.cylinder(thickness + 2, holeR).translate(station, profile / 2, -1));
    plate = plate.subtract(OcctBackend.cylinder(thickness + 2, holeR).translate(profile / 2, station, -1));
  }
  return plate;
}

export function extrusionTNutSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const length = d.lengthMm ?? 10;
  const baseHeight = d.baseHeightMm ?? 4;
  const neckHeight = d.neckHeightMm ?? 2;
  const base = OcctBackend.box(length, d.baseWidthMm ?? 10, baseHeight, true).translate(0, 0, baseHeight / 2);
  const neck = OcctBackend.box(length * 0.65, d.neckWidthMm ?? 6, neckHeight, true)
    .translate(0, 0, baseHeight + neckHeight / 2);
  const bore = OcctBackend.cylinder(baseHeight + neckHeight + 2, (d.tapDrillMm ?? 3) / 2).translate(0, 0, -1);
  return base.union(neck).subtract(bore);
}
