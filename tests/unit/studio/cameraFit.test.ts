import { describe, it, expect } from 'vitest';
import { fitDistanceForBounds } from '../../../src/studio/components/demoPlayer/cameraFit';

describe('fitDistanceForBounds', () => {
  // Tall 30×10×100 box centered at origin, front view (camera toward -Y),
  // fovY 45°, 16:9 canvas, square output crop.
  const bounds = { min: [-15, -5, -50] as [number, number, number], max: [15, 5, 50] as [number, number, number] };

  it('vertical-bound fit with depth compensation and 1.05 margin', () => {
    const d = fitDistanceForBounds({
      bounds, target: [0, 0, 0], camDir: [0, -1, 0],
      fovYDeg: 45, canvasAspect: 16 / 9, outputAspect: 1,
    });
    // tanYEff = tan(22.5°) = 0.41421; binding corner u=50 at depth +5
    // → 50 / 0.41421 * 1.05 + 5 = 131.75
    expect(d).toBeCloseTo(131.75, 1);
  });

  it('wider output than canvas shrinks the vertical budget', () => {
    const d = fitDistanceForBounds({
      bounds, target: [0, 0, 0], camDir: [0, -1, 0],
      fovYDeg: 45, canvasAspect: 16 / 9, outputAspect: 2,
    });
    // tanYEff = 0.41421 * (16/9)/2 = 0.36819 → 50/0.36819*1.05 + 5 = 147.6
    expect(d).toBeCloseTo(147.6, 1);
  });
});
