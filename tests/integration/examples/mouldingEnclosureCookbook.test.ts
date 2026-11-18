// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// injection-moulding-draft-and-walls cookbook: the snippet's enclosure base
// passes the moulding gate, and the two failure modes its comments describe
// are real — straight walls (no draft, sharp inside corners) and draft in
// the wrong direction (the shelled cavity narrows toward its opening, so the
// inner walls are undercuts).
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { runDfmChecksOnModel } from '../../../src/modeling/runtime/dfm/runDfmChecks';

const ID = 'injection-moulding-draft-and-walls';
const snippet = (): string =>
  readFileSync(`cookbook/snippets/${ID}.md`, 'utf8').split('```typescript')[1].split('```')[0];

async function gate(code: string) {
  const model = await buildModel({ fileName: 'enclosure.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error'), JSON.stringify(model.diagnostics)).toEqual([]);
  const report = (await runDfmChecksOnModel(model))!;
  return { report, m: report.moulding![0].result, codes: report.diagnostics.map(d => d.code) };
}

describe(`${ID} cookbook`, () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('the drafted, filleted enclosure base passes the moulding gate', async () => {
    const { report, m } = await gate(snippet());
    expect(report.diagnostics).toEqual([]);
    expect(m.verdict).toBe('pass');
    expect(m.draft.minDraftDeg).toBeCloseTo(1.5, 3);
    expect(m.undercut.areaMm2).toBe(0);
    expect(m.walls.thinnestMm).toBeCloseTo(2, 2);
    expect(m.thickest!.thicknessMm).toBeLessThan(3.5);
    expect(m.sharpCorners).toEqual([]);
  }, 120_000);

  it('straight walls fail on draft and warn on every sharp inside corner', async () => {
    const code = snippet()
      .replace(/for \(const side[\s\S]*?\n}\n/, '')
      .replace('.fillet(wall / 2, { concave: true })', '');
    const { m, codes } = await gate(code);
    expect(m.draft.insufficient).toHaveLength(8); // 4 outer + 4 inner side walls
    for (const f of m.draft.insufficient) expect(f.draftDeg).toBeCloseTo(0, 6);
    expect(codes.filter(c => c === 'dfm.moulding.sharp-corner')).toHaveLength(8);
    expect(m.verdict).toBe('fail');
  }, 120_000);

  it('draft in the wrong direction turns the inner walls into undercuts', async () => {
    const { m, codes } = await gate(snippet().replace('draftDeg.negate()', 'draftDeg'));
    // The four inner walls are the largest undercut faces; the inside-corner
    // fillets between them and the floor are locked too (16 faces in all,
    // 10 reported as diagnostics with a "6 more" note).
    expect(m.undercut.faces).toHaveLength(16);
    for (const f of m.undercut.faces.slice(0, 4)) expect(f.areaMm2).toBeGreaterThan(900);
    expect(m.undercut.areaMm2).toBeGreaterThan(5000);
    expect(codes.filter(c => c === 'dfm.moulding.undercut')).toHaveLength(10);
    expect(m.verdict).toBe('fail');
  }, 120_000);
});
