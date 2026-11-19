// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { servoFamilies, SERVO_PARTS } from './servoCatalog';
import { validateConnectorManifest } from '../src/shared/parts/connectorManifest';
import { inspectStepBuffer } from '../src/kernel/import/inspectStep';

// Manufacturer product tables, copied by hand from
// https://towerpro.com.tw/product/mg996r/ and https://towerpro.com.tw/product/mg90s/
// (PRODUCT CONFIGURE TABLE, letters A-F on the manufacturer's size drawing).
const TOWERPRO_TABLE = {
  'mg995-servo': { A: 42.7, B: 40.9, C: 37, D: 20, E: 54, F: 26.8 },
  'mg90s-servo': { A: 32.5, B: 22.8, C: 28.4, D: 12.4, E: 32.1, F: 18.5 },
} as const;
const SHAFT_TO_BODY_END = { 'mg995-servo': 10, 'mg90s-servo': 5.8 } as const;

describe('hobby servo catalog entries (modelled from datasheet drawing)', () => {
  it('declares MG995 (shared with MG996R) and MG90S', () => {
    expect(SERVO_PARTS.map((p) => p.id)).toEqual(['mg995-servo', 'mg90s-servo']);
    const mg995 = SERVO_PARTS[0].record;
    expect(mg995.aliases).toEqual(['mg996r-servo']);
    expect(mg995.tags).toEqual(expect.arrayContaining(['mg995', 'mg996r']));
  });

  for (const part of SERVO_PARTS) {
    it(`${part.id}: honest provenance, traceable dimensions, valid connectors, real geometry`, async () => {
      const families = servoFamilies().filter((f) => f.id === part.family);
      expect(families).toHaveLength(1);
      const built = await families[0].generate(families[0].variants[0]);
      const a = built.record.attributes;
      const t = TOWERPRO_TABLE[part.id as keyof typeof TOWERPRO_TABLE];

      // Provenance: exactly the required label, a source URL, a licence, and no
      // claim of being a manufacturer model.
      expect(a.provenance).toBe('modelled from datasheet drawing, not a manufacturer model');
      expect(String(a.dimensionSource)).toMatch(/^https:\/\/towerpro\.com\.tw\/product\//);
      expect(built.record.license).toBe('MIT');
      expect(built.record.licenseClass).toBe('permissive');
      expect(built.record.attribution).toContain('Tower Pro');
      expect(built.record.tags).not.toContain('community-reference');

      // Every dimension is the manufacturer-table value, named by its drawing letter.
      expect(a.drawingHeightToShaftTipMm_A).toBe(t.A);
      expect(a.drawingBodyLengthMm_B).toBe(t.B);
      expect(a.drawingHeightToCoverTopMm_C).toBe(t.C);
      expect(a.drawingWidthMm_D).toBe(t.D);
      expect(a.drawingLengthOverEarsMm_E).toBe(t.E);
      expect(a.drawingEarUndersideHeightMm_F).toBe(t.F);
      // Values not dimensioned on the drawing are listed as left out, never guessed.
      expect(String(a.notModelled)).toMatch(/ear holes/);
      expect(String(a.notModelled)).toMatch(/spline/);
      expect(String(a.notModelled)).toMatch(/horn/);
      expect(String(a.shaftOffsetBasis)).toMatch(/scaled from drawing/);

      // Connectors: output axis + both ear faces, valid manifest, same names as the record.
      expect(built.record.connectors).toEqual(built.connectors.map((c) => c.name));
      validateConnectorManifest({ schemaVersion: 1, partId: built.record.id, family: part.family, connectors: built.connectors });
      const s = SHAFT_TO_BODY_END[part.id as keyof typeof SHAFT_TO_BODY_END];
      const yHigh = s + (t.E - t.B) / 2; // ear tip on the short side of the shaft
      const yLow = -(t.B - s) - (t.E - t.B) / 2;
      const byName = Object.fromEntries(built.connectors.map((c) => [c.name, c]));
      expect(byName['shaft-output']).toMatchObject({ type: 'axis', origin: [0, 0, t.A], axis: [0, 0, 1] });
      expect(byName['ear-face-high']).toMatchObject({ type: 'frame', normal: [0, 0, -1] });
      expect(byName['ear-face-low']).toMatchObject({ type: 'frame', normal: [0, 0, -1] });
      const hi = (byName['ear-face-high'] as { origin: number[] }).origin;
      const lo = (byName['ear-face-low'] as { origin: number[] }).origin;
      expect(hi[2]).toBeCloseTo(t.F, 6);
      expect(lo[2]).toBeCloseTo(t.F, 6);
      expect(hi[1]).toBeCloseTo(s + (t.E - t.B) / 4, 6); // mid-span of the ear, not a hole
      expect(lo[1]).toBeCloseTo(-(t.B - s) - (t.E - t.B) / 4, 6);
      expect(hi[1]).toBeGreaterThan(s);
      expect(hi[1]).toBeLessThan(yHigh);
      expect(lo[1]).toBeLessThan(-(t.B - s));
      expect(lo[1]).toBeGreaterThan(yLow);

      // Geometry: a real solid whose envelope is the drawing's B x D x C, shaft at the origin.
      const report = await inspectStepBuffer(Buffer.from(built.stepBytes), built.record.id);
      expect(report.solidCount).toBeGreaterThan(0);
      const min = [0, 1, 2].map((i) => Math.min(...report.solids.map((x) => x.bboxExact.min[i])));
      const max = [0, 1, 2].map((i) => Math.max(...report.solids.map((x) => x.bboxExact.max[i])));
      expect(min[0]).toBeCloseTo(-t.D / 2, 3);
      expect(max[0]).toBeCloseTo(t.D / 2, 3);
      expect(min[1]).toBeCloseTo(-(t.B - s), 3);
      expect(max[1]).toBeCloseTo(s, 3);
      expect(min[2]).toBeCloseTo(0, 3);
      expect(max[2]).toBeCloseTo(t.C, 3);
    }, 120000);
  }
});
