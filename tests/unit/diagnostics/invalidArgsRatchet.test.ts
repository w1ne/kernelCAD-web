// tests/unit/diagnostics/invalidArgsRatchet.test.ts
//
// Lint-style gate: a `feature.invalid-args` / `cli.invalid-args` raise site
// must go through the shared raiser in `src/shared/intent/invalidArgs.ts`, so
// every one of these messages keeps naming the API + argument path, the
// received value, the requirement and an inline example.
//
// The code is raised from ~120 files, so the gate is a one-way ratchet over
// `scripts/lib/invalidArgsBaseline.json`: a file may only lose bypassing
// sites, never gain them, and a file absent from the baseline may have none.
// Regenerate after converting sites:
//   npx tsx scripts/invalidArgsBaselineRegen.ts

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  collectBaseline,
  diffAgainstBaseline,
  scanFile,
  type InvalidArgsBaseline,
} from '../../../scripts/lib/invalidArgsRatchet';

const ROOT = resolve(__dirname, '../../..');

function loadBaseline(): InvalidArgsBaseline {
  return JSON.parse(
    readFileSync(join(ROOT, 'scripts/lib/invalidArgsBaseline.json'), 'utf8'),
  ) as InvalidArgsBaseline;
}

describe('invalid-args raise sites go through the shared helper', () => {
  it('no file gained a bypassing raise site, and no new file appeared', () => {
    const diff = diffAgainstBaseline(loadBaseline(), collectBaseline(ROOT));
    const grew = diff.grew.map((g) => `${g.file}: ${g.baseline} -> ${g.current}`);
    const added = diff.added.map((a) => `${a.file}: ${a.current} (new)`);
    expect(
      [...grew, ...added],
      'Raise `feature.invalid-args` / `cli.invalid-args` through invalidArgs(...) or ' +
      'invalidArgsText(...) from src/shared/intent/invalidArgs.ts, so the message names the ' +
      'API + argument path, the received value, the requirement and an inline example. ' +
      'If the growth is intended, run: npx tsx scripts/invalidArgsBaselineRegen.ts --allow-new',
    ).toEqual([]);
  });

  it('the baseline is current (no stale, already-converted entries)', () => {
    const diff = diffAgainstBaseline(loadBaseline(), collectBaseline(ROOT));
    expect(
      diff.shrank.map((s) => `${s.file}: ${s.baseline} -> ${s.current}`),
      'Sites were converted — regenerate: npx tsx scripts/invalidArgsBaselineRegen.ts',
    ).toEqual([]);
  });

  it('the high-traffic families from the 2026-10-03 triage are fully converted', () => {
    // These are the message families the triage named: they must carry NO
    // bypassing raise site, so a new one in any of them fails the gate even
    // before the per-file counts are consulted.
    const CONVERTED = [
      'src/modeling/validation/holeValidation.ts',
      'src/modeling/validation/cutoutValidation.ts',
      'src/modeling/apiSupport.ts',
      'src/modeling/sheetMetal.ts',
      'src/modeling/spurGear.ts',
      'src/shared/intent/patternValidation.ts',
      'src/shared/runtime/paramTable.ts',
      'src/modeling/capture/proxyFeatureChain.ts',
      'src/modeling/mates/connector.ts',
      'src/modeling/backends/occt/lowerers/edgeFeatures.ts',
      'src/modeling/backends/occt/lowerers/shellDraft.ts',
      'src/modeling/backends/occt/lowerers/sheetMetal.ts',
      'src/agent/mcp/tools/addPatternFeature.ts',
    ];
    const offenders = CONVERTED.flatMap((file) =>
      scanFile(file, readFileSync(join(ROOT, file), 'utf8')).map((s) => `${s.file}:${s.line} (${s.kind})`),
    );
    expect(offenders).toEqual([]);
  });

  it('the helper itself is the one sanctioned raise site and is kept out of the baseline', () => {
    const helper = readFileSync(join(ROOT, 'src/shared/intent/invalidArgs.ts'), 'utf8');
    // It builds the KernelError, so it is the only file that may name the
    // default code directly — and the scanner must not count it.
    expect(helper).toContain("'feature.invalid-args'");
    expect(scanFile('src/shared/intent/invalidArgs.ts', helper).length).toBe(1);
    expect(collectBaseline(ROOT)['src/shared/intent/invalidArgs.ts']).toBeUndefined();
    expect(loadBaseline()['src/shared/intent/invalidArgs.ts']).toBeUndefined();
  });
});

describe('invalidArgsRatchet.scanFile', () => {
  it('flags a hand-rolled throw', () => {
    const src = `throw new KernelError('feature.invalid-args', 'bad', id, 'fix it');`;
    expect(scanFile('a.ts', src)).toEqual([{ file: 'a.ts', line: 1, kind: 'throw' }]);
  });

  it('flags a hand-rolled diagnostic push', () => {
    const src = [
      'diagnostics.push({',
      "  code: 'feature.invalid-args',",
      "  message: 'bad',",
      "  hint: 'fix it',",
      '});',
    ].join('\n');
    expect(scanFile('a.ts', src)).toEqual([{ file: 'a.ts', line: 2, kind: 'diagnostic' }]);
  });

  it('accepts a diagnostic whose text came from the helper', () => {
    const src = [
      'diagnostics.push({',
      "  code: 'feature.invalid-args',",
      '  ...invalidArgsText({ api: "f(x)", path: "x", got: 0, requires: "> 0", example: "f(1)" }),',
      '});',
    ].join('\n');
    expect(scanFile('a.ts', src)).toEqual([]);
  });

  it('accepts a helper call that names the code explicitly', () => {
    const src = [
      'invalidArgs({',
      "  code: 'cli.invalid-args',",
      '  api: "f(x)", path: "x", got: 0, requires: "> 0", example: "f(1)",',
      '});',
    ].join('\n');
    expect(scanFile('a.ts', src)).toEqual([]);
  });

  it('ignores other diagnostic codes', () => {
    const src = "throw new KernelError('feature.kernel-failed', 'boom');";
    expect(scanFile('a.ts', src)).toEqual([]);
  });
});
