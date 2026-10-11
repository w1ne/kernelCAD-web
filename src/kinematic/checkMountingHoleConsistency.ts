// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/checkMountingHoleConsistency.ts
//
// Wrapper around the hole-record gate (src/modeling/mates/
// mountingHoleConsistency.ts) and the geometric hole-alignment gate
// (mountingHoleAlignment.ts). Each substrate diagnostic is translated into
// the richer `KinematicDiagnostic` shape (canonical severity + nextAction
// stamped from the registry, source: 'local' provenance); the `mismatches`
// view lists only real incompatibilities.

import type { Assembly } from '../modeling/capture/assembly';
import {
  observeFastenedMateHoles,
  validateMountingHoleConsistency,
  type FastenedMateHoleObservation,
  type SideObservation,
} from '../modeling/mates/mountingHoleConsistency';
import { validateMountingHoleAlignment } from '../modeling/mates/mountingHoleAlignment';
import type { ValidatorDiagnostic } from '../modeling/mates/validator';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import type {
  KinematicDiagnostic,
  MountingHoleMismatch,
  MountingHoleResult,
  MountingHoleSideState,
} from './types';

/**
 * Run the fastened-mate mounting-hole gates and wrap the result.
 *
 * Returns `ok: true` when every fastened mate's holes can take one
 * fastener (record gate) and no two holes at a contact face sit side by
 * side without being coaxial (alignment gate); otherwise the structured
 * mismatch records name both parts, connectors and the reason.
 *
 * Every result envelope carries `source: 'local'`. Local in-process
 * compute; no network round-trip.
 *
 * @see DIAGNOSTIC_REGISTRY['kinematic.mounting-hole.diameter-mismatch']
 */
export async function checkMountingHoleConsistency(
  arm: Assembly,
): Promise<MountingHoleResult> {
  const raw: ValidatorDiagnostic[] = [
    ...validateMountingHoleConsistency(arm),
    ...await validateMountingHoleAlignment(arm),
  ];
  const diagnostics: KinematicDiagnostic[] = raw.map(translateDiagnostic);
  // Coverage count: how many fastened-mate interfaces the substrate had to
  // examine. When it is 0 there was nothing to verify and a green `ok`
  // would be vacuous — emit an explicit no-coverage signal so the caller
  // can tell "0 interfaces checked" apart from "all interfaces pass".
  const observations = observeFastenedMateHoles(arm);
  if (observations.length === 0) {
    diagnostics.push(noCoverageDiagnostic());
  }
  // Only REAL incompatibilities fail the gate: a record mismatch, or two
  // holes at the contact face that are not coaxial. A side the record gate
  // could not resolve (`assembly.mounting-hole.unverified`, e.g. a vec3
  // connector origin) and a hole-free rigid bond are never mismatches.
  const mismatches: MountingHoleMismatch[] = [
    ...observations.filter((o) => o.verdict === 'mismatch').map(recordMismatch),
    ...raw.filter((d) => d.code === 'assembly.mounting-hole.misaligned').map(alignmentMismatch),
  ];
  return {
    ok: mismatches.length === 0,
    mismatches,
    checked: observations.length,
    diagnostics,
    source: 'local',
  };
}

function sideState(side: SideObservation): MountingHoleSideState {
  return {
    partName: side.partName,
    connectorName: side.connectorName,
    ...(side.boundFaceName !== undefined ? { boundFaceName: side.boundFaceName } : {}),
    ...(side.hole !== undefined ? { hole: { diameterMm: side.hole.diameterMm, depth: side.hole.depth } } : {}),
  };
}

function recordMismatch(observation: FastenedMateHoleObservation): MountingHoleMismatch {
  const blank = observation.sideA.hole === undefined || observation.sideB.hole === undefined;
  return {
    mateName: observation.mateName,
    sideA: sideState(observation.sideA),
    sideB: sideState(observation.sideB),
    reason: blank ? 'no-hole-on-bound-face' : 'diameter-mismatch',
  };
}

function alignmentMismatch(d: ValidatorDiagnostic): MountingHoleMismatch {
  return {
    mateName: d.mateName ?? '',
    sideA: { partName: d.partA ?? '', connectorName: '' },
    sideB: { partName: d.partB ?? '', connectorName: '' },
    reason: 'misaligned',
  };
}

/**
 * Build the zero-coverage info diagnostic. Stamped from the registry the same
 * way as the substrate-derived ones (canonical severity + nextAction), with
 * source: 'local' provenance. `ok` is deliberately left untouched (a clean
 * assembly with no fastened mates still reports ok:true); this diagnostic is
 * the signal that the green carries no verification behind it.
 */
function noCoverageDiagnostic(): KinematicDiagnostic {
  const code: DiagnosticCode = 'kinematic.mounting-hole.no-coverage';
  const registryEntry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity: 'info',
    message: 'No fastened mates found; nothing was checked.',
    hint: registryEntry.hintTemplate,
    nextAction: registryEntry.nextAction,
    source: 'local',
  };
}

/**
 * Translate a ValidatorDiagnostic to the KinematicDiagnostic shape:
 *
 *  - severity: ValidatorDiagnostic uses 'warning' (full word); the shared
 *    diagnostic vocabulary uses 'warn'. Normalize here.
 *  - nextAction: filled from the catalogue registry by code.
 */
function translateDiagnostic(d: ValidatorDiagnostic): KinematicDiagnostic {
  const code = d.code as DiagnosticCode;
  const registryEntry = DIAGNOSTIC_REGISTRY[code];
  const severity: KinematicDiagnostic['severity'] =
    d.severity === 'warning' ? 'warn' : d.severity;
  return {
    code,
    severity,
    message: d.message,
    hint: d.hint,
    nextAction: registryEntry.nextAction,
    element: d.mateName ?? d.partName,
    source: 'local',
  };
}
