// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/flight/runFlightGate.ts
//
// Runs a flight study against a built model, and the evaluate-time gate:
// the flight sibling of `runFeaGateOnModel`, plugged into the same seam in
// `evaluateAndBuildScript`. Opt-in: only studies that declare
// `minStabilityCal` run at evaluate, and only the stability part (mass, CG,
// Barrowman CP; no trajectory). A margin that could not be computed is
// `flight.stability.unresolved` at ERROR, never a pass.

import type { ShapeBackend } from '../../../kernel/backends/backend';
import { runFlightStudy, type FlightRunResult, type RunFlightOptions } from '../../../kernel/flight/runFlight';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FlightStudyMetadata } from '../../../shared/intent/flightStudyRecord';
import type { BuiltModel } from '../../buildModel';
import { findFlightStudies, flightBodies, unresolvedParts, type FoundFlightStudy } from './flightBodies';

export interface FlightModelView {
  records: readonly FeatureRecord[];
  shapes: ReadonlyMap<string, ShapeBackend>;
  assemblies: ReadonlyMap<string, unknown>;
}

function fail(study: FoundFlightStudy, code: 'flight.mass.unavailable' | 'flight.study.part-unresolved', message: string): FlightRunResult {
  const d: CompilerDiagnostic = { target: 'export-occt', code, severity: 'error', message, hint: HINT_TEMPLATES[code].template, featureId: study.recordId };
  return { ok: false, rows: [], diagnostics: [d] };
}

/** True when the study can run without any geometry (all masses / dimensions declared). */
function declaredOnly(m: FlightStudyMetadata): boolean {
  return m.dryMassKg !== undefined && m.aero.refDiameterMm !== undefined && (m.aero.cd !== 'auto' || m.aero.lengthMm !== undefined);
}

/** Run one study on a built model (bodies from its lowered geometry). */
export function runFlightOnModel(
  view: FlightModelView,
  study: FoundFlightStudy,
  metadata: FlightStudyMetadata = study.metadata,
  opts: RunFlightOptions = {},
): FlightRunResult {
  const got = flightBodies({ ...study, metadata }, view.shapes, view.assemblies);
  if (!got.ok) {
    if (declaredOnly(metadata)) return runFlightStudy(metadata, [], { ...opts, featureId: study.recordId });
    return fail(study, 'flight.mass.unavailable', `flightStudy '${metadata.name}': ${got.reason}, and dryMassKg / refDiameterMm are not both declared.`);
  }
  const missing = unresolvedParts(metadata, got.partNames);
  if (missing.length > 0) {
    return fail(study, 'flight.study.part-unresolved', `flightStudy '${metadata.name}': no part named ${missing.map(n => `'${n}'`).join(', ')} in assembly '${metadata.assembly}'. Parts: ${got.partNames.join(', ')}.`);
  }
  return runFlightStudy(metadata, got.bodies, { ...opts, featureId: study.recordId });
}

export interface FlightGateReport {
  diagnostics: CompilerDiagnostic[];
  studies: Array<{ study: string; minStabilityCal: number; stabilityCal?: number }>;
}

/** Evaluate-time stability gate for every study that declares minStabilityCal. */
export function runFlightGateOnModel(model: BuiltModel): FlightGateReport | undefined {
  const gated = findFlightStudies(model.records).filter(s => s.metadata.minStabilityCal !== undefined);
  if (gated.length === 0) return undefined;
  const view: FlightModelView = { records: model.records, shapes: model.shapes, assemblies: model.session.assemblies };
  const report: FlightGateReport = { diagnostics: [], studies: [] };
  for (const study of gated) {
    let r: FlightRunResult;
    try {
      r = runFlightOnModel(view, study, study.metadata, { stabilityOnly: true });
    } catch (e) {
      r = fail(study, 'flight.mass.unavailable', `flightStudy '${study.metadata.name}': the vehicle could not be measured (${e instanceof Error ? e.message : String(e)}).`);
    }
    report.diagnostics.push(...r.diagnostics.filter(d => d.code.startsWith('flight.stability') || d.severity === 'error'));
    const cal = r.vehicle?.stability?.minCal;
    report.studies.push({ study: study.metadata.name, minStabilityCal: study.metadata.minStabilityCal!, ...(cal !== undefined ? { stabilityCal: cal } : {}) });
  }
  return report;
}
