// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The material library ties a material NAME to an engineering density and a
// default finish. These tests hold four promises:
//   - a named material resolves to the RIGHT catalog density (steel → 7850);
//   - both spellings (aluminum / aluminium) resolve to the SAME material;
//   - the coverage gaps are handled honestly (pet has density, no finish;
//     brass is a finish, not an assignable material) — no invented numbers;
//   - an unknown name throws, naming the valid materials, never a silent
//     water/default fallback.
// The final `describe` is the drift gate: it fails the moment the density
// catalog and the finish table disagree with what this library claims.

import { describe, it, expect } from 'vitest';
import {
  MATERIAL_FINISH,
  MATERIAL_ALIASES,
  ACCEPTED_MATERIAL_NAMES,
  resolveMaterial,
  tryResolveMaterial,
  unknownMaterialMessage,
} from '../../../../src/modeling/properties/materialLibrary';
import { MATERIAL_CATALOG, CATALOG_KINDS } from '../../../../src/kinematic/beamMaterials';
import { isFinishToken } from '../../../../src/shared/render/finishes';
import { isKernelError } from '../../../../src/shared/intent/kernelError';

describe('materialLibrary — name → { density, finish }', () => {
  it('resolves steel to the catalog density (7850) and the steel finish', () => {
    const m = resolveMaterial('steel');
    expect(m.name).toBe('steel');
    expect(m.density).toBe(7850);
    expect(m.density).toBe(MATERIAL_CATALOG.steel.densityKgPerM3);
    expect(m.finish).toBe('steel');
  });

  it('resolves every catalog material to its catalog density', () => {
    for (const kind of CATALOG_KINDS) {
      const m = resolveMaterial(kind);
      expect(m.name).toBe(kind);
      expect(m.density).toBe(MATERIAL_CATALOG[kind].densityKgPerM3);
    }
  });

  it('resolves aluminum and aluminium to the SAME material', () => {
    const us = resolveMaterial('aluminum');
    const uk = resolveMaterial('aluminium');
    expect(us.name).toBe('aluminum');
    // The alias resolves to the canonical name, not a second material.
    expect(uk.name).toBe('aluminum');
    expect(uk.density).toBe(us.density);
    expect(uk.density).toBe(2700);
    expect(uk.finish).toBe(us.finish);
    // `requested` preserves the caller's spelling for provenance.
    expect(uk.requested).toBe('aluminium');
    expect(us.requested).toBe('aluminum');
  });

  it('the aluminum finish token is the UK-spelled appearance token', () => {
    // The reconciliation: US material name maps onto the UK finish token that
    // actually exists in FINISHES.
    expect(resolveMaterial('aluminum').finish).toBe('aluminium');
    expect(isFinishToken('aluminium')).toBe(true);
  });

  it('handles the density-without-finish gap honestly (pet)', () => {
    const m = resolveMaterial('pet');
    expect(m.density).toBe(1380);
    // No natural pet finish exists — the library says so rather than inventing
    // a nearest-looking token.
    expect(m.finish).toBeUndefined();
  });

  it('refuses a finish-without-density token as a material (brass)', () => {
    // brass is a real FINISH but has no catalog density; the library will not
    // invent one. It is rejected, with a hint pointing at .finish('brass').
    expect(isFinishToken('brass')).toBe(true);
    const r = tryResolveMaterial('brass');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("'brass' is not a known material");
      expect(r.hint).toContain(".finish('brass')");
      expect(r.hint).toContain('no catalog density');
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
      // Lists valid materials so the author fixes it without guessing.
      expect(thrown.message).toContain('steel');
      expect(thrown.message).toContain('aluminium');
      expect(thrown.message).toContain('pet');
    }
    // A capitalized spelling is a typo, not a silent match.
    expect(() => resolveMaterial('Steel')).toThrow();
    expect(() => resolveMaterial('')).toThrow();
    expect(() => resolveMaterial(undefined)).toThrow();
  });

  it('unknownMaterialMessage names the offending value and the valid list', () => {
    const msg = unknownMaterialMessage('foo');
    expect(msg).toContain("'foo'");
    for (const name of ACCEPTED_MATERIAL_NAMES) expect(msg).toContain(name);
  });
});

// --- Drift gate: the library must stay consistent with BOTH source tables. ---
describe('materialLibrary ↔ catalog / finish drift', () => {
  it('MATERIAL_FINISH is keyed by exactly the catalog kinds', () => {
    const finishKeys = new Set(Object.keys(MATERIAL_FINISH));
    const catalogKeys = new Set<string>(CATALOG_KINDS);
    const missing = [...catalogKeys].filter((k) => !finishKeys.has(k));
    const extra = [...finishKeys].filter((k) => !catalogKeys.has(k));
    expect(
      missing,
      `Catalog kinds with no finish mapping: ${missing.join(', ')}. ` +
        'Add them to MATERIAL_FINISH (map to a finish token or undefined).',
    ).toEqual([]);
    expect(
      extra,
      `MATERIAL_FINISH names that are not catalog kinds: ${extra.join(', ')}. ` +
        'A material can only claim a density it has in MATERIAL_CATALOG.',
    ).toEqual([]);
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

  it('every alias resolves to a real catalog kind', () => {
    for (const [alias, canonical] of Object.entries(MATERIAL_ALIASES)) {
      expect(
        (CATALOG_KINDS as readonly string[]).includes(canonical),
        `Alias '${alias}' points at '${canonical}', which is not a catalog kind.`,
      ).toBe(true);
      // And the alias actually resolves through resolveMaterial to that kind.
      expect(resolveMaterial(alias).name).toBe(canonical);
    }
  });

  it('every canonical material resolves in both directions it claims', () => {
    for (const kind of CATALOG_KINDS) {
      const m = resolveMaterial(kind);
      // Density direction: always present and positive.
      expect(m.density).toBeGreaterThan(0);
      // Finish direction: present iff the library claims one for this kind.
      if (MATERIAL_FINISH[kind] === undefined) {
        expect(m.finish).toBeUndefined();
      } else {
        expect(m.finish).toBe(MATERIAL_FINISH[kind]);
        expect(isFinishToken(m.finish!)).toBe(true);
      }
    }
  });
});
