import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT, runTypecheck } from '../../../scripts/typecheckExamples';

// `feaStudy` keeps `param()` refs inside `fixed` / `loads[].faces` symbolic
// and resolves them at run time (`resolveStudyParams`). A plain `FaceQuery`
// type made both FEA examples fail TS2322 on `{ atZ: wall }`.
describe('typecheckExamples feaStudy param selectors', () => {
  it('accepts param() refs in the FEA example face selectors', async () => {
    const targets = ['examples/fea/shelf-bracket-fea.kcad.ts', 'examples/fea/stress-graded-infill-bracket.kcad.ts']
      .map(f => join(REPO_ROOT, f));
    expect(await runTypecheck(targets)).toBe(0);
  }, 180_000);

  it('accepts param() refs in fixed and loads selectors, and still rejects a string number', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kc-fea-param-'));
    const ok = join(dir, 'fea-param.kcad.ts');
    const bad = join(dir, 'fea-param-bad.kcad.ts');
    writeFileSync(ok, [
      "const t = param('t', 6, { min: 3, max: 12 });",
      'const plate = box(80, 40, t);',
      'plate.feaStudy({',
      "  material: 'petg',",
      '  fixed: { atX: 0, boundingBoxIn: { zMin: -1, zMax: t.add(1) } },',
      '  loads: [{ faces: { atZ: t, near: [70, 20, t] }, force: [0, 0, -50] }],',
      '});',
      'return plate;',
      '',
    ].join('\n'));
    writeFileSync(bad, [
      "const plate = box(80, 40, 6);",
      "plate.feaStudy({ material: 'petg', fixed: { atX: '0' }, loads: [{ faces: { atZ: 6 }, force: [0, 0, -50] }] });",
      'return plate;',
      '',
    ].join('\n'));
    try {
      expect(await runTypecheck([ok])).toBe(0);
      expect(await runTypecheck([bad])).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 180_000);
});
