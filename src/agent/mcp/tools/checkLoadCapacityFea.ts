// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkLoadCapacityFea.ts
//
// verify({ check: 'load-capacity', mode: 'fea' }): the load-capacity check
// answered by the solid FEA study the script declares (`feaStudy`), in the
// SAME result shape as the closed-form beam mode — ok / safetyFactor /
// elements[] / failures[] with stresses in Pa — so an agent reads one
// verdict whichever method produced it. Elements are the named stress
// regions (`@kc[...]` faces) instead of beam parts. FEA-only facts
// (deflection, mesh trust, the clamp-edge peak, heatmaps) ride along in
// `fea`.

import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeaSummary } from '../../../kernel/fea/types';
import { runFeaTool, type RunFeaInput } from './runFea';

/** Same floor as the beam mode when neither the call nor the study sets one. */
const DEFAULT_SF_THRESHOLD = 1.5;

export interface FeaLoadCapacityInput {
  file?: string;
  code?: string;
  /** feaStudy name; defaults to the last declared study. */
  study?: string;
  mesh_size?: number;
  /** Render the stress heatmap PNGs (default false here: a verdict). */
  heatmaps?: boolean;
  /** Pass floor. Default: the study's minSafetyFactor, else 1.5. */
  safety_factor_threshold?: number;
}

/** One stress region, in the beam mode's element shape plus where it is. */
export interface FeaLoadCapacityElement {
  partName: string;
  stressPa: number;
  yieldPa: number;
  safetyFactor: number;
  at: [number, number, number];
}

export interface FeaLoadCapacityFailure {
  element: string;
  elementKind: 'region';
  stress: number;
  yieldStress: number;
  reason: 'stress-exceeds-yield';
}

export type FeaLoadCapacityOutput =
  | {
      ok: boolean;
      source: 'local';
      method: 'fea';
      study: string;
      material: string;
      safetyFactor: number;
      threshold: number;
      elements: FeaLoadCapacityElement[];
      failures: FeaLoadCapacityFailure[];
      fea: {
        peakStressPa: number;
        peakAt: [number, number, number];
        maxDisplacementMm: number;
        meshTrusted: boolean;
        trustReasons: string[];
        elementCount: number;
        meshSizeMm: number;
        /** Raw peak at the clamped edge of a fixed face (singular, mesh-dependent). */
        peakAtSupportPa?: number;
        peakAtSupportRegion?: string;
        images?: string[];
      };
      diagnostics: CompilerDiagnostic[];
    }
  | { ok: false; source: 'local'; method: 'fea'; error: string; errorCode?: string; diagnostics?: CompilerDiagnostic[] };

const MPA = 1e6;

export async function checkLoadCapacityFea(input: FeaLoadCapacityInput): Promise<FeaLoadCapacityOutput> {
  const feaInput: RunFeaInput = {
    ...(input.file !== undefined ? { file: input.file } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.study !== undefined ? { study: input.study } : {}),
    ...(input.mesh_size !== undefined ? { mesh_size: input.mesh_size } : {}),
    heatmaps: input.heatmaps ?? false,
  };
  const run = await runFeaTool(feaInput);
  const s: FeaSummary | undefined = run.summary;
  if (!run.ok || s === undefined) {
    const first = run.diagnostics?.find(d => d.severity === 'error');
    return {
      ok: false,
      source: 'local',
      method: 'fea',
      error: run.error ?? first?.message ?? 'FEA study did not solve.',
      ...(run.errorCode ?? first?.code ? { errorCode: (run.errorCode ?? first?.code) as string } : {}),
      ...(run.diagnostics ? { diagnostics: run.diagnostics } : {}),
    };
  }

  const yieldPa = s.material.yield * MPA;
  const threshold = input.safety_factor_threshold ?? s.minSafetyFactorRequired ?? DEFAULT_SF_THRESHOLD;
  const elements: FeaLoadCapacityElement[] = s.hotSpots.map(h => ({
    partName: h.region,
    stressPa: h.maxVonMisesMPa * MPA,
    yieldPa,
    safetyFactor: h.safetyFactor,
    at: h.at,
  }));
  const failures: FeaLoadCapacityFailure[] = elements
    .filter(e => e.safetyFactor < threshold)
    .map(e => ({ element: e.partName, elementKind: 'region', stress: e.stressPa, yieldStress: yieldPa, reason: 'stress-exceeds-yield' }));
  const diagnostics: CompilerDiagnostic[] = [...(run.diagnostics ?? [])];
  if (s.minSafetyFactor < threshold && !diagnostics.some(d => d.code === 'fea.safety-factor.below-min')) {
    diagnostics.push({
      target: 'export-occt',
      code: 'fea.safety-factor.below-min',
      severity: 'error',
      message:
        `FEA study '${s.study}': safety factor ${s.minSafetyFactor.toFixed(2)} < threshold ${threshold} ` +
        `(peak ${s.maxVonMisesMPa.toFixed(1)} MPa vs ${s.material.name} yield ${s.material.yield} MPa` +
        `${failures[0] ? ` at ${failures[0].element}` : ''}). Thicken or fillet that region, switch material, or reduce the load.`,
    } as CompilerDiagnostic);
  }

  return {
    ok: s.minSafetyFactor >= threshold,
    source: 'local',
    method: 'fea',
    study: s.study,
    material: s.material.name,
    safetyFactor: s.minSafetyFactor,
    threshold,
    elements,
    failures,
    fea: {
      peakStressPa: s.maxVonMisesMPa * MPA,
      peakAt: s.maxVonMisesAt,
      maxDisplacementMm: s.maxDisplacementMm,
      meshTrusted: s.trust.meshTrusted,
      trustReasons: [...s.trust.reasons],
      elementCount: s.elementCount,
      meshSizeMm: s.meshSizeMm,
      ...(s.peakAtSupportMPa !== undefined ? { peakAtSupportPa: s.peakAtSupportMPa * MPA } : {}),
      ...(s.peakAtSupportRegion !== undefined ? { peakAtSupportRegion: s.peakAtSupportRegion } : {}),
      ...(run.images ? { images: run.images } : {}),
    },
    diagnostics,
  };
}
