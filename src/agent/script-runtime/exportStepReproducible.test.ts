// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: two exports of the same model used to differ in two places that
// come from process state, not the shape — the auto PRODUCT name index
// ('Open CASCADE STEP translator 7.6 3' vs '... 4', a process-global OCCT
// counter) and FILE_NAME's wall-clock time stamp. A buyer quoting from a file
// hash needs identical input to give identical bytes.

import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

beforeAll(async () => { await initOcct(); }, 120_000);

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
// Long enough for the FILE_NAME time stamp (1 s resolution) to tick over.
const nextSecond = () => new Promise((r) => setTimeout(r, 1100));

async function stepBytes(code: string): Promise<Uint8Array> {
  const result = await runAndExport({ fileName: 'repro.kcad.ts', format: 'step', code });
  expect(result.bytes.byteLength).toBeGreaterThan(0);
  return result.bytes;
}

describe('STEP export reproducibility', () => {
  it('writes byte-identical files for the same single-shape model', async () => {
    const code = 'return box(10, 10, 10);';
    const a = await stepBytes(code);
    await nextSecond();
    const b = await stepBytes(code);
    expect(sha256(b)).toBe(sha256(a));
  });

  it('writes byte-identical files for the same assembly', async () => {
    const code = `
      const arm = assembly('repro');
      arm.part('base', box(20, 20, 5));
      arm.part('pin', cylinder(3, 15).translate(0, 0, 5));
      return arm;
    `;
    const a = await stepBytes(code);
    await nextSecond();
    const b = await stepBytes(code);
    expect(sha256(b)).toBe(sha256(a));
  });

  it('still writes different files for different models', async () => {
    const a = await stepBytes('return box(10, 10, 10);');
    const b = await stepBytes('return box(10, 10, 11);');
    expect(sha256(b)).not.toBe(sha256(a));
  });
});
