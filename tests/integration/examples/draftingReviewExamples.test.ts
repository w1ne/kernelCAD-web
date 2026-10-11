import { describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { recogniseDrawingFeatures } from '../../../src/kernel/backends/occt/drawingFeatures';

describe('worked drafting geometry', () => {
  it.each([
    ['mounting-plate', [100, 70, 12], 65000, 75000],
    ['bearing-mount', [120, 80, 66], 170000, 200000],
  ] as const)('builds %s as one valid connected solid with its stated envelope', async (name, size, minVolume, maxVolume) => {
    const result = await evaluateAndBuildScript({ file: `examples/drafting-review/${name}.kcad.ts` });
    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.featureHealth).toEqual([]);
    const shape = result.model?.rootShape as OcctBackend;
    expect(shape).toBeDefined();
    expect(shape.solidComponents()).toHaveLength(1);
    const bbox = shape.boundingBox({ exact: true });
    for (let k = 0; k < 3; k++) expect(bbox.max[k] - bbox.min[k]).toBeCloseTo(size[k], 3);
    expect(shape.volume()).toBeGreaterThan(minVolume);
    expect(shape.volume()).toBeLessThan(maxVolume);
    const holes = recogniseDrawingFeatures(shape).holes;
    expect(holes.map(h => h.diameter).sort((a, b) => a - b)).toEqual(name === 'mounting-plate' ? [9, 9, 9, 9, 30] : [9, 9, 9, 9, 32]);
    const analyzer = new (getOC().BRepCheck_Analyzer)(shape.getReplicadShape().wrapped, true, false);
    try { expect(analyzer.IsValid_2()).toBe(true); } finally { analyzer.delete(); }
  }, 120000);
});
