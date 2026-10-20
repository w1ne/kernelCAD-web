import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { buildModelFromFile } from '../src/modeling/buildModel';
import { compareMetrics, renderScorecard, type ReferenceMetrics } from './referencePartsScorecard';

const expected: ReferenceMetrics = {
  volumeMm3: 100,
  surfaceAreaMm2: 200,
  bbox: { min: [0, 0, 0], max: [10, 10, 10] },
};

describe('reference-parts metric comparison', () => {
  it('accepts real measurements inside each declared tolerance', () => {
    const result = compareMetrics(
      {
        volumeMm3: 100.5,
        surfaceAreaMm2: 203,
        bbox: { min: [0.04, 0, 0], max: [10.05, 10, 10] },
      },
      expected,
      { volumeRelative: 0.01, surfaceAreaRelative: 0.02, bboxAbsoluteMm: 0.1 },
    );

    expect(result.pass).toBe(true);
    expect(result.volumeRelativeError).toBeCloseTo(0.005);
    expect(result.surfaceAreaRelativeError).toBeCloseTo(0.015);
    expect(result.bboxMaxAbsoluteErrorMm).toBeCloseTo(0.05);
  });

  it('fails when any volume, area, or bbox measurement exceeds its tolerance', () => {
    const result = compareMetrics(
      {
        volumeMm3: 102,
        surfaceAreaMm2: 205,
        bbox: { min: [0, 0, 0], max: [10.2, 10, 10] },
      },
      expected,
      { volumeRelative: 0.01, surfaceAreaRelative: 0.02, bboxAbsoluteMm: 0.1 },
    );

    expect(result.pass).toBe(false);
    expect(result.volumePass).toBe(false);
    expect(result.surfaceAreaPass).toBe(false);
    expect(result.bboxPass).toBe(false);
  });
});

describe('reference-parts scorecard summary', () => {
  function makeReportResult(
    expectedStatus: 'pass' | 'known-failure',
    status: 'PASS' | 'KNOWN FAIL' | 'FAIL',
    id: string,
    knownFailureReason?: string,
  ): Parameters<typeof renderScorecard>[0][number] {
    const expectedMetrics: ReferenceMetrics = {
      volumeMm3: 100,
      surfaceAreaMm2: 200,
      bbox: { min: [0, 0, 0], max: [10, 10, 10] },
    };
    const tolerance = { volumeRelative: 0.001, surfaceAreaRelative: 0.001, bboxAbsoluteMm: 0.01 };
    const actualMetrics = status === 'PASS'
      ? expectedMetrics
      : { ...expectedMetrics, volumeMm3: expectedMetrics.volumeMm3 * 1.1 };

    return {
      part: {
        id,
        name: id,
        source: `${id}.kcad.ts`,
        expected: expectedMetrics,
        tolerance,
        provenance: { kind: 'analytic', details: 'test fixture formula' },
        status: expectedStatus,
        ...(knownFailureReason ? { knownFailureReason } : {}),
      },
      elapsedMs: 1,
      actual: actualMetrics,
      comparison: compareMetrics(actualMetrics, expectedMetrics, tolerance),
      status,
    };
  }

  it('counts actual matches over all parts and flags a known failure that now passes for promotion', () => {
    const report = renderScorecard([
      makeReportResult('pass', 'PASS', 'rectangular-block'),
      makeReportResult('known-failure', 'KNOWN FAIL', 'plate-blind-hole', 'Blind cutter exceeds requested depth.'),
      makeReportResult('known-failure', 'PASS', 'plate-counterbore', 'Counterbore cutter exceeds requested shoulder depth.'),
    ]);

    expect(report).toContain('**Result:** 2/3 reference parts match.');
    expect(report).toContain('**Gate:** PASS — 1/1 expected-pass parts match');
    expect(report).toContain('**plate-counterbore**: known failure cleared; promote.');
    expect(report).toContain('Reason: Counterbore cutter exceeds requested shoulder depth.');
    expect(report).toContain('Reason: Blind cutter exceeds requested depth.');
  });

  it('keeps the gate failing when an expected-pass part regresses', () => {
    const report = renderScorecard([
      makeReportResult('pass', 'FAIL', 'rectangular-block'),
      makeReportResult('known-failure', 'KNOWN FAIL', 'plate-blind-hole', 'Blind cutter exceeds requested depth.'),
      makeReportResult('known-failure', 'PASS', 'plate-counterbore', 'Counterbore cutter exceeds requested shoulder depth.'),
    ]);

    expect(report).toContain('**Result:** 1/3 reference parts match.');
    expect(report).toContain('**Gate:** FAIL — 0/1 expected-pass parts match');
  });
});

describe('reference-parts OCCT geometry', () => {
  async function measure(source: string) {
    const model = await buildModelFromFile({
      file: fileURLToPath(new URL(`../assets/reference-parts/scorecard/${source}`, import.meta.url)),
      kernel: 'occt',
    });
    const errors = model.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors, source).toEqual([]);
    const shape = model.rootShape;
    expect(shape, source).toBeDefined();
    try {
      return {
        volumeMm3: shape!.volume(),
        surfaceAreaMm2: shape!.surfaceArea(),
        bbox: shape!.boundingBox({ exact: true }),
      };
    } finally {
      shape?.dispose?.();
    }
  }

  it('revolves a circular profile to the analytic torus volume and area', async () => {
    const actual = await measure('torus-revolve.kcad.ts');
    expect(actual.volumeMm3).toBeCloseTo(1000 * Math.PI ** 2, 2);
    expect(actual.surfaceAreaMm2).toBeCloseTo(400 * Math.PI ** 2, 2);
    expect(actual.bbox.min[0]).toBeCloseTo(-25, 1);
    expect(actual.bbox.max[0]).toBeCloseTo(25, 1);
    expect(actual.bbox.min[2]).toBeCloseTo(-5, 2);
    expect(actual.bbox.max[2]).toBeCloseTo(5, 2);
  });

  it('lofts exact circular sections to the analytic frustum volume', async () => {
    const actual = await measure('loft-circular-frustum.kcad.ts');
    expect(actual.volumeMm3).toBeCloseTo((3500 * Math.PI) / 3, 2);
  });

  it('sweeps a circular profile to the analytic cylinder volume and area', async () => {
    const actual = await measure('sweep-round-prism.kcad.ts');
    expect(actual.volumeMm3).toBeCloseTo(500 * Math.PI, 2);
    expect(actual.surfaceAreaMm2).toBeCloseTo(250 * Math.PI, 2);
  });

  it('matches the counterbore target or its documented 0.01 mm overcut', async () => {
    const actual = await measure('plate-counterbore.kcad.ts');
    const expectedVolume = 12000 - 154 * Math.PI;
    const expectedArea = 3800 + 58 * Math.PI;
    const overcutVolume = expectedVolume - 0.16 * Math.PI;
    const overcutArea = expectedArea + 0.04 * Math.PI;
    expect(Math.min(
      Math.abs(actual.volumeMm3 - expectedVolume),
      Math.abs(actual.volumeMm3 - overcutVolume),
    )).toBeLessThan(0.01);
    expect(Math.min(
      Math.abs(actual.surfaceAreaMm2 - expectedArea),
      Math.abs(actual.surfaceAreaMm2 - overcutArea),
    )).toBeLessThan(0.01);
  });

  it('matches the blind bore target or its documented 0.01 mm overcut', async () => {
    const actual = await measure('plate-blind-hole.kcad.ts');
    const expectedVolume = 14400 - 80 * Math.PI;
    const expectedArea = 4080 + 40 * Math.PI;
    const overcutVolume = expectedVolume - 0.16 * Math.PI;
    const overcutArea = expectedArea + 0.08 * Math.PI;
    expect(Math.min(
      Math.abs(actual.volumeMm3 - expectedVolume),
      Math.abs(actual.volumeMm3 - overcutVolume),
    )).toBeLessThan(0.01);
    expect(Math.min(
      Math.abs(actual.surfaceAreaMm2 - expectedArea),
      Math.abs(actual.surfaceAreaMm2 - overcutArea),
    )).toBeLessThan(0.01);
  });
});
