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
  },
  {
    file: 'electronics-enclosure',
    solids: 2,
    updates: [["param('length', 100", "param('length', 120"]],
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
  },
];

describe('manufacturing showcase STEP after the requested prompt edits', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it.each(promptEdits)('$file exports the edited prompt model as valid STEP solids', async ({
    file, solids, updates, size,
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
    if (size) {
      const bounds = report.solids[0]!.bboxExact;
      const actual = bounds.max.map((value, axis) => value - bounds.min[axis]!);
      actual.forEach((value, axis) =>
        expect(Math.abs(value - size[axis]!)).toBeLessThanOrEqual(0.05));
    }
  }, 180_000);
});
