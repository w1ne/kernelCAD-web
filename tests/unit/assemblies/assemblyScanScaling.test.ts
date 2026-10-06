// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

/** Array proxy that counts numeric-index reads. */
function countingArray(initial: FeatureRecord[]): { array: FeatureRecord[]; reads: () => number } {
  let reads = 0;
  const array = new Proxy(initial, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) reads += 1;
      return Reflect.get(target, prop, receiver);
    },
  });
  return { array, reads: () => reads };
}

function captureRow(n: number): { session: CaptureSession; captureReads: number } {
  const session = new CaptureSession();
  const counted = countingArray([]);
  (session as unknown as { records: FeatureRecord[] }).records = counted.array;
  const kc = createModelingApi({ session });
  const arm = kc.assembly('row');
  for (let i = 0; i < n; i++) arm.part(`p${i}`, kc.box(10, 10, 10), { at: [i * 20, 0, 0] });
  arm.model();
  return { session, captureReads: counted.reads() };
}

async function lowerReads(session: CaptureSession): Promise<number> {
  const counted = countingArray([...session.getRecords()]);
  await new RecomputeEngine(new OcctLowerer()).run(counted.array);
  return counted.reads();
}

describe('assembly capture and lowering scale linearly in part count', () => {
  beforeAll(async () => { await initOcct(); });

  it('capture reads the records array O(n) times', () => {
    const small = captureRow(100).captureReads;
    const large = captureRow(300).captureReads;
    expect(large / small).toBeLessThan(5);
  });

  it('assemblyModel lowering reads the records array O(n) times', async () => {
    const small = await lowerReads(captureRow(100).session);
    const large = await lowerReads(captureRow(300).session);
    expect(large / small).toBeLessThan(5);
  }, 120_000);
});
