// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// ASA (acrylonitrile styrene acrylate) is a first-class engineering grade:
// it resolves for mass (`arm.part({ material })`), FEA and the default finish.
import { describe, it, expect } from 'vitest';
import { resolveMaterial } from '../../../../src/modeling/properties/materialLibrary';
import { resolveFeaMaterial, feaMaterialTable } from '../../../../src/kernel/fea/feaMaterials';
import { ACCEPTED_MATERIAL_NAMES, defaultFinish } from '../../../../src/shared/materials/engineeringMaterials';

describe('asa material grade', () => {
  it('resolves for mass with the Bambu ASA TDS density and the abs finish', () => {
    const m = resolveMaterial('asa');
    expect(m.name).toBe('asa');
    expect(m.density).toBe(1050);
    expect(m.finish).toBe(defaultFinish('abs'));
  });

  it('resolves for FEA in solver units', () => {
    const r = resolveFeaMaterial('asa');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.name).toBe('asa');
      expect(r.props).toEqual({ E: 2120, nu: 0.35, yield: 37 });
    }
    expect(feaMaterialTable().asa).toBeDefined();
  });

  it('is listed in the accepted names', () => {
    expect(ACCEPTED_MATERIAL_NAMES).toContain('asa');
  });
});
