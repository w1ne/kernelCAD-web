import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { collectFindings, diffAgainstBaseline, listSourceFiles, type Finding } from '../../../scripts/lib/qualityRatchet';

function complexFn(branches: number): string {
  let body = 'export function big(x: number): number {\n  let r = 0;\n';
  for (let i = 0; i < branches; i++) body += `  if (x === ${i}) r += ${i};\n`;
  return body + '  return r;\n}\n';
}

describe('qualityRatchet.collectFindings', () => {
  it('reports complexity and function length with symbol names', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-ratchet-'));
    try {
      mkdirSync(join(root, 'src'), { recursive: true });
      writeFileSync(join(root, 'src/a.ts'), complexFn(25));
      const f = await collectFindings(root, ['src/a.ts']);
      const cx = f.find((x) => x.rule === 'complexity');
      expect(cx).toBeDefined();
      expect(cx!.file).toBe('src/a.ts');
      expect(cx!.symbol).toBe("Function 'big'");
      expect(cx!.value).toBe(26);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns no findings for a small file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-ratchet-'));
    try {
      mkdirSync(join(root, 'src'), { recursive: true });
      writeFileSync(join(root, 'src/a.ts'), 'export const one = 1;\n');
      expect(await collectFindings(root, ['src/a.ts'])).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('disambiguates repeated anonymous symbols in one file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-ratchet-'));
    try {
      mkdirSync(join(root, 'src'), { recursive: true });
      const arrow = (n: number) =>
        `export const f${n} = (x: number) => {\n  let r = 0;\n` +
        Array.from({ length: 25 }, (_, i) => `  if (x === ${i}) r += ${i};\n`).join('') +
        '  return r;\n};\n';
      writeFileSync(join(root, 'src/a.ts'), arrow(1) + arrow(2));
      const f = (await collectFindings(root, ['src/a.ts'])).filter((x) => x.rule === 'complexity');
      expect(f.map((x) => x.symbol)).toEqual(['Arrow function', 'Arrow function#2']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('qualityRatchet.diffAgainstBaseline', () => {
  const base: Finding = { rule: 'complexity', file: 'src/a.ts', symbol: "Function 'big'", value: 30 };
  it('ok when identical', () => {
    expect(diffAgainstBaseline([base], [base]).ok).toBe(true);
  });
  it('fails on a new finding', () => {
    const extra: Finding = { ...base, symbol: "Function 'other'" };
    const r = diffAgainstBaseline([base, extra], [base]);
    expect(r.ok).toBe(false);
    expect(r.added).toEqual([extra]);
  });
  it('fails when a baselined finding grows', () => {
    const r = diffAgainstBaseline([{ ...base, value: 31 }], [base]);
    expect(r.ok).toBe(false);
    expect(r.grown).toHaveLength(1);
  });
  it('fails when a baselined finding shrinks (reported as shrunk), and reports stale when it disappears', () => {
    const shrunkAfter: Finding = { ...base, value: 22 };
    const r1 = diffAgainstBaseline([shrunkAfter], [base]);
    expect(r1.ok).toBe(false);
    expect(r1.shrunk).toEqual([{ before: base, after: shrunkAfter }]);
    const r = diffAgainstBaseline([], [base]);
    expect(r.ok).toBe(false);
    expect(r.stale).toEqual([base]);
  });
});

describe('quality ratchet (real tree)', () => {
  it('src/** has no complexity/size findings beyond scripts/lib/qualityBaseline.json', async () => {
    const root = resolve(__dirname, '../../..');
    const baseline = JSON.parse(readFileSync(resolve(root, 'scripts/lib/qualityBaseline.json'), 'utf8')) as Finding[];
    const current = await collectFindings(root, listSourceFiles(root));
    const r = diffAgainstBaseline(current, baseline);
    const fmt = (f: Finding) => `${f.file} ${f.symbol} (${f.rule}=${f.value})`;
    const msg = [
      ...r.added.map((f) => `NEW      ${fmt(f)} — split it or reduce below the threshold`),
      ...r.grown.map(({ before, after }) => `GREW     ${fmt(after)} (was ${before.value})`),
      ...r.shrunk.map(
        ({ before, after }) =>
          `SHRUNK   ${after.file} ${after.symbol} (${after.rule}=${after.value}, was ${before.value}) — good; run: npx tsx scripts/qualityBaselineRegen.ts`,
      ),
      ...r.stale.map((f) => `STALE    ${fmt(f)} — run: npx tsx scripts/qualityBaselineRegen.ts`),
    ].join('\n');
    expect(r.ok, msg).toBe(true);
  }, 480_000);
});
