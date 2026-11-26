// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ResolvedElement } from './types';

export function linearRailSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const length = part.lengthMm ?? 300;
  const width = d.widthMm ?? 1;
  const height = d.heightMm ?? 1;
  let rail = OcctBackend.box(length, width, height, true).translate(0, 0, height / 2);
  const groove = d.grooveMm ?? 1;
  for (const side of [-1, 1]) {
    rail = rail.subtract(OcctBackend.box(length + 2, groove, groove, true)
      .translate(0, side * (width / 2 - groove / 2), height - groove / 2));
  }
  const pitch = d.holePitchMm ?? 25;
  const count = Math.max(2, Math.floor((length - pitch) / pitch) + 1);
  const first = -((count - 1) * pitch) / 2;
  for (let index = 0; index < count; index += 1) {
    const x = first + index * pitch;
    const through = OcctBackend.cylinder(height + 2, (d.holeMm ?? 2) / 2)
      .translate(x, 0, -1);
    const counterbore = OcctBackend.cylinder(Math.min(3, height / 2), (d.counterboreMm ?? 4) / 2)
      .translate(x, 0, 0);
    rail = rail.subtract(through).subtract(counterbore);
  }
  return rail;
}

export function linearCarriageSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const width = d.outerWidthMm ?? 27;
  const length = d.outerLengthMm ?? 35;
  const railWidth = d.railWidthMm ?? 12;
  const railHeight = d.railHeightMm ?? 8;
  const topHeight = d.topAboveRailMm ?? 5;
  let body = OcctBackend.box(length, width, topHeight, true).translate(0, 0, topHeight / 2);
  const skirtWidth = (width - railWidth - 0.6) / 2;
  for (const side of [-1, 1]) {
    const skirt = OcctBackend.box(length, skirtWidth, railHeight, true)
      .translate(0, side * (railWidth / 2 + 0.3 + skirtWidth / 2), -railHeight / 2);
    body = body.union(skirt);
  }
  const saddleDepth = Math.min(1.2, topHeight / 3);
  const saddle = OcctBackend.box(length + 2, railWidth + 0.6, saddleDepth, true)
    .translate(0, 0, saddleDepth / 2);
  body = body.subtract(saddle);
  const hx = (d.mountPitchXmm ?? 15) / 2;
  const hy = (d.mountPitchYmm ?? 20) / 2;
  const radius = (d.mountHoleMm ?? 3) / 2;
  for (const x of [-hx, hx]) {
    for (const y of [-hy, hy]) {
      body = body.subtract(OcctBackend.cylinder(topHeight + 2, radius).translate(x, y, -1));
    }
  }
  return body;
}
