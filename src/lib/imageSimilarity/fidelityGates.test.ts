// src/lib/imageSimilarity/fidelityGates.test.ts
//
// W2 fidelity gates. The "expected feature" gate is STRUCTURAL: it consumes the
// model's max inner-loop (hole) count from list_faces. A frame with two lens
// cutouts reports 2 (whether or not a lens body is inserted); a solid slab
// reports 0. This is the regression for the slab-hack AND for the lens-insert
// false-negative that a pixel/fill-ratio heuristic could not handle.

import { describe, expect, it } from 'vitest';
import { computeFidelityGates, allFidelityGatesPass } from './fidelityGates';

describe('computeFidelityGates', () => {
  it('passes expectedFeatureVisibleAtPose when the model has the expected interior loops (eyewear front)', () => {
    const gates = computeFidelityGates(
      { maxFaceInnerLoops: 2, partsCount: 1, solidVolume: 9000 },
      { expectedInteriorLoops: 2, expectedPartsCount: 1 },
    );
    const feat = gates.find((g) => g.name === 'expectedFeatureVisibleAtPose');
    expect(feat).toBeDefined();
    expect(feat!.pass).toBe(true);
  });

  it('fails expectedFeatureVisibleAtPose for a solid slab with no interior loops (R5 slab-hack)', () => {
    const gates = computeFidelityGates(
      { maxFaceInnerLoops: 0, partsCount: 1, solidVolume: 120000 },
      { expectedInteriorLoops: 2 },
    );
    const feat = gates.find((g) => g.name === 'expectedFeatureVisibleAtPose');
    expect(feat!.pass).toBe(false);
    expect(feat!.reason).toMatch(/missing from the geometry|solid blob/i);
  });

  it('treats a missing maxFaceInnerLoops as 0 (fails the feature gate)', () => {
    const gates = computeFidelityGates(
      { partsCount: 1, solidVolume: 100 },
      { expectedInteriorLoops: 2 },
    );
    expect(gates.find((g) => g.name === 'expectedFeatureVisibleAtPose')!.pass).toBe(false);
  });

  it('fails partsCountMatches when the count differs from expected', () => {
    const gates = computeFidelityGates(
      { maxFaceInnerLoops: 2, partsCount: 3, solidVolume: 9000 },
      { expectedInteriorLoops: 2, expectedPartsCount: 1 },
    );
    const parts = gates.find((g) => g.name === 'partsCountMatches');
    expect(parts!.pass).toBe(false);
    expect(parts!.reason).toMatch(/expected 1.*got 3/i);
  });

  it('fails nonDegenerateSolid for zero/near-zero volume', () => {
    const gates = computeFidelityGates(
      { maxFaceInnerLoops: 2, partsCount: 1, solidVolume: 0 },
      {},
    );
    const nd = gates.find((g) => g.name === 'nonDegenerateSolid');
    expect(nd!.pass).toBe(false);
  });

  it('omits the feature gate when expectedInteriorLoops is undefined', () => {
    const gates = computeFidelityGates(
      { maxFaceInnerLoops: 0, partsCount: 1, solidVolume: 100 },
      {},
    );
    expect(gates.find((g) => g.name === 'expectedFeatureVisibleAtPose')).toBeUndefined();
  });

  it('omits partsCountMatches when expectedPartsCount is undefined', () => {
    const gates = computeFidelityGates(
      { maxFaceInnerLoops: 2, partsCount: 5, solidVolume: 100 },
      { expectedInteriorLoops: 2 },
    );
    expect(gates.find((g) => g.name === 'partsCountMatches')).toBeUndefined();
  });

  it('allFidelityGatesPass reflects the AND of all gates', () => {
    const pass = computeFidelityGates(
      { maxFaceInnerLoops: 2, partsCount: 1, solidVolume: 9000 },
      { expectedInteriorLoops: 2, expectedPartsCount: 1 },
    );
    expect(allFidelityGatesPass(pass)).toBe(true);
    const fail = computeFidelityGates(
      { maxFaceInnerLoops: 0, partsCount: 1, solidVolume: 9000 },
      { expectedInteriorLoops: 2, expectedPartsCount: 1 },
    );
    expect(allFidelityGatesPass(fail)).toBe(false);
  });
});
