import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectFindings, diffAgainstBaseline, type Finding } from '../../../scripts/lib/qualityRatchet';

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
  it('passes when a baselined finding shrinks, but reports stale when it disappears', () => {
    expect(diffAgainstBaseline([{ ...base, value: 22 }], [base]).ok).toBe(true);
    const r = diffAgainstBaseline([], [base]);
    expect(r.ok).toBe(false);
    expect(r.stale).toEqual([base]);
  });
});
