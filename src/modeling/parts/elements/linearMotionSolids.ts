// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { ResolvedElement } from './types';

export function linearBearingSolid(part: ResolvedElement): OcctBackend {
  const d = part.dims;
  const length = d.lengthMm ?? 24;
  const outer = d.outerDiameterMm ?? 15;
  let bearing = OcctBackend.cylinder(length, outer / 2);
  bearing = bearing.subtract(OcctBackend.cylinder(length + 2, (d.boreMm ?? 8) / 2).translate(0, 0, -1));
  const grooveWidth = d.grooveWidthMm ?? 1;
  const grooveDepth = d.grooveDepthMm ?? 0.5;
  for (const z of [2, length - grooveWidth - 2]) {
    const ring = OcctBackend.cylinder(grooveWidth, outer / 2 + 0.1)
      .subtract(OcctBackend.cylinder(grooveWidth + 0.2, outer / 2 - grooveDepth).translate(0, 0, -0.1))
      .translate(0, 0, z);
    bearing = bearing.subtract(ring);
  }
  return bearing;
}

export function leadscrewSolid(part: ResolvedElement): OcctBackend {
  const length = part.lengthMm ?? 300;
  const radius = (part.dims.nominalDiameterMm ?? 8) / 2;
  let screw = OcctBackend.cylinder(length, radius);
  // Short reduced lead-in sections leave the nominal thread envelope intact.
  const relief = Math.max(0.2, radius * 0.12);
  for (const z of [1.5, length - 3.5]) {
    const cutter = OcctBackend.cylinder(2, radius + 0.1)
      .subtract(OcctBackend.cylinder(2.2, radius - relief).translate(0, 0, -0.1))
      .translate(0, 0, z);
    screw = screw.subtract(cutter);
  }
  return screw;
}
