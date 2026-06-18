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
    diagnostics,
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
