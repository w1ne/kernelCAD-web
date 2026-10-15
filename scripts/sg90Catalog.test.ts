// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SG90_PARTS, sg90Families } from './sg90Catalog';
import { validateConnectorManifest } from '../src/shared/parts/connectorManifest';
import { inspectStepBuffer } from '../src/kernel/import/inspectStep';
import type { PartRecord } from '../src/shared/parts/types';

const seedIndex = JSON.parse(readFileSync(new URL('../assets/parts-seed/index.json', import.meta.url), 'utf8')) as { records: PartRecord[] };

describe('SG90 imported catalog references', () => {
  it('imports normalized motor and single arm horn with honest provenance and interfaces', async () => {
    const families = sg90Families();
    expect(families.map(f => f.id)).toEqual(['micro-servo', 'servo-horn']);
    for (const family of families) {
      const built = await family.generate(family.variants[0]);
      expect(built.record.license).toBe('CC-BY-SA-4.0');
      expect(built.record.attribution).toContain('Juan Fenoy');
      expect(built.record.attributes.referenceStatus).toContain('community');
      expect(built.record.upstream?.commit).toHaveLength(40);
      expect(built.record.connectors).toEqual(built.connectors.map(c => c.name));
      validateConnectorManifest({ schemaVersion: 1, partId: built.record.id, family: family.id, connectors: built.connectors });

      // The committed seed index and sidecar describe these exact bytes.
      const sha = createHash('sha256').update(built.stepBytes).digest('hex');
      const seeded = seedIndex.records.find(r => r.id === built.record.id)!;
      expect(seeded.sha256).toBe(sha);
      expect({ ...seeded, sha256: undefined, source: undefined }).toEqual({ ...built.record, sha256: undefined, source: undefined });
      const sidecar = JSON.parse(readFileSync(new URL(`../assets/parts-seed/${family.id}/${built.record.id}.json`, import.meta.url), 'utf8'));
      expect(sidecar.geometrySha256).toBe(sha);
      expect(sidecar.connectors).toEqual(built.connectors);

      const report = await inspectStepBuffer(Buffer.from(built.stepBytes), built.record.id);
      expect(report.solidCount).toBeGreaterThan(0);
      const min = [0, 1, 2].map(i => Math.min(...report.solids.map(s => s.bboxExact.min[i])));
      const max = [0, 1, 2].map(i => Math.max(...report.solids.map(s => s.bboxExact.max[i])));
      const expectedMin = family.id === 'micro-servo' ? [-5.9, -21.3, 0] : [-4, -4, 0];
      const expectedMax = family.id === 'micro-servo' ? [5.9, 11.1, 29.9] : [18.49586, 4, 5];
      for (let i = 0; i < 3; i++) {
        expect(min[i]).toBeCloseTo(expectedMin[i], 3);
        expect(max[i]).toBeCloseTo(expectedMax[i], 3);
      }
      const holes = report.solids.flatMap(s => s.holes);
      const hasHole = (d: number, x: number, y: number, z?: number) => holes.some(h =>
        Math.abs(h.diameterMm - d) < 0.01 && Math.abs(h.axisOrigin[0] - x) < 0.01 && Math.abs(h.axisOrigin[1] - y) < 0.01
        && (z === undefined || Math.abs(h.axisOrigin[2] - z) < 0.01));
      if (family.id === 'servo-horn') {
        for (const x of [5, 7, 9, 11, 13, 15, 17]) expect(hasHole(1.4, x, 0)).toBe(true);
        expect(hasHole(2, 0, 0)).toBe(true); // core hole on the shaft axis
        expect(hasHole(6, 0, 0, 5)).toBe(true); // spline socket opens at Z=5
      } else {
        // Ear holes 27.2 mm apart, lower ear face at Z=15.9.
        expect(hasHole(2, 0, -18.95, 15.9)).toBe(true);
        expect(hasHole(2, 0, 8.25, 15.9)).toBe(true);
        expect(hasHole(1.7, 0, 0, 29.9)).toBe(true); // shaft screw hole at the shaft tip
      }
    }
    expect(SG90_PARTS.map(p => p.id)).toEqual(['sg90-servo', 'sg90-horn-single-arm']);
  }, 120000);
});
