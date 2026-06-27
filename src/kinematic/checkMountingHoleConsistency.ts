// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/checkMountingHoleConsistency.ts
//
// Thin wrapper around the v0.7.4 substrate at
// src/modeling/mates/mountingHoleConsistency.ts. The substrate emits
// `ValidatorDiagnostic[]`; this wrapper translates each into the richer
// `KinematicDiagnostic` shape (canonical severity + nextAction stamped
// from the registry, source: 'local' provenance) and groups the entries
// per-mate into the `mismatches` view.

import type { Assembly } from '../modeling/capture/assembly';
import { validateMountingHoleConsistency } from '../modeling/mates/mountingHoleConsistency';
import type { ValidatorDiagnostic } from '../modeling/mates/validator';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import type {
  KinematicDiagnostic,
  MountingHoleMismatch,
  MountingHoleResult,
} from './types';

/**
 * Run the v0.7.4 fastened-mate mounting-hole consistency gate and wrap the
 * result. Synchronous compute; the `async` signature matches the rest of
 * the kc.kinematic.* surface and leaves room for future awaitable substrate
 * (FEA, hosted solver) without a breaking change.
 *
 * Returns `ok: true` when every fastened mate's bound hole diameters
 * agree; otherwise carries one
 * `kinematic.mounting-hole.diameter-mismatch` (K9) diagnostic per
 * offending mate plus the structured mismatch records on the envelope.
 *
 * Every result envelope carries `source: 'local'`. Local in-process
 * compute; no network round-trip.
 *
 * @see DIAGNOSTIC_REGISTRY['kinematic.mounting-hole.diameter-mismatch']
 */
export async function checkMountingHoleConsistency(
  arm: Assembly,
): Promise<MountingHoleResult> {
  const raw: ValidatorDiagnostic[] = validateMountingHoleConsistency(arm);
  const diagnostics: KinematicDiagnostic[] = raw.map(translateDiagnostic);
  // Coverage count: how many fastened-mate interfaces the substrate had to
  // examine. The substrate gates exactly the `type === 'fastened'` mates, so
  // this mirrors its loop. When it is 0 there was nothing to verify and a
  // green `ok` would be vacuous — emit an explicit no-coverage signal so the
  // caller can tell "0 interfaces checked" apart from "all interfaces pass".
  const checked = arm.__mates().filter((m) => m.type === 'fastened').length;
  if (checked === 0) {
    diagnostics.push(noCoverageDiagnostic());
  }
  // P3 (2026-06-01): assembly.mounting-hole.mismatch was demoted from
  // 'error' to 'info' severity (it's now advisory; the merge gate is
  // mechanism.disconnect). The mismatches view still wants to surface
  // every observed mismatch — filter by code, not by severity, so the
  // kinematic facade's `ok` flag continues to report the geometric fact
  // even though the validator no longer flags it as a blocking error.
  const mismatches: MountingHoleMismatch[] = raw
    .filter((d) => d.code === 'assembly.mounting-hole.mismatch')
    .map((d) => ({
      mateName: d.mateName ?? '<unknown>',
      sideA: {
        partName: d.partA ?? '<unknown>',
        connectorName: '<unknown>',
      },
      sideB: {
        partName: d.partB ?? '<unknown>',
        connectorName: '<unknown>',
      },
      reason: 'see diagnostic.message',
    }));
  return {
    ok: mismatches.length === 0,
    mismatches,
    checked,
    diagnostics,
    source: 'local',
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
  const code: DiagnosticCode = 'kinematic.mounting-holes.no-coverage';
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
