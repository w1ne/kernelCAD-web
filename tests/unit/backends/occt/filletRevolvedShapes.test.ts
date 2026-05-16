// tests/unit/backends/occt/filletRevolvedShapes.test.ts
//
// Regression tests for fillet on revolved/cylindrical shapes — covers the
// upstream replicad bug where Face.normalAt throws a non-Error C++
// Standard_Failure (raw WASM pointer) on cylinder cap edge midpoints (which
// sit exactly on the parametric U-seam of a CYLINDRE/CONE/SPHERE face).
//
// Before the fix, the cases below produced a useless raw-pointer
// diagnostic (e.g., `OCCT fillet failed: 8479736`). After the fix, fillets
// on cylinder/extrudeCircle-built shapes succeed.
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';
import type { Param } from '../../../../src/intent/types';

const mm = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });

const filletRecord = (id: string, radius: number): FeatureRecord => ({
  id,
  kind: 'fillet',
  inputs: { base: { kind: 'feature', id: 'base_1' } },
  params: { radius: mm(radius) },
  transforms: [],
  suppressed: false,
});

describe('OcctLowerer fillet on revolved/cylindrical shapes', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('lowers an all-edges fillet on a cylinder (cap edges previously threw)', async () => {
    const base = OcctBackend.cylinder(10, 5);
    const baselineVolume = base.volume();
    const result = await new OcctLowerer().lower(
      filletRecord('fillet_cyl', 1),
      { byKey: { base } },
    );
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const v = result.shape.volume();
    // Filleted cylinder must be smaller than original (caps actually rounded,
    // not silently passed through as a no-op).
    expect(v).toBeLessThan(baselineVolume);
    expect(v).toBeGreaterThan(baselineVolume * 0.9);
  });

  it('lowers an all-edges fillet on extrudeCircle (cylinder via 2D sketch)', async () => {
    const base = OcctBackend.extrudeCircle(5, 10);
    const baselineVolume = base.volume();
    const result = await new OcctLowerer().lower(
      filletRecord('fillet_ext_circle', 1),
      { byKey: { base } },
    );
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const v = result.shape.volume();
    expect(v).toBeLessThan(baselineVolume);
    expect(v).toBeGreaterThan(baselineVolume * 0.9);
  });

  it('still lowers an all-edges fillet on a box (regression check on prismatic shapes)', async () => {
    const base = OcctBackend.box(20, 20, 20);
    const baselineVolume = base.volume();
    const result = await new OcctLowerer().lower(
      filletRecord('fillet_box', 2),
      { byKey: { base } },
    );
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const v = result.shape.volume();
    expect(v).toBeLessThan(baselineVolume);
    expect(v).toBeGreaterThan(baselineVolume * 0.9);
  });

  it('emits a clean kernel-failed diagnostic (no raw WASM pointer) when OCCT genuinely rejects', async () => {
    // Thin part: 2 x 2 x 100 with radius 5 — the 5 mm fillet exceeds half
    // the smallest face dimension (1 mm), so OCCT will reject.
    const base = OcctBackend.box(2, 2, 100);
    const result = await new OcctLowerer().lower(
      filletRecord('fillet_reject', 5),
      { byKey: { base } },
    );
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThanOrEqual(1);
    for (const err of errs) {
      expect(err.code).toBe('feature.kernel-failed');
      // Message must NOT be a raw integer/pointer string like "8479736".
      expect(err.message).not.toMatch(/^[0-9]+$/);
      // Hint must be present and non-empty so the agent gets actionable feedback.
      expect(err.hint).toBeTruthy();
      expect((err.hint as string).length).toBeGreaterThan(0);
    }
  });
});
