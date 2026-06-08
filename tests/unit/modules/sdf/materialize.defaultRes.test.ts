// tests/unit/modules/sdf/materialize.defaultRes.test.ts
//
// Split out of materialize.test.ts for CI shard balance (per-file vitest
// sharding): the default-resolution materialize (res=30) is the slowest
// case in the sdf.materialize suite, so it pays its own OCCT init here.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { sphere } from '../../../../src/modeling/sdf/primitives';
import { materialize } from '../../../../src/modeling/sdf/materialize';

beforeAll(async () => {
  await initOcct();
});

describe('sdf.materialize (capture side)', () => {
  it('default resolution = 30 when opts is undefined', () => {
    const session = new CaptureSession();
    // Slice-1 deviation: plan called for default=50, but OCCT sewing is
    // O(triangle count) and res=50 takes ~170s for sphere(10). Default
    // lowered to 30 (~20s for sphere(10)). Use sphere(2) here so test
    // completes in <10s standalone, ~20s under parallel suite load.
    const s = materialize({ session }, sphere(2));
    const record = session.getRecords().find(r => r.id === s.id)!;
    expect(record.kind).toBe('sdfMaterialize');
    expect(record.params.resolution.evaluated).toBe(30);
  }, 120_000);
});
