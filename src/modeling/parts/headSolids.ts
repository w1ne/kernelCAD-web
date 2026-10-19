// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Head solids shared by the in-memory envelope (envelopePart.ts) and the
// generated catalog STEPs (scripts/generateSeedCatalog.ts), so the two doors
// cannot drift. The countersunk head is the one head that is not a cylinder:
// an ISO 10642 head seats in a 90° cone, so its envelope is the frustum that
// fills that cone, rim on the seat plane and small end at the nominal Ø.

import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Param } from '../../shared/intent/types';

function mm(evaluated: number): Param {
  return { expression: String(evaluated), unit: 'mm', evaluated };
}

/**
 * Countersunk head, seated: the rim (Ø headDiameterMm) lies on the seat plane
 * z = 0 and the cone runs down to Ø nominalMm at z = -headHeightMm, matching
 * the 90° countersink a flat head seats in. The shank continues below that.
 */
export function countersunkHeadSolid(
  nominalMm: number,
  headDiameterMm: number,
  headHeightMm: number,
): OcctBackend {
  const profile = OcctBackend.fromSketchCommands([
    { kind: 'moveTo', x: mm(nominalMm / 2), y: mm(-headHeightMm) },
    { kind: 'lineTo', x: mm(headDiameterMm / 2), y: mm(0) },
    { kind: 'lineTo', x: mm(0), y: mm(0) },
    { kind: 'lineTo', x: mm(0), y: mm(-headHeightMm) },
    { kind: 'close' },
  ]);
  return OcctBackend.revolveFromSketch(profile, 360);
}

/** Countersunk screw envelope: seated head cone plus the shank below it.
 *  `lengthMm` is measured from the head's rim plane (ISO 10642 practice), so
 *  the tip sits at z = -lengthMm. */
export function countersunkScrewSolid(
  nominalMm: number,
  headDiameterMm: number,
  headHeightMm: number,
  lengthMm: number,
): OcctBackend {
  const head = countersunkHeadSolid(nominalMm, headDiameterMm, headHeightMm);
  const shankLength = Math.max(lengthMm - headHeightMm, 1e-6);
  const shank = OcctBackend.cylinder(shankLength, nominalMm / 2).translate(0, 0, -lengthMm);
  return head.union(shank);
}

/** Hex head (ISO 4017): a prism across flats `acrossFlatsMm` and `headHeightMm`
 *  tall, with a flat facing +X — the same orientation the nut prism uses, so
 *  the in-memory envelope and the generated STEP agree. */
export function hexHeadSolid(acrossFlatsMm: number, headHeightMm: number): OcctBackend {
  const r = acrossFlatsMm / Math.sqrt(3);
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return OcctBackend.extrudePolygon(pts, headHeightMm);
}

/** Hex head bolt envelope: hex head on the seat plane z = 0, shank below. */
export function hexHeadBoltSolid(
  nominalMm: number,
  acrossFlatsMm: number,
  headHeightMm: number,
  lengthMm: number,
): OcctBackend {
  const head = hexHeadSolid(acrossFlatsMm, headHeightMm);
  const shank = OcctBackend.cylinder(lengthMm, nominalMm / 2).translate(0, 0, -lengthMm);
  return head.union(shank);
}

/** Headless envelope (set screw, threaded rod): a plain cylinder from the
 *  first end at z = 0 down to the second end at z = -lengthMm. */
export function headlessSolid(nominalMm: number, lengthMm: number): OcctBackend {
  return OcctBackend.cylinder(lengthMm, nominalMm / 2).translate(0, 0, -lengthMm);
}
