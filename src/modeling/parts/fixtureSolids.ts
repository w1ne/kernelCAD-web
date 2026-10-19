// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Envelope solids for the machining-fixture components. One builder per kind,
// read from the family table's nominal dimensions, shared by the in-memory
// envelope (envelopePart.ts) and the generated catalog STEPs
// (scripts/generateSeedCatalog.ts) so the two doors cannot drift.
//
// Orientation conventions (the connectors in familyTable.ts match):
//   t-slot-nut  bore axis +Z; the neck sits z in [-neck, 0] (top at the table
//               surface), the wide base below it.
//   stud        base at z = 0, tip at z = length, axis +Z.
//   flange-nut  flange on the seat plane, hex above, bore +Z.
//   strap-clamp slot center at the origin, nose at -slotCenter, z in [0, t].
//   step-block  base on z = 0, treads rising along +X.

import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { FixtureKind } from './familyTable';

function hexPrism(acrossFlatsMm: number, heightMm: number): OcctBackend {
  const radius = acrossFlatsMm / Math.sqrt(3);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return OcctBackend.extrudePolygon(pts, heightMm);
}

function tSlotNutSolid(dims: Record<string, number>, boreMm: number): OcctBackend {
  const length = dims.lengthMm ?? 0;
  const neck = dims.neckHeightMm ?? 0;
  const base = dims.baseHeightMm ?? 0;
  const neckBox = OcctBackend.box(length, dims.neckWidthMm ?? 0, neck, true).translate(0, 0, -neck / 2);
  const baseBox = OcctBackend.box(length, dims.baseWidthMm ?? 0, base, true).translate(0, 0, -neck - base / 2);
  const bore = OcctBackend.cylinder(neck + base, boreMm / 2).translate(0, 0, -(neck + base));
  return neckBox.union(baseBox).subtract(bore);
}

function flangeNutSolid(dims: Record<string, number>, boreMm: number): OcctBackend {
  const height = dims.heightMm ?? 0;
  const flange = OcctBackend.cylinder(dims.flangeThicknessMm ?? 0, (dims.flangeDiameterMm ?? 0) / 2);
  const body = hexPrism(dims.acrossFlatsMm ?? 0, height);
  const bore = OcctBackend.cylinder(height, boreMm / 2);
  return flange.union(body).subtract(bore);
}

function strapClampSolid(dims: Record<string, number>): OcctBackend {
  const length = dims.lengthMm ?? 0;
  const thickness = dims.thicknessMm ?? 0;
  const slotCenter = dims.slotCenterMm ?? 0;
  const bar = OcctBackend.box(length, dims.widthMm ?? 0, thickness, true)
    .translate(length / 2 - slotCenter, 0, thickness / 2);
  const slotLength = dims.slotLengthMm ?? 0;
  const slotWidth = dims.slotWidthMm ?? 0;
  const tool = OcctBackend.extrudeRoundedRect(
    slotLength,
    slotWidth,
    Math.min(slotWidth, slotLength) / 2,
    thickness + 2,
  ).translate(0, 0, -1);
  return bar.subtract(tool);
}

function stepBlockSolid(dims: Record<string, number>): OcctBackend {
  const steps = Math.max(1, Math.round(dims.steps ?? 1));
  const run = dims.runMm ?? 0;
  const rise = dims.riseMm ?? 0;
  const width = dims.widthMm ?? 0;
  const half = (dims.lengthMm ?? 0) / 2;
  let block: OcctBackend | undefined;
  for (let k = 1; k <= steps; k++) {
    // Each tread is its own run-wide column; the staircase is their union.
    const tread = OcctBackend.box(run, width, k * rise, true).translate(
      -half + (k - 1) * run + run / 2,
      0,
      (k * rise) / 2,
    );
    block = block === undefined ? tread : block.union(tread);
  }
  return block ?? OcctBackend.box(0.01, 0.01, 0.01, true);
}

export function fixtureSolid(
  kind: FixtureKind,
  dims: Record<string, number>,
  nominalMm: number,
): OcctBackend {
  if (kind === 't-slot-nut') return tSlotNutSolid(dims, nominalMm);
  if (kind === 'stud') {
    return OcctBackend.cylinder(dims.lengthMm ?? 0, nominalMm / 2);
  }
  if (kind === 'flange-nut') return flangeNutSolid(dims, nominalMm);
  if (kind === 'clamp') return strapClampSolid(dims);
  return stepBlockSolid(dims);
}
