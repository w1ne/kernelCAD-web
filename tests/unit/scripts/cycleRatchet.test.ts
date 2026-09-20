import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { collectCycles, collectCyclesDetailed, diffCycles, canonicalCycle } from '../../../scripts/lib/cycleRatchet';

describe('cycleRatchet', () => {
  it('canonicalises rotation', () => {
    expect(canonicalCycle(['b.ts', 'c.ts', 'a.ts'])).toBe('a.ts > b.ts > c.ts');
  });
  it('detects a two-file cycle in a fixture', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-cycle-'));
    try {
      mkdirSync(join(root, 'src'));
      writeFileSync(join(root, 'src/a.ts'), "import { b } from './b';\nexport const a = 1 + b;\n");
      writeFileSync(join(root, 'src/b.ts'), "import { a } from './a';\nexport const b = 2;\nexport const c = a;\n");
      writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"moduleResolution":"bundler","module":"esnext"}}');
      expect(await collectCycles(root, 'tsconfig.json')).toEqual(['a.ts > b.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('diff reports added and stale', () => {
    const r = diffCycles(['a > b', 'x > y'], ['a > b', 'p > q']);
    expect(r.ok).toBe(false);
    expect(r.added).toEqual(['x > y']);
    expect(r.stale).toEqual(['p > q']);
  });
  it('ignores a cycle that only exists through type-only imports', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-cycle-'));
    try {
      mkdirSync(join(root, 'src'));
      writeFileSync(join(root, 'src/a.ts'), "import type { B } from './b';\nexport const a: B | number = 1;\n");
      writeFileSync(join(root, 'src/b.ts'), "import type { A } from './a';\nexport type B = A | string;\n");
      writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"moduleResolution":"bundler","module":"esnext"}}');
      expect(await collectCycles(root, 'tsconfig.json')).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('real tree: no cycles beyond scripts/lib/cycleBaseline.json', async () => {
    const root = resolve(__dirname, '../../..');
    const baseline = JSON.parse(readFileSync(resolve(root, 'scripts/lib/cycleBaseline.json'), 'utf8')) as string[];
    const { cycles, skipped } = await collectCyclesDetailed(root, 'tsconfig.app.json');
    const r = diffCycles(cycles, baseline);
    const msg = [
      ...r.added.map((c) => `NEW CYCLE   ${c}`),
      ...r.stale.map((c) => `STALE       ${c} — run: npx tsx scripts/qualityBaselineRegen.ts`),
    ].join('\n');
    expect(r.ok, msg).toBe(true);
    const knownSkipped = ['replicad', '@mujoco/mujoco', 'tailwindcss', './routeTree.gen'];
    for (const s of skipped) {
      expect(knownSkipped.some((k) => s.includes(k)), `unexpected skipped module: ${s}`).toBe(true);
    }
  }, 480_000);
});
