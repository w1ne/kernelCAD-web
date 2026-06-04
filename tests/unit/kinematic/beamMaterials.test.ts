// tests/unit/kinematic/beamMaterials.test.ts
//
// T6.2 — catalog spot-check. The closed-form beam path looks up bulk
// yield stress + Young's modulus + density per material kind; numbers
// derive from MIL-HDBK-5J (metals) and manufacturer datasheets (PLA/ABS
// /PET). When this test goes red someone touched the catalog — confirm
// the new values cite a real source before pinning the test to them.

import { describe, it, expect } from 'vitest';
import {
  MATERIAL_CATALOG,
  resolveMaterialProps,
} from '../../../src/kinematic/beamMaterials';

describe('MATERIAL_CATALOG — T6.2 spec §5 / T6 numbers', () => {
  it('lists steel at 250 MPa yield / 200 GPa modulus / 7850 kg·m^-3', () => {
    expect(MATERIAL_CATALOG.steel).toEqual({
      yieldStressPa: 250e6,
      youngsModulusPa: 200e9,
      densityKgPerM3: 7850,
    });
  });

  it('lists aluminum (6061-T6) at 270 MPa / 70 GPa / 2700 kg·m^-3', () => {
    expect(MATERIAL_CATALOG.aluminum).toEqual({
      yieldStressPa: 270e6,
      youngsModulusPa: 70e9,
      densityKgPerM3: 2700,
    });
  });

  it('lists PLA at 50 MPa / 3.5 GPa / 1240 kg·m^-3', () => {
    expect(MATERIAL_CATALOG.pla).toEqual({
      yieldStressPa: 50e6,
      youngsModulusPa: 3.5e9,
      densityKgPerM3: 1240,
    });
  });

  it('lists ABS at 40 MPa / 2.3 GPa / 1040 kg·m^-3', () => {
    expect(MATERIAL_CATALOG.abs).toEqual({
      yieldStressPa: 40e6,
      youngsModulusPa: 2.3e9,
      densityKgPerM3: 1040,
    });
  });

  it('lists PET at 55 MPa / 2.7 GPa / 1380 kg·m^-3', () => {
    expect(MATERIAL_CATALOG.pet).toEqual({
      yieldStressPa: 55e6,
      youngsModulusPa: 2.7e9,
      densityKgPerM3: 1380,
    });
  });
});

describe('resolveMaterialProps — T6.2', () => {
  it('resolves catalog kinds directly from the table', () => {
    const r = resolveMaterialProps({ material: 'steel' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.props.yieldStressPa).toBe(250e6);
  });

  it('honours custom yield + modulus declarations (MPa / GPa input)', () => {
    const r = resolveMaterialProps({
      material: 'custom',
      yieldStressMPa: 600,
      youngsModulusGPa: 210,
      density: 7800,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.props.yieldStressPa).toBe(600e6);
      expect(r.props.youngsModulusPa).toBe(210e9);
      expect(r.props.densityKgPerM3).toBe(7800);
    }
  });

  it('refuses custom without yieldStressMPa', () => {
    const r = resolveMaterialProps({
      material: 'custom',
      youngsModulusGPa: 200,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missingField).toBe('yieldStressMPa');
  });

  it('refuses custom without youngsModulusGPa', () => {
    const r = resolveMaterialProps({
      material: 'custom',
      yieldStressMPa: 300,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missingField).toBe('youngsModulusGPa');
  });

  it('honours catalog override of density / modulus when the agent passes it', () => {
    // E.g. PLA from a specific manufacturer with a measured modulus.
    const r = resolveMaterialProps({
      material: 'pla',
      youngsModulusGPa: 4.2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.props.youngsModulusPa).toBe(4.2e9);
      // Yield falls back to the catalog when not overridden.
      expect(r.props.yieldStressPa).toBe(50e6);
    }
  });
});
