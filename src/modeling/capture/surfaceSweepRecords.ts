// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId, FeatureKind, FeatureRef, Param } from '../../shared/intent/types';
import type { Curve3DMetadata } from '../../shared/intent/curve3dRecord';
import type { CoonsPatchData, SurfaceId, SurfaceRecord } from '../../shared/intent/surfaceRecord';
import type { VariableSweepMetadata, VariableSweepSection } from '../../shared/intent/variableSweepRecord';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';

export interface SweepFeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

export interface VariableSweepCaptureArgs {
  spineId: FeatureId;
  sections: { t: number; profileId: FeatureId }[];
  closed?: boolean;
  continuity?: 'C0' | 'C1' | 'C2';
}

export interface SurfaceFromBoundaryCaptureArgs {
  curveIds: [FeatureId, FeatureId, FeatureId, FeatureId];
  continuity: ['C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2'];
  sampling?: number;
}

export interface CurveEndpointPair {
  start: [number, number, number];
  end: [number, number, number];
}

export interface SurfaceBoundaryResolvers {
  getCurveMetadata(curveId: FeatureId): Curve3DMetadata | undefined;
  evaluateCurveEndpoints(curveId: FeatureId, metadata: Curve3DMetadata): CurveEndpointPair;
}

export function buildVariableSweepFeatureSpec(args: VariableSweepCaptureArgs): SweepFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

  if (args.sections.length < 2) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.variable-sweep.sections-not-spanning',
      severity: 'error',
      message: `variableSweep: need at least 2 sections; got ${args.sections.length}.`,
      hint: HINT_TEMPLATES['feature.variable-sweep.sections-not-spanning'].template,
    });
  } else {
    for (let i = 1; i < args.sections.length; i++) {
      if (args.sections[i].t <= args.sections[i - 1].t) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.variable-sweep.sections-out-of-order',
          severity: 'error',
          message: `variableSweep: sections must be strictly increasing in t; got t[${i}]=${args.sections[i].t} <= t[${i - 1}]=${args.sections[i - 1].t}.`,
          hint: HINT_TEMPLATES['feature.variable-sweep.sections-out-of-order'].template,
        });
        break;
      }
    }
    const first = args.sections[0].t;
    const last = args.sections[args.sections.length - 1].t;
    if (Math.abs(first - 0) > 1e-9 || Math.abs(last - 1) > 1e-9) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.variable-sweep.sections-not-spanning',
        severity: 'error',
        message: `variableSweep: sections must span [0, 1] inclusive; got t[0]=${first}, t[last]=${last}.`,
        hint: HINT_TEMPLATES['feature.variable-sweep.sections-not-spanning'].template,
      });
    }
  }

  const inputs: Record<string, FeatureRef> = {
    spine: { kind: 'feature', id: args.spineId },
  };
  args.sections.forEach((s, i) => {
    inputs[`section_${i}`] = { kind: 'feature', id: s.profileId };
  });

  const sweepMeta: VariableSweepMetadata = {
    spineRef: { kind: 'feature', id: args.spineId },
    sections: args.sections.map(
      (s): VariableSweepSection => ({
        t: s.t,
        profileRef: { kind: 'feature', id: s.profileId },
      }),
    ),
    ...(args.closed !== undefined ? { closed: args.closed } : {}),
    continuity: args.continuity ?? 'C1',
  };

  return {
    kind: 'variableSweep',
    params: {},
    inputs,
    metadata: {
      variableSweep: sweepMeta,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    },
  };
}

export function buildCoonsPatchSurfaceRecord(
  id: SurfaceId,
  args: SurfaceFromBoundaryCaptureArgs,
  resolvers: SurfaceBoundaryResolvers,
): SurfaceRecord {
  const curveMetas = args.curveIds.map((curveId) => resolvers.getCurveMetadata(curveId));
  const corners = curveMetas.map((metadata, i): CurveEndpointPair | undefined => {
    if (!metadata) return undefined;
    try {
      return resolvers.evaluateCurveEndpoints(args.curveIds[i], metadata);
    } catch {
      const cp = metadata.controlPoints;
      return {
        start: cp[0] as [number, number, number],
        end: cp[cp.length - 1] as [number, number, number],
      };
    }
  });

  const diagnostics: CompilerDiagnostic[] = [];
  if (corners.every((c): c is CurveEndpointPair => c !== undefined)) {
    const eps = 1e-6;
    const close = (a: [number, number, number], b: [number, number, number]): boolean =>
      Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps;
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      if (!close(corners[i].end, corners[next].start)) {
        diagnostics.push({
          target: 'export-occt',
          code: 'feature.surface-from-boundary.corner-mismatch',
          severity: 'error',
          message:
            `surfaceFromBoundary: curve[${i}].end (${corners[i].end.join(',')}) does not match curve[${next}].start (${corners[next].start.join(',')}) within 1e-6 mm.`,
          hint: HINT_TEMPLATES['feature.surface-from-boundary.corner-mismatch'].template,
        });
      }
    }
  }

  const data: CoonsPatchData = {
    kind: 'coonsPatch',
    curveIds: args.curveIds,
    continuity: args.continuity,
    ...(args.sampling !== undefined ? { sampling: args.sampling } : {}),
  };
  return {
    id,
    kind: 'coonsPatch',
    params: {},
    data,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

export function isCurve3DMetadataLite(value: unknown): value is Curve3DMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const metadata = value as { controlPoints?: unknown; degree?: unknown };
  if (!Array.isArray(metadata.controlPoints) || metadata.controlPoints.length === 0) return false;
  if (typeof metadata.degree !== 'number' || !Number.isInteger(metadata.degree) || metadata.degree < 1) return false;
  return true;
}
