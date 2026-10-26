// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression tests for the request-aware editing promotion classifier.

import { describe, expect, it } from 'vitest';
import type { StepInspectReport } from '../../../src/kernel/import/inspectStep';
import type { CylindricalHole } from '../../../src/kernel/backends/occt/holeDetection';
import { classifyEditPromotion, parseEditIntent } from './editPromotion';

function hole(diameter: number, x = 0, y = 0, z = 0): CylindricalHole {
  return {
    axisOrigin: [x, y, z],
    axisDirection: [0, 0, 1],
    diameterMm: diameter,
    depthMm: 20,
    kind: 'blind',
    faceCount: 1,
  };
}

function report(volume: number, faces: number, holes: CylindricalHole[] = [], size = 100): StepInspectReport {
  return {
    file: 'shape.step',
    solidCount: 1,
    holeDetection: 'exact',
    solids: [
      {
        index: 0,
        name: null,
        bboxExact: { min: [0, 0, 0], max: [size, size, size] },
        volumeMm3: volume,
        faceCount: faces,
        holes,
        holeDetection: 'exact',
      },
    ],
  };
}

describe('classifyEditPromotion', () => {
  it('rejects an unchanged solid as a no-op', () => {
    const before = report(1_000_000, 20, [hole(188)]);
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before,
      after: report(1_000_000, 20, [hole(188)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'no-op' });
  });

  it('repairs a bore that stops short of the requested diameter', () => {
    // Target is a 310 mm central bore; 300 mm is a real edit but the wrong size.
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before: report(1_000_000, 20, [hole(188), hole(298)]),
      after: report(999_000, 20, [hole(188), hole(300)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude', expectedDirection: 'decrease' });
    expect(result.reason).toContain('310');
  });

  it('accepts a bore that reaches the requested diameter', () => {
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before: report(1_000_000, 20, [hole(188), hole(298)]),
      after: report(998_000, 20, [hole(188), hole(310)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('repairs a horizontal bore that stops at 20 mm instead of 10 mm', () => {
    const horizontal = { ...hole(20, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const beforeHorizontal = { ...hole(25, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const result = classifyEditPromotion({
      request: 'Decrease the diameter of the lone horizontal bore from 15mm to 10mm.',
      before: report(1_000_000, 20, [beforeHorizontal, hole(46, 0, 0, -31)]),
      after: report(1_000_000, 20, [horizontal, hole(46, 0, 0, -31)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude' });
  });

  it('accepts the exact horizontal bore reduction to 10 mm', () => {
    const correct = { ...hole(10, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const beforeHorizontal = { ...hole(25, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const result = classifyEditPromotion({
      request: 'Decrease the diameter of the lone horizontal bore from 15mm to 10mm.',
      before: report(1_000_000, 20, [beforeHorizontal, hole(46, 0, 0, -31)]),
      after: report(1_000_000, 20, [correct, hole(46, 0, 0, -31)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('repairs a removal that removed fewer than the requested three holes', () => {
    const result = classifyEditPromotion({
      request: 'Remove these three holes.',
      before: report(1_000_000, 20, [hole(6, 0), hole(6, 10), hole(6, 20), hole(12, 30)]),
      after: report(1_001_000, 20, [hole(6, 10), hole(6, 20), hole(12, 30)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('3');
  });

  it('accepts removing exactly the requested three holes', () => {
    const result = classifyEditPromotion({
      request: 'Remove these three holes.',
      before: report(1_000_000, 20, [hole(6, 0), hole(6, 10), hole(6, 20), hole(12, 30)]),
      after: report(1_001_000, 20, [hole(12, 30)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('rejects an edit in the opposite material direction', () => {
    const result = classifyEditPromotion({
      request: 'Add a 5 mm boss on the top face.',
      before: report(1_000_000, 20),
      after: report(998_000, 21),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-direction' });
  });

  it('rejects a move that deletes the feature', () => {
    const result = classifyEditPromotion({
      request: 'Move the 5 mm hole 10 mm to the left.',
      before: report(1_000_000, 20, [hole(5, 10, 0)]),
      after: report(1_000_000, 20, []),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });

  it('accepts a pure move when the hole moved and the volume is preserved', () => {
    const result = classifyEditPromotion({
      request: 'Move the 5 mm hole 10 mm to the left.',
      before: report(1_000_000, 20, [hole(5, 30, 0)], 100),
      after: report(1_000_000, 20, [hole(5, 20, 0)], 100),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'move-check' });
    expect(result.holeChangeMm).toBeCloseTo(10, 6);
  });

  it('rejects filling a hole without a decrease in hole count', () => {
    const result = classifyEditPromotion({
      request: 'Fill the three holes on the front face.',
      before: report(1_000_000, 20, [hole(6), hole(6), hole(12)]),
      after: report(1_003_000, 20, [hole(6), hole(6), hole(12)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });

  it('keeps a face-count-only edit below the volume tolerance', () => {
    const result = classifyEditPromotion({
      request: 'Replace the four mounting holes with a single central hole.',
      before: report(1_000_000, 20, [hole(6), hole(6), hole(6), hole(6)]),
      after: report(1_000_000, 21, [hole(6)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
    expect(result.faceDelta).toBe(1);
  });

  it('never accepts a compound or multi-solid result', () => {
    const before = report(1_000_000, 20);
    const after = report(1_000_000, 20);
    after.solidCount = 2;
    const result = classifyEditPromotion({ request: 'Add a rib.', before, after });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });
});

describe('parseEditIntent', () => {
  it('reads a bore enlargement as material removal', () => {
    expect(parseEditIntent('Increase the diameter of the central bore to 310mm.').direction).toBe('decrease');
  });

  it('reads a boss enlargement as material addition', () => {
    expect(parseEditIntent('Increase the boss diameter to 40 mm.').direction).toBe('increase');
  });

  it('reads a fill request as material addition and fewer holes', () => {
    expect(parseEditIntent('Fill the three holes on the front face.')).toMatchObject({
      direction: 'increase',
      expectsHoleDelta: 'fewer',
    });
  });

  it('extracts the count and the diameter targets from the request', () => {
    expect(parseEditIntent('Remove these three holes.')).toMatchObject({
      targetHoleCountDelta: -3,
    });
    expect(parseEditIntent('Increase the diameter of the central bore to 310mm.')).toMatchObject({
      targetHoleDiameterMm: 310,
      targetHoleSelector: 'central',
    });
    expect(parseEditIntent('Decrease the diameter of the lone horizontal bore from 15mm to 10mm.')).toMatchObject({
      sourceHoleDiameterMm: 15,
      targetHoleDiameterMm: 10,
      targetHoleSelector: 'horizontal',
    });
  });
});
