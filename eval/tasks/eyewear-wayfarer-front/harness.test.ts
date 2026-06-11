// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/eyewear-wayfarer-front/harness.test.ts
//
// W2 — verifies the harness ANDs fidelity gates BEFORE visual scoring so a
// high silhouette/SSIM can never rescue a wrong object (the "slab hack").

import { describe, it, expect } from 'vitest';
import { decideScored } from './harness';

describe('eyewear harness — fidelity gates AND before visual score', () => {
  it('forces all visual scored items false when a fidelity gate fails (R5 slab)', () => {
    const scored = decideScored({
      fidelityGates: [
        { name: 'expectedFeatureVisibleAtPose', pass: false, reason: 'no interior opening' },
        { name: 'nonDegenerateSolid', pass: true, reason: 'ok' },
      ],
      rendered: true,
      silhouetteIoU: 0.95, // would normally pass the 0.45 floor
      composite: 0.9,
      ssim: 0.9,
      geomScored: false,
      chamferMm: 0,
      bboxIoU: 0,
      judgeScore: undefined,
    });
    expect(scored['silhouette IoU >= 0.45 vs photo']).toBe(false);
    expect(scored['composite >= 0.30 vs photo']).toBe(false);
    expect(scored['SSIM >= 0.35 vs photo']).toBe(false);
    expect(scored['fidelity gates pass']).toBe(false);
  });

  it('lets visual scored items reflect their floors when all fidelity gates pass', () => {
    const scored = decideScored({
      fidelityGates: [
        { name: 'expectedFeatureVisibleAtPose', pass: true, reason: 'ok' },
        { name: 'nonDegenerateSolid', pass: true, reason: 'ok' },
      ],
      rendered: true,
      silhouetteIoU: 0.5,
      composite: 0.4,
      ssim: 0.2, // below the 0.35 floor → false
      geomScored: false,
      chamferMm: 0,
      bboxIoU: 0,
      judgeScore: undefined,
    });
    expect(scored['fidelity gates pass']).toBe(true);
    expect(scored['silhouette IoU >= 0.45 vs photo']).toBe(true);
    expect(scored['composite >= 0.30 vs photo']).toBe(true);
    expect(scored['SSIM >= 0.35 vs photo']).toBe(false);
  });

  it('emits a VLM-judge scored item when a judge score is present and no STL oracle', () => {
    const scored = decideScored({
      fidelityGates: [{ name: 'nonDegenerateSolid', pass: true, reason: 'ok' }],
      rendered: true,
      silhouetteIoU: 0.5,
      composite: 0.4,
      ssim: 0.4,
      geomScored: false,
      chamferMm: 0,
      bboxIoU: 0,
      judgeScore: 0.7, // above the 0.5 judge floor
    });
    expect(scored['VLM rubric judge >= 0.50']).toBe(true);
  });

  it('keeps the 3D geometry oracle as the primary signal when present', () => {
    const scored = decideScored({
      fidelityGates: [{ name: 'nonDegenerateSolid', pass: true, reason: 'ok' }],
      rendered: true,
      silhouetteIoU: 0.5,
      composite: 0.4,
      ssim: 0.4,
      geomScored: true,
      chamferMm: 18, // <= 25 → pass
      bboxIoU: 0.1, // >= 0.05 → pass
      judgeScore: undefined,
    });
    expect(scored['chamfer distance <= 25 mm vs STL']).toBe(true);
    expect(scored['bbox IoU >= 0.05 vs STL']).toBe(true);
  });
});
