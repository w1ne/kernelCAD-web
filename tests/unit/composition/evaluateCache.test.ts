// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  clearEvaluateCache,
  evaluateCacheKey,
  getEvaluatedScript,
  rememberEvaluatedScript,
} from '../../../src/composition/evaluateCache';

describe('evaluateCache', () => {
  beforeEach(() => {
    clearEvaluateCache();
  });

  it('does not key an evaluate that carries extra requirements', () => {
    expect(evaluateCacheKey({ file: '/tmp/x.kcad.ts', requirements: { foo: 1 } })).toBeUndefined();
  });

  it('does not key inline code, a custom API, a baseline, or skipDfmGate', () => {
    const file = { file: '/tmp/x.kcad.ts' };
    expect(evaluateCacheKey({ code: 'return box(1,1,1);' })).toBeUndefined();
    expect(evaluateCacheKey(file, { apiFactory: () => undefined })).toBeUndefined();
    expect(evaluateCacheKey({ ...file, baseline: {} })).toBeUndefined();
    expect(evaluateCacheKey(file, { skipDfmGate: true })).toBeUndefined();
  });

  it('includes device, inode, mtime, ctime, and size in a file key', () => {
    const path = join(tmpdir(), `kcad-eval-cache-${process.pid}.kcad.ts`);
    writeFileSync(path, 'return box(1, 1, 1);\n');
    const stat = statSync(path);
    const key = evaluateCacheKey({ file: path, kernel: 'occt' });
    expect(key).toBe(
      `file:occt:${path}:${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`,
    );
  });

  it('does not remember a failed evaluate, and returns the stored success', () => {
    rememberEvaluatedScript('k', { evaluation: { exitCode: 1 } });
    expect(getEvaluatedScript('k')).toBeUndefined();
    const ok = { evaluation: { exitCode: 0 }, tag: 'ok' };
    rememberEvaluatedScript('k', ok);
    expect(getEvaluatedScript('k')).toBe(ok);
  });

});
