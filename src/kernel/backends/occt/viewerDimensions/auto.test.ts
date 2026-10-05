// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Real-OCCT gate for the automatic viewer dimensions. kernelCAD's
// cylinder(height, radius): cylinder(20, 2.5) is a Ø5 bore 20 long.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../occtBackend';
import { computeViewerDimensions } from './index';
import type { WorldFramePart } from '../sceneToWorldFrame';
import { partsFromSource } from '../../../../../tests/helpers/viewerDimensionParts';

beforeAll(async () => { await initOcct(); }, 60_000);

const textsOf = (parts: WorldFramePart[], budgetMs?: number) =>
  computeViewerDimensions({ parts, declared: [], auto: true, budgetMs }).dimensions.map(d => d.text).sort();
const texts = (src: string) => partsFromSource(src).then(parts => textsOf(parts));

describe('auto viewer dimensions', () => {
  it('plate with two Ø5 holes 30 apart', async () => {
    expect(await texts(`return box(40,20,10)
      .subtract(cylinder(20,2.5).translate(5,10,-5))
      .subtract(cylinder(20,2.5).translate(35,10,-5));`))
      .toEqual(['10', '2× Ø5', '20', '30', '40'].sort());
  });
  it('filleted block gives its radius', async () => {
    // All 12 edges carry the same R3 fillet, so the radius group is counted
    // like the hole group (groupLabel) — '12× R3', not a bare 'R3'.
    expect(await texts(`return box(30,30,30).fillet(3);`)).toContain('12× R3');
  });
  it('chamfered block gives its chamfer size', async () => {
    expect(await texts(`return box(40,30,10).chamfer(1);`)).toContain('1×45°');
  });
  it('sphere gives overall only', async () => {
    expect(await texts(`return sphere(50);`)).toEqual(['100', '100', '100']);
  });
  it('assembly over 8 parts gives overall only', async () => {
    const parts = Array.from({ length: 9 }, (_, i) => `a.part('p${i}', box(10,10,10).subtract(cylinder(20,2).translate(5,5,-5)).translate(${i * 12},0,0));`).join('\n');
    expect(await texts(`const a = assembly('row');\n${parts}\nreturn a.model();`)).toHaveLength(3);
  });
  it('tags per-part dimensions with the part name in a small assembly', async () => {
    const parts = await partsFromSource(`const a = assembly('pair');
      a.part('left', box(10,10,10).subtract(cylinder(20,2).translate(5,5,-5)));
      a.part('right', box(10,10,10).translate(12,0,0));
      return a.model();`);
    const dims = computeViewerDimensions({ parts, declared: [], auto: true }).dimensions;
    const hole = dims.find(d => d.kind === 'diameter');
    expect(hole).toMatchObject({ text: 'Ø4', part: 'left', source: 'auto', id: 'auto:holes:left:0' });
  });
});

describe('perforated plate (100 holes)', () => {
  let parts: WorldFramePart[] = [];
  beforeAll(async () => {
    const holes = Array.from({ length: 100 }, (_, i) => `.subtract(cylinder(20,1.5).translate(${5 + (i % 10) * 10},${5 + Math.floor(i / 10) * 10},-5))`).join('');
    parts = await partsFromSource(`return box(100,100,5)${holes};`);
  }, 120_000);

  // Hole recognition probes every bore (~120 ms each here), so 100 holes take
  // ~12 s — far over the 3 s default budget. The cap / grouping rules are
  // checked with a generous budget; the default-budget case is checked below.
  it('is capped and grouped', () => {
    const t = textsOf(parts, 60_000);
    expect(t).toContain('100× Ø3');
    expect(t.length).toBeLessThanOrEqual(20);
    expect(t.filter(x => x === '10')).toHaveLength(2); // one spacing per direction
  }, 60_000);

  it('aborts inside hole recognition at the default budget', () => {
    const start = performance.now();
    const r = computeViewerDimensions({ parts, declared: [], auto: true });
    expect(performance.now() - start).toBeLessThan(4_000);
    expect(r.dimensions).toEqual([]);
    expect(r.diagnostics.map(d => d.code)).toEqual(['viewer.dimensions.budget-exceeded']);
  }, 60_000);
});
