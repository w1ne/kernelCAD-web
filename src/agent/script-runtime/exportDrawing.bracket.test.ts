// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The gallery bracket's declared dimensions on its drawing sheet. Own file so
// the export runs on a fresh OCCT instance.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

const BRACKET = readFileSync(resolve(__dirname, '../../../examples/gallery/mounting-bracket-dimensioned.kcad.ts'), 'utf8');

/** The `<line>` segments of the dimension group whose label is `label`. */
function dimLines(svg: string, label: string): Array<[number, number, number, number]> {
  const group = svg.split('<g class="dim"').find((g) => g.includes(`>${label}</text>`));
  expect(group, `no dimension labelled "${label}"`).toBeDefined();
  return [...group!.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g)]
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]);
}

describe('gallery bracket drawing', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('draws every declared dimension with its value, each on a view where it has length', async () => {
    const r = await runAndExport({
      code: BRACKET, fileName: 'mounting-bracket-dimensioned.kcad.ts', format: 'svg-drawing',
      options: { format: 'svg-drawing' } as never,
    });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const svg = new TextDecoder().decode(r.bytes);
    for (const text of ['hole spacing X 40', 'hole spacing Y 18', 'thickness 6']) {
      expect(svg).toContain(`>${text}</text>`);
      // Third segment is the dimension line itself (two extension lines first).
      const [x1, y1, x2, y2] = dimLines(svg, text)[2];
      expect(Math.hypot(x2 - x1, y2 - y1), text).toBeGreaterThan(1);
    }
    expect(svg).toContain('bolt hole ⌀5');
  }, 60_000);
});
