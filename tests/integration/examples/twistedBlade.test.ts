import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';

// Measured from the fixture (rootShape + `kernelcad inspect step`); keep in
// sync with the expected envelope documented in the fixture header.
const EXPECTED_VOLUME_MM3 = 9191;
const EXPECTED_SPAN_MM = 60;

describe('twisted blade fixture', () => {
  it('evaluates a 5-section twisted loft with no diagnostics and the expected envelope', async () => {
    const { evaluation, model } = await evaluateAndBuildScript({
      file: 'tests/e2e/fixtures/twisted-blade.kcad.ts',
    });
    expect(evaluation.exitCode).toBe(0);
    expect(evaluation.diagnostics).toEqual([]);
    expect(evaluation.featureCount).toBeGreaterThanOrEqual(3);

    // Geometry guard: a cleanup/regression must not silently change the blade.
    // Volume within ±15% of the measured value...
    const shape = model!.rootShape!;
    expect(shape.volume()).toBeGreaterThan(EXPECTED_VOLUME_MM3 * 0.85);
    expect(shape.volume()).toBeLessThan(EXPECTED_VOLUME_MM3 * 1.15);

    // ...and the radial span (X, 20..80) within ±1 mm.
    const bbox = shape.boundingBox();
    const span = bbox.max[0] - bbox.min[0];
    expect(span).toBeGreaterThan(EXPECTED_SPAN_MM - 1);
    expect(span).toBeLessThan(EXPECTED_SPAN_MM + 1);
  });
});
