// tests/unit/kernel/backends/occt/exportDxf.test.ts
//
// Round-trip tests for the polyline-only DXF writer. The Slice E preflight
// (DFM) pins seven invariants on this writer; each test asserts one of them
// so a regression cannot land silently.

import { describe, it, expect } from 'vitest';
import DxfParser from 'dxf-parser';
import { exportDxf } from '../../../../../src/kernel/backends/occt/exportDxf';
import type { Region } from '../../../../../src/shared/intent/region';

interface ParsedDxfEntity {
  type: string;
  layer: string;
  vertices?: { x: number; y: number }[];
}

interface ParsedDxf {
  header: Record<string, number | string | undefined>;
  entities: ParsedDxfEntity[];
}

function parse(bytes: Uint8Array): ParsedDxf {
  const text = new TextDecoder().decode(bytes);
  return new DxfParser().parseSync(text) as unknown as ParsedDxf;
}

describe('exportDxf', () => {
  it('writes a planar square as one closed LWPOLYLINE on layer "cut"', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [50, 0], [50, 25], [0, 25]],
      holes: [],
      bendLines: [],
    };
    const bytes = exportDxf({ kind: 'region', region }, { format: 'dxf' });
    const dxf = parse(bytes);
    const polys = dxf.entities.filter(e => e.type === 'LWPOLYLINE');
    expect(polys).toHaveLength(1);
    expect(polys[0].layer).toBe('cut');
    expect(polys[0].vertices).toHaveLength(4);
    // $INSUNITS = 4 (mm).
    expect(dxf.header.$INSUNITS).toBe(4);
  });

  it('emits a separate BEND layer when the region carries bend lines', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [50, 0], [50, 25], [0, 25]],
      holes: [],
      bendLines: [
        { start: [25, 0], end: [25, 25], angle: 90, radius: 1, ordinal: 0 },
      ],
    };
    const bytes = exportDxf({ kind: 'region', region }, { format: 'dxf' });
    const dxf = parse(bytes);
    const layers = new Set(dxf.entities.map(e => e.layer));
    expect(layers.has('cut')).toBe(true);
    expect(layers.has('BEND')).toBe(true);
  });

  it('declares an empty BEND layer when the region has no bend lines', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [],
      bendLines: [],
    };
    const bytes = exportDxf({ kind: 'region', region }, { format: 'dxf' });
    const text = new TextDecoder().decode(bytes);
    // Layer table includes BEND even when empty. Look for `2\nBEND` after
    // a `LAYER` table entry.
    expect(text).toMatch(/LAYER\n\s*2\nBEND/);
  });

  it('records OCCT tessellation tolerance in a 999 header comment', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [],
      bendLines: [],
    };
    const bytes = exportDxf(
      { kind: 'region', region },
      { format: 'dxf', tolerance: 0.05 },
    );
    const text = new TextDecoder().decode(bytes);
    expect(text).toMatch(/tolerance: 0\.05 mm \(OCCT tessellation\)/);
    expect(text).toMatch(/kernelcad \S+ \d{4}-\d{2}-\d{2}/);
  });

  it('emits LWPOLYLINE only — never SPLINE entities', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [[[2, 2], [4, 2], [4, 4], [2, 4]]],
      bendLines: [],
    };
    const bytes = exportDxf({ kind: 'region', region }, { format: 'dxf' });
    const text = new TextDecoder().decode(bytes);
    expect(text).not.toMatch(/^\s*0\s*\nSPLINE/m);
  });

  it('emits each hole as its own closed LWPOLYLINE on the cut layer', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [20, 0], [20, 20], [0, 20]],
      holes: [
        [[5, 5], [7, 5], [7, 7], [5, 7]],
        [[12, 12], [14, 12], [14, 14], [12, 14]],
      ],
      bendLines: [],
    };
    const bytes = exportDxf({ kind: 'region', region }, { format: 'dxf' });
    const dxf = parse(bytes);
    const cutPolys = dxf.entities.filter(
      e => e.type === 'LWPOLYLINE' && e.layer === 'cut',
    );
    // 1 outer + 2 holes = 3 polylines on the cut layer.
    expect(cutPolys).toHaveLength(3);
  });

  it('writes $INSUNITS = 1 when unit = "in"', () => {
    const region: Region = {
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [],
      bendLines: [],
    };
    const bytes = exportDxf(
      { kind: 'region', region },
      { format: 'dxf', unit: 'in' },
    );
    const dxf = parse(bytes);
    expect(dxf.header.$INSUNITS).toBe(1);
  });

  it('accepts the planarWires input shape (outer + holes)', () => {
    const bytes = exportDxf(
      {
        kind: 'planarWires',
        outer: [[0, 0], [10, 0], [10, 10], [0, 10]],
        holes: [[[2, 2], [4, 2], [4, 4], [2, 4]]],
      },
      { format: 'dxf' },
    );
    const dxf = parse(bytes);
    const cutPolys = dxf.entities.filter(
      e => e.type === 'LWPOLYLINE' && e.layer === 'cut',
    );
    expect(cutPolys).toHaveLength(2);
  });
});
