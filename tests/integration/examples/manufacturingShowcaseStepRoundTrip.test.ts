// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectStepBuffer } from '../../../src/kernel/import/inspectStep';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const cases = [
  { file: 'electronics-enclosure', solids: 2 },
  { file: 'bearing-block', solids: 1 },
  { file: 'bent-mounting-bracket', solids: 1 },
  { file: 'cut-motor-plate', solids: 1 },
  { file: 'shoulder-spacer', solids: 1 },
  { file: 'bearing-shaft-assembly', solids: 4 },
  { file: 'moulded-housing', solids: 1 },
];

describe('manufacturing showcase STEP artifacts', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it.each(cases)('$file exports and reopens with the declared solid count', async ({ file, solids }) => {
    const fileName = `examples/manufacturing-showcase/${file}.kcad.ts`;
    const code = await readFile(fileName, 'utf8');
    const exported = await runAndExport({ code, fileName, format: 'step', options: { format: 'step' } });
    expect(exported.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    expect(exported.bytes.length).toBeGreaterThan(0);

    const report = await inspectStepBuffer(Buffer.from(exported.bytes), fileName);
    expect(report.solidCount).toBe(solids);
    expect(report.solids).toHaveLength(solids);
    for (const solid of report.solids) {
      expect(solid.volumeMm3).toBeGreaterThan(0);
      expect(solid.faceCount).toBeGreaterThan(0);
      expect(solid.bboxExact.min.every(Number.isFinite)).toBe(true);
      expect(solid.bboxExact.max.every(Number.isFinite)).toBe(true);
    }
  }, 180_000);
});
