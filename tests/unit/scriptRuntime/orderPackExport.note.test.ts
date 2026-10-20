// tests/unit/scriptRuntime/orderPackExport.note.test.ts
//
// Spec S3: a purchased BOM row without a usable vendor part number is
// excluded from the vendor paste lists (handoffs.ts) and must be noted in
// the manifest instead of silently vanishing. computeBom is mocked because
// no real catalog flow yields such a row today (catalogInfo falls back to
// the catalog id), so this pins the defensive branch directly.
import { describe, it, expect, vi } from 'vitest';
import { strFromU8 } from 'fflate';
import type { BomRow } from '../../../src/agent/script-runtime/bom';
import type { ExportInput } from '../../../src/agent/script-runtime/export';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const bboxMm: BomRow['bboxMm'] = { min: [0, 0, 0], max: [1, 1, 1] };

const washer: BomRow = {
  item: 1,
  name: 'washer',
  quantity: 2,
  kind: 'purchased',
  material: null,
  density: null,
  massGPerUnit: null,
  massGTotal: null,
  bboxMm,
  process: null,
  processSource: null,
  catalog: { id: 'unknown-washer', vendor: null, partNumber: null, source: null, license: 'MIT' },
  instancePaths: ['washer_0', 'washer_1'],
};

const screw: BomRow = {
  ...washer,
  item: 2,
  name: 'screw',
  catalog: { id: 'ln-m2x4', vendor: 'kernelCAD catalog', partNumber: 'ISO 4762', source: null, license: 'MIT' },
  instancePaths: ['screw_0'],
};

vi.mock('../../../src/agent/script-runtime/bom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/agent/script-runtime/bom')>();
  return { ...actual, computeBom: vi.fn() };
});

import { computeBom } from '../../../src/agent/script-runtime/bom';
import { collectOrderPack } from '../../../src/agent/script-runtime/orderPackExport';

const NOTE = "purchased 'washer' has no catalog part number — add it to the vendor list manually";

describe('collectOrderPack: PN-less purchased rows', () => {
  it('notes the row in the manifest and README, and only for rows without a part number', async () => {
    vi.mocked(computeBom).mockResolvedValue({
      rows: [washer, screw],
      totals: { partCount: 3, uniquePartCount: 2, totalMassG: null },
      diagnostics: [],
    });
    const input: ExportInput = {
      code: 'return 1;',
      fileName: 'demo.kcad.ts',
      format: 'order-pack',
      options: { format: 'order-pack' },
    };
    const run = {} as Parameters<typeof collectOrderPack>[1];
    const arm = { __parts: () => [] } as unknown as Assembly;

    const collected = await collectOrderPack(input, run, arm, [], 1);

    expect(collected.notes).toEqual([NOTE]);
    const manifest = JSON.parse(strFromU8(collected.entries.find((e) => e.path === 'manifest.json')!.bytes));
    expect(manifest.notes).toEqual([NOTE]);
    const readme = strFromU8(collected.entries.find((e) => e.path === 'README.txt')!.bytes);
    expect(readme).toContain(NOTE);
  });
});
