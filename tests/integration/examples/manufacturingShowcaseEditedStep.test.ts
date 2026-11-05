// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectStepBuffer } from '../../../src/kernel/import/inspectStep';

type PromptEdit = {
  file: string;
  solids: number;
  updates: ReadonlyArray<readonly [string, string]>;
  size?: readonly [number, number, number];
  sizeRange?: {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
  };
  solidSizes?: ReadonlyArray<readonly [number, number, number]>;
  holeArrays?: ReadonlyArray<{
    diameter: number;
    count: number;
    spanX?: number;
    spanY?: number;
  }>;
  compareWall?: boolean;
  shaft?: { length: number; diameter: number; shoulderDiameter: number };
};

const promptEdits: PromptEdit[] = [
  {
    file: 'cut-motor-plate',
    solids: 1,
    updates: [
      ["param('length', 100", "param('length', 130"],
      ["param('width', 80", "param('width', 110"],
      ["param('thickness', 4", "param('thickness', 6"],
      ["param('motorPitch', 31", "param('motorPitch', 40"],
      ["param('pilotDiameter', 22", "param('pilotDiameter', 26"],
      ["param('mountDiameter', 5.5", "param('mountDiameter', 8"],
    ],
    size: [130, 110, 6],
    holeArrays: [
      { diameter: 3.4, count: 4, spanX: 40, spanY: 40 },
      { diameter: 8, count: 4, spanX: 110, spanY: 90 },
      { diameter: 26, count: 1 },
    ],
  },
  {
    file: 'bearing-block',
    solids: 1,
    updates: [
      ["param('length', 80", "param('length', 120"],
      ["param('width', 50", "param('width', 45"],
      ["param('thickness', 18", "param('thickness', 30"],
      ["param('seatDiameter', 22", "param('seatDiameter', 22.2"],
      ["param('mountInset', 10", "param('mountInset', 14"],
    ],
    size: [120, 45, 30],
    holeArrays: [
      { diameter: 5.5, count: 4, spanX: 92, spanY: 17 },
      { diameter: 8.5, count: 1 },
      { diameter: 22.2, count: 1 },
    ],
  },
  {
    file: 'bent-mounting-bracket',
    solids: 1,
    updates: [
      ["param('length', 100", "param('length', 115"],
      ["param('width', 50", "param('width', 100"],
      ["param('holeDiameter', 5.5", "param('holeDiameter', 6.6"],
      ["param('bendAngle', 90", "param('bendAngle', 120"],
    ],
    sizeRange: { min: [55, 99.9, 48], max: [66, 100.1, 58] },
    holeArrays: [{ diameter: 6.6, count: 4 }],
  },
  {
    file: 'shoulder-spacer',
    solids: 1,
    updates: [
      ["param('length', 25", "param('length', 60"],
      ["param('bodyDiameter', 20", "param('bodyDiameter', 26"],
      ["param('flangeDiameter', 30", "param('flangeDiameter', 40"],
      ["param('boreDiameter', 8.5", "param('boreDiameter', 12"],
      ["param('flangeThickness', 3", "param('flangeThickness', 5"],
    ],
    size: [40, 40, 60],
    holeArrays: [{ diameter: 12, count: 1 }],
  },
  {
    file: 'electronics-enclosure',
    solids: 2,
    updates: [["param('length', 100", "param('length', 120"]],
    solidSizes: [[120, 70, 4], [120, 70, 35]],
  },
  {
    file: 'moulded-housing',
    solids: 1,
    updates: [
      ["param('length', 80", "param('length', 120"],
      ["param('width', 50", "param('width', 90"],
      ["param('height', 25", "param('height', 40"],
      ["param('draftDeg', 1.5", "param('draftDeg', 5"],
      ["param('wall', 2", "param('wall', 2.5"],
    ],
    size: [127, 97, 40],
    holeArrays: [{ diameter: 2.1, count: 4 }],
    compareWall: true,
  },
  {
    file: 'bearing-shaft-assembly',
    solids: 4,
    updates: [
      ["param('shaftLength', 30", "param('shaftLength', 50"],
      ["param('shaftDiameter', 7.9", "param('shaftDiameter', 7.95"],
      ["param('shoulderDiameter', 12", "param('shoulderDiameter', 14"],
      ["param('retainerThickness', 2", "param('retainerThickness', 3"],
    ],
    shaft: { length: 50, diameter: 7.95, shoulderDiameter: 14 },
  },
];

describe('manufacturing showcase STEP after the requested prompt edits', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it.each(promptEdits)('$file exports the edited prompt model as valid STEP solids', async ({
    file, solids, updates, size, sizeRange, solidSizes, holeArrays, compareWall, shaft,
  }) => {
    const fileName = `examples/manufacturing-showcase/${file}.kcad.ts`;
    let code = await readFile(fileName, 'utf8');
    for (const [before, after] of updates) {
      const edited = code.replace(before, after);
      expect(edited, `prompt edit not found: ${before}`).not.toBe(code);
      code = edited;
    }

    const exported = await runAndExport({ code, fileName, format: 'step' });
    expect(exported.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    expect(exported.bytes.length).toBeGreaterThan(0);

    const report = await inspectStepBuffer(Buffer.from(exported.bytes), fileName);
    expect(report.solidCount).toBe(solids);
    expect(report.solids).toHaveLength(solids);
    for (const solid of report.solids) {
      expect(solid.volumeMm3).toBeGreaterThan(0);
      expect(solid.bboxExact.min.every(Number.isFinite)).toBe(true);
      expect(solid.bboxExact.max.every(Number.isFinite)).toBe(true);
    }
    const spans = report.solids.map(solid => [
      solid.bboxExact.max[0] - solid.bboxExact.min[0],
      solid.bboxExact.max[1] - solid.bboxExact.min[1],
      solid.bboxExact.max[2] - solid.bboxExact.min[2],
    ] as [number, number, number]);
    if (size) {
      spans[0]!.forEach((value, axis) =>
        expect(Math.abs(value - size[axis]!)).toBeLessThanOrEqual(0.05));
    }
    if (sizeRange) {
      spans[0]!.forEach((value, axis) => {
        expect(value).toBeGreaterThanOrEqual(sizeRange.min[axis]!);
        expect(value).toBeLessThanOrEqual(sizeRange.max[axis]!);
      });
    }
    if (solidSizes) {
      const sorted = spans.sort((a, b) => a[2] - b[2]);
      expect(sorted).toHaveLength(solidSizes.length);
      solidSizes.forEach((expected, solidIndex) => {
        sorted[solidIndex]!.forEach((value, axis) =>
          expect(Math.abs(value - expected[axis]!)).toBeLessThanOrEqual(0.05));
      });
    }
    if (holeArrays) {
      const holes = report.solids.flatMap(solid => solid.holes);
      expect(holes).toHaveLength(holeArrays.reduce((total, expected) => total + expected.count, 0));
      for (const expected of holeArrays) {
        const matches = holes.filter(hole => Math.abs(hole.diameterMm - expected.diameter) <= 0.05);
        expect(matches, `expected ${expected.count} STEP holes of ${expected.diameter} mm`)
          .toHaveLength(expected.count);
        if (expected.spanX !== undefined) {
          const xs = matches.map(hole => hole.axisOrigin[0]);
          expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(expected.spanX, 1);
        }
        if (expected.spanY !== undefined) {
          const ys = matches.map(hole => hole.axisOrigin[1]);
          expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(expected.spanY, 1);
        }
      }
    }
    if (compareWall) {
      const baselineCode = code.replace("param('wall', 2.5", "param('wall', 2");
      expect(baselineCode).not.toBe(code);
      const baseline = await runAndExport({ code: baselineCode, fileName, format: 'step' });
      expect(baseline.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
      const baselineReport = await inspectStepBuffer(Buffer.from(baseline.bytes), fileName);
      expect(Math.abs(report.solids[0]!.volumeMm3 - baselineReport.solids[0]!.volumeMm3)).toBeGreaterThan(500);
    }
    if (shaft) {
      const shaftSolid = report.solids.find(solid => {
        const shaftSpans = [
          solid.bboxExact.max[0] - solid.bboxExact.min[0],
          solid.bboxExact.max[1] - solid.bboxExact.min[1],
          solid.bboxExact.max[2] - solid.bboxExact.min[2],
        ];
        return Math.abs(shaftSpans[2]! - shaft.length) <= 0.05
          && Math.abs(shaftSpans[0]! - shaft.shoulderDiameter) <= 0.05
          && Math.abs(shaftSpans[1]! - shaft.shoulderDiameter) <= 0.05;
      });
      expect(shaftSolid).toBeDefined();
      const shaftArea = Math.PI * (shaft.diameter ** 2) / 4;
      const shoulderRingArea = Math.PI * (shaft.shoulderDiameter ** 2 - shaft.diameter ** 2) / 4;
      expect(shaftSolid!.volumeMm3).toBeCloseTo(shaftArea * shaft.length + shoulderRingArea * 2, 0);
    }
  }, 180_000);
});
