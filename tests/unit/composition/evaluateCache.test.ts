// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import '../../../src/modeling/runtime/hostFsNode';
import {
  EVALUATE_CACHE_LIMIT,
  clearEvaluateCache,
  evaluateCacheKey,
  evaluateCacheSize,
  getEvaluatedScript,
  rememberEvaluatedScript,
} from '../../../src/composition/evaluateCache';

function writeScript(name: string, source: string, extra?: Record<string, string>): string {
  const dir = join(tmpdir(), `kcad-eval-cache-${process.pid}-${name}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'model.kcad.ts');
  writeFileSync(path, source);
  if (extra !== undefined) {
    for (const [file, contents] of Object.entries(extra)) {
      writeFileSync(join(dir, file), contents);
    }
  }
  return path;
}

describe('evaluateCache', () => {
  beforeEach(() => {
    clearEvaluateCache();
  });

  it('does not key an evaluate that carries extra requirements', async () => {
    expect(await evaluateCacheKey({ file: '/tmp/x.kcad.ts', requirements: { foo: 1 } })).toBeUndefined();
  });

  it('does not key inline code, a custom API, a baseline, or skipDfmGate', async () => {
    const file = { file: '/tmp/x.kcad.ts' };
    expect(await evaluateCacheKey({ code: 'return box(1,1,1);' })).toBeUndefined();
    expect(await evaluateCacheKey(file, { apiFactory: () => undefined })).toBeUndefined();
    expect(await evaluateCacheKey({ ...file, baseline: {} })).toBeUndefined();
    expect(await evaluateCacheKey(file, { skipDfmGate: true })).toBeUndefined();
  });

  it('includes device, inode, mtime, ctime, size, and import identity in a file key', async () => {
    const path = writeScript('stat', 'return box(1, 1, 1);\n');
    const stat = statSync(path);
    const key = await evaluateCacheKey({ file: path, kernel: 'occt' });
    expect(key).toBe(
      `file:occt:${path}:${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}:imports:`,
    );
  });

  it('does not remember a failed evaluate, and returns the stored success', () => {
    rememberEvaluatedScript('k', { evaluation: { exitCode: 1 } });
    expect(getEvaluatedScript('k')).toBeUndefined();
    const ok = { evaluation: { exitCode: 0 }, tag: 'ok' };
    rememberEvaluatedScript('k', ok);
    expect(getEvaluatedScript('k')).toBe(ok);
  });

  it('misses after an imported asset changes even when the script file does not', async () => {
    const path = writeScript(
      'asset',
      "const imported = fromSTEP('part.step');\nreturn imported;\n",
      { 'part.step': 'ISO-10303-21; STEP A;' },
    );
    const before = await evaluateCacheKey({ file: path });
    writeFileSync(join(path, '..', 'part.step'), 'ISO-10303-21; STEP B;');
    const after = await evaluateCacheKey({ file: path });
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after).not.toBe(before);
  });

  it('does not cache a script that loads catalog geometry through lib.part', async () => {
    const path = writeScript(
      'lib-part',
      "const screw = await lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });\nreturn screw;\n",
    );
    expect(await evaluateCacheKey({ file: path })).toBeUndefined();
  });

  it('does not cache a script that loads catalog geometry through lib.standard', async () => {
    const path = writeScript(
      'lib-standard',
      "const servo = await lib.standard.sg90();\nreturn servo;\n",
    );
    expect(await evaluateCacheKey({ file: path })).toBeUndefined();
  });

  it('does not cache a script that aliases lib.part before calling it', async () => {
    const path = writeScript(
      'lib-part-alias',
      "const makePart = lib.part;\nconst screw = await makePart({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });\nreturn screw;\n",
    );
    expect(await evaluateCacheKey({ file: path })).toBeUndefined();
  });

  it('does not cache a script that destructures a catalog loader from lib', async () => {
    const path = writeScript(
      'lib-part-destructure',
      "const { part } = lib;\nconst screw = await part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });\nreturn screw;\n",
    );
    expect(await evaluateCacheKey({ file: path })).toBeUndefined();
  });

  it('does not cache a script whose import path is not a hashable literal', async () => {
    const path = writeScript(
      'dynamic',
      "const name = 'part.step';\nconst imported = fromSTEP(name);\nreturn imported;\n",
      { 'part.step': 'ISO-10303-21;' },
    );
    expect(await evaluateCacheKey({ file: path })).toBeUndefined();
  });

  it('evicts the oldest entry once the cache is full', () => {
    for (let i = 0; i < EVALUATE_CACHE_LIMIT + 1; i++) {
      rememberEvaluatedScript(`k${i}`, { evaluation: { exitCode: 0 }, i });
    }
    expect(evaluateCacheSize()).toBe(EVALUATE_CACHE_LIMIT);
    expect(getEvaluatedScript('k0')).toBeUndefined();
    expect(getEvaluatedScript(`k${EVALUATE_CACHE_LIMIT}`)).toEqual({
      evaluation: { exitCode: 0 },
      i: EVALUATE_CACHE_LIMIT,
    });
  });
});
