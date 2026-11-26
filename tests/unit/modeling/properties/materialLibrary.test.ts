// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The material library ties a material NAME to an engineering density and a
// default finish, through the single registry every material consumer shares.
// These tests hold five promises:
//   - a grade resolves to the RIGHT density (mild-steel → 7850);
//   - bulk aliases (steel / aluminum / aluminium / pet) resolve to the SAME
//     grade, so mass, FEA, BOM and finishes speak one vocabulary;
//   - the coverage gaps are handled honestly (petg has density, no finish;
//     brass is a finish, not an assignable material) — no invented numbers;
//   - an unknown name throws, naming the accepted names, never a silent
//     water/default fallback;
//   - `.finish(<material>)` applies the same default finish arm.part does.
// The final `describe` is the drift gate across registry, catalog, finishes
// and the FEA table.

import { describe, it, expect } from 'vitest';
import {
  MATERIAL_FINISH,
  MATERIAL_ALIASES,
  ACCEPTED_MATERIAL_NAMES,
  resolveMaterial,
  tryResolveMaterial,
  unknownMaterialMessage,
} from '../../../../src/modeling/properties/materialLibrary';
import {
  ENGINEERING_MATERIAL_NAMES,
  catalogRowOf,
  engineeringMaterialProps,
  materialFamily,
} from '../../../../src/shared/materials/engineeringMaterials';
import { MATERIAL_CATALOG } from '../../../../src/kinematic/beamMaterials';
import { FEA_MATERIAL_NAMES, resolveFeaMaterial } from '../../../../src/kernel/fea/feaMaterials';
import { FINISHES, isFinishToken } from '../../../../src/shared/render/finishes';
import { isKernelError } from '../../../../src/shared/intent/kernelError';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';

describe('materialLibrary — name → { density, finish }', () => {
  it('resolves mild-steel to the catalog density (7850) and the steel finish', () => {
    const m = resolveMaterial('mild-steel');
    expect(m.name).toBe('mild-steel');
    expect(m.density).toBe(7850);
    expect(m.density).toBe(MATERIAL_CATALOG.steel.densityKgPerM3);
    expect(m.finish).toBe('steel');
  });

  it('resolves every grade to its registry density', () => {
    for (const grade of ENGINEERING_MATERIAL_NAMES) {
      const m = resolveMaterial(grade);
      expect(m.name).toBe(grade);
      expect(m.density).toBe(engineeringMaterialProps(grade).densityKgPerM3);
    }
  });

  it('resolves the bulk aliases to the SAME grade', () => {
    const cases: Array<[string, string, number]> = [
      ['steel', 'mild-steel', 7850],
      ['aluminum', 'aluminum-6061', 2700],
      ['aluminium', 'aluminum-6061', 2700],
      ['pet', 'petg', 1380],
    ];
    for (const [alias, grade, density] of cases) {
      const a = resolveMaterial(alias);
      const g = resolveMaterial(grade);
      expect(a.name).toBe(grade);
      expect(a.density).toBe(density);
      expect(a.density).toBe(g.density);
      expect(a.finish).toBe(g.finish);
      // `requested` preserves the caller's spelling for provenance.
      expect(a.requested).toBe(alias);
    }
  });

  it('classifies every grade as metal or polymer for process policy', () => {
    const metals = ENGINEERING_MATERIAL_NAMES.filter((grade) => materialFamily(grade) === 'metal');
    expect(metals).toEqual([
      'mild-steel',
      'aluminum-6061',
      'stainless-304',
      'stainless-316',
      'copper',
      'brass',
    ]);
    for (const grade of ENGINEERING_MATERIAL_NAMES) {
      expect(['metal', 'polymer']).toContain(materialFamily(grade));
    }
  });

  it('resolves hardware and electronics grades with real densities (issue #1794)', () => {
    const expected: Array<[string, number, string]> = [
      ['fr4', 1850, 'fr4'],
      ['tpu-95a', 1210, 'rubber'],
      ['silicone', 1150, 'rubber'],
      ['stainless-304', 8000, 'stainless'],
      ['stainless-316', 8000, 'stainless'],
      ['copper', 8940, 'copper'],
      ['brass', 8530, 'brass'],
      ['polycarbonate', 1200, 'polycarbonate'],
      ['delrin', 1410, 'delrin'],
      ['acrylic', 1180, 'acrylic'],
    ];
    for (const [name, density, finish] of expected) {
      const m = resolveMaterial(name);
      expect(m.name).toBe(name);
      expect(m.density).toBe(density);
      expect(m.finish).toBe(finish);
    }
  });

  it('resolves the hardware/electronics abbreviations to the same grade', () => {
    const cases: Array<[string, string, number]> = [
      ['stainless', 'stainless-304', 8000],
      ['fr-4', 'fr4', 1850],
      ['tpu', 'tpu-95a', 1210],
      ['pc', 'polycarbonate', 1200],
      ['pom', 'delrin', 1410],
      ['pmma', 'acrylic', 1180],
    ];
    for (const [alias, grade, density] of cases) {
      const a = resolveMaterial(alias);
      const g = resolveMaterial(grade);
      expect(a.name).toBe(grade);
      expect(a.density).toBe(density);
      expect(a.density).toBe(g.density);
      expect(a.finish).toBe(g.finish);
      expect(a.requested).toBe(alias);
    }
  });

  it('keeps a real multi-process LabWired/KernelCAD enclosure BOM authorable', () => {
    // The concrete #1794 failure: assigning fr4 / tpu-95a / stainless-304 to
    // assembly parts used to throw "not a known material".
    for (const material of ['fr4', 'tpu-95a', 'stainless-304', 'aluminum-6061', 'petg']) {
      expect(() => resolveMaterial(material)).not.toThrow();
    }
  });

  it('the aluminum-6061 finish token is the UK-spelled appearance token', () => {
    expect(resolveMaterial('aluminum-6061').finish).toBe('aluminium');
    expect(isFinishToken('aluminium')).toBe(true);
  });

  it('resolves nylon from its own datasheet row (no catalog row)', () => {
    const m = resolveMaterial('nylon');
    expect(m.density).toBe(1010);
    expect(m.finish).toBe('nylon');
    expect(catalogRowOf('nylon')).toBeNull();
  });

  it('handles the density-without-finish gap honestly (petg)', () => {
    const m = resolveMaterial('petg');
    expect(m.density).toBe(1380);
    // No natural petg finish exists — the library says so rather than
    // inventing a nearest-looking token.
    expect(m.finish).toBeUndefined();
  });

  it('refuses a finish-without-density token as a material (glass)', () => {
    expect(isFinishToken('glass')).toBe(true);
    const r = tryResolveMaterial('glass');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("'glass' is not a known material");
      expect(r.hint).toContain(".finish('glass')");
      expect(r.hint).toContain('no catalog density');
    }
  });

  it('accepts brass and copper as grades as well as finishes (issue #1794)', () => {
    // Hardware stock declares the grade; the appearance still uses the same
    // named finish.
    for (const name of ['brass', 'copper']) {
      expect(isFinishToken(name)).toBe(true);
      const m = resolveMaterial(name);
      expect(m.name).toBe(name);
      expect(m.finish).toBe(name);
      expect(m.density).toBeGreaterThan(0);
    }
  });

  it('throws a listing diagnostic for an unknown material — no silent fallback', () => {
    let thrown: unknown;
    try {
      resolveMaterial('unobtanium');
    } catch (e) {
      thrown = e;
    }
    expect(isKernelError(thrown)).toBe(true);
    if (isKernelError(thrown)) {
      expect(thrown.code).toBe('feature.invalid-args');
      expect(thrown.message).toContain('unobtanium');
      expect(thrown.message).toContain('mild-steel');
      expect(thrown.message).toContain('aluminium');
      expect(thrown.message).toContain('nylon');
    }
    // A capitalized spelling is a typo, not a silent match.
    expect(() => resolveMaterial('Steel')).toThrow();
    expect(() => resolveMaterial('')).toThrow();
    expect(() => resolveMaterial(undefined)).toThrow();
    // Object prototype keys are not aliases.
    expect(() => resolveMaterial('toString')).toThrow();
  });

  it('unknownMaterialMessage names the offending value and the valid list', () => {
    const msg = unknownMaterialMessage('foo');
    expect(msg).toContain("'foo'");
    for (const name of ACCEPTED_MATERIAL_NAMES) expect(msg).toContain(name);
  });
});

describe('Shape.finish(<material name>)', () => {
  const finishOf = (name: string) => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const shape = kcad.box(1, 1, 1).finish(name as never);
    return session.getRecords().find((r) => r.id === shape.id)?.metadata?.material;
  };

  it('applies the material default finish for a grade or alias', () => {
    expect(finishOf('aluminum-6061')?.baseColor).toBe(FINISHES.aluminium.baseColor);
    expect(finishOf('aluminum')?.baseColor).toBe(FINISHES.aluminium.baseColor);
    expect(finishOf('mild-steel')?.baseColor).toBe(FINISHES.steel.baseColor);
    // A plain finish token still wins where the names coincide.
    expect(finishOf('steel')?.baseColor).toBe(FINISHES.steel.baseColor);
  });

  it('refuses a material with no finish and an unknown name', () => {
    expect(() => finishOf('petg')).toThrow(/not a known finish/);
    expect(() => finishOf('unobtanium')).toThrow(/not a known finish/);
  });
});

// --- Drift gate: registry, catalog, finishes and FEA must agree. ---
describe('material registry drift', () => {
  it('MATERIAL_FINISH is keyed by exactly the registry grades', () => {
    expect(Object.keys(MATERIAL_FINISH).sort()).toEqual([...ENGINEERING_MATERIAL_NAMES].sort());
  });

  it('the FEA table lists exactly the registry grades', () => {
    expect([...FEA_MATERIAL_NAMES]).toEqual([...ENGINEERING_MATERIAL_NAMES]);
  });

  it('every non-undefined finish mapping resolves to a real FINISHES token', () => {
    for (const [material, finish] of Object.entries(MATERIAL_FINISH)) {
      if (finish === undefined) continue;
      expect(
        isFinishToken(finish),
        `Material '${material}' maps to finish '${finish}', which is not in FINISHES. ` +
          '.finish() with it would throw at runtime.',
      ).toBe(true);
    }
  });

  it('every grade with a catalog row reads it live', () => {
    for (const grade of ENGINEERING_MATERIAL_NAMES) {
      const row = catalogRowOf(grade);
      if (row === null) continue;
      expect(engineeringMaterialProps(grade)).toBe(MATERIAL_CATALOG[row]);
    }
  });

  it('every alias resolves to a real grade in mass AND FEA', () => {
    for (const [alias, canonical] of Object.entries(MATERIAL_ALIASES)) {
      expect((ENGINEERING_MATERIAL_NAMES as readonly string[]).includes(canonical)).toBe(true);
      expect(resolveMaterial(alias).name).toBe(canonical);
      const fea = resolveFeaMaterial(alias);
      expect(fea.ok && fea.name).toBe(canonical);
    }
  });

  it('every accepted name resolves in mass and FEA to the same grade', () => {
    for (const name of ACCEPTED_MATERIAL_NAMES) {
      const mass = resolveMaterial(name);
      const fea = resolveFeaMaterial(name);
      expect(fea.ok, name).toBe(true);
      if (fea.ok) expect(fea.name).toBe(mass.name);
      expect(mass.density).toBeGreaterThan(0);
    }
  });
});
