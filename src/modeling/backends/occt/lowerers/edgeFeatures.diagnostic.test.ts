// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { edgeFeatureFailureDiagnostic } from './edgeFeatures';
import { refuseFromDiagnostics } from '../../../../shared/diagnostics/refuse';

describe('edgeFeatureFailureDiagnostic', () => {
  it('names max-feasible radius, limiting edge/feature, and fills details.param for refuse', () => {
    const diag = edgeFeatureFailureDiagnostic({
      kind: 'fillet',
      featureId: 'fillet_3',
      requested: 4,
      edgeCount: 1,
      kernelMessage: 'BRepFilletAPI_MakeFillet failed',
      // Succeeds at ≤ 1.25 mm so probe settles near that ceiling.
      tryValue: (v) => v <= 1.25 + 1e-9,
    });
    expect(diag.code).toBe('feature.kernel-failed');
    expect(diag.featureId).toBe('fillet_3');
    expect(diag.details?.param).toBe('radius');
    expect(diag.details?.maxFeasibleValue).toBeTypeOf('number');
    expect(diag.details?.maxFeasibleRadius).toBe(diag.details?.maxFeasibleValue);
    expect(diag.details?.edgeCount).toBe(1);
    expect(diag.hint).toMatch(/Limiting radius on limiting edge on feature fillet_3/i);
    expect(diag.hint).toMatch(/1\.2/); // max feasible ~1.25
    expect(diag.hint).toMatch(/requested 4/);
    expect(diag.hint).toMatch(/previous round/i);

    const refuse = refuseFromDiagnostics([diag]);
    expect(refuse?.location).toEqual({ featureId: 'fillet_3', param: 'radius' });
    expect(refuse?.try).toBe(diag.hint);
  });

  it('names edge set and zero max when nothing builds', () => {
    const diag = edgeFeatureFailureDiagnostic({
      kind: 'chamfer',
      featureId: 'chamfer_1',
      requested: 2,
      edgeCount: 3,
      kernelMessage: 'failed',
      tryValue: () => false,
    });
    expect(diag.details?.param).toBe('distance');
    expect(diag.details?.maxFeasibleValue).toBe(0);
    expect(diag.hint).toMatch(/limiting edge set \(3 edges\) on feature chamfer_1/i);
    expect(diag.hint).toMatch(/requested 2/);
    const refuse = refuseFromDiagnostics([diag]);
    expect(refuse?.location?.param).toBe('distance');
  });
});
