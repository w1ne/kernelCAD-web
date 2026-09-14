// tests/unit/scriptRuntime/bomCsv.test.ts
//
// Golden test for bomToCsv — the serializer behind
// export({ format: 'bom-csv' }). Locks the header + row shape so a future
// column reorder is a deliberate, reviewed diff.
import { describe, it, expect } from 'vitest';
import { bomToCsv, type BomRow } from '../../../src/agent/script-runtime/bom';

const ROWS: BomRow[] = [
  {
    item: 1,
    name: 'plate',
    quantity: 1,
    kind: 'fabricated',
    material: 'aluminum',
    density: 2700,
    massGPerUnit: 194.4,
    massGTotal: 194.4,
    bboxMm: { min: [0, 0, 0], max: [200, 120, 3] },
    processHint: 'printed',
    instancePaths: ['plate'],
  },
  {
    item: 2,
    name: 'screw_0',
    quantity: 4,
    kind: 'purchased',
    material: null,
    density: null,
    massGPerUnit: null,
    massGTotal: null,
    bboxMm: { min: [-1.9, -1.89, -4], max: [1.9, 1.89, 2] },
    catalog: { id: 'iso-4762-m2x4', vendor: 'kernelCAD catalog', partNumber: 'ISO 4762', source: null, license: 'MIT' },
    instancePaths: ['screw_0', 'screw_1', 'screw_2', 'screw_3'],
  },
];

const EXPECTED_CSV =
  'item,name,quantity,kind,material,densityKgM3,massGPerUnit,massGTotal,bboxMinX,bboxMinY,bboxMinZ,bboxMaxX,bboxMaxY,bboxMaxZ,processHint,vendor,partNumber,license,source,instancePaths\n' +
  '1,plate,1,fabricated,aluminum,2700,194.4,194.4,0,0,0,200,120,3,printed,,,,,plate\n' +
  '2,screw_0,4,purchased,,,,,-1.9,-1.89,-4,1.9,1.89,2,,kernelCAD catalog,ISO 4762,MIT,,screw_0;screw_1;screw_2;screw_3\n';

describe('bomToCsv', () => {
  it('matches the golden header + row layout', () => {
    expect(bomToCsv(ROWS)).toBe(EXPECTED_CSV);
  });

  it('quotes cells containing commas', () => {
    const rows: BomRow[] = [{
      ...ROWS[0],
      instancePaths: ['a,b'],
    }];
    const csv = bomToCsv(rows);
    expect(csv).toContain('"a,b"');
  });
});
