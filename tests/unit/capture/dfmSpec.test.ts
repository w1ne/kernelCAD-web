// tests/unit/capture/dfmSpec.test.ts
//
// W3 DFM gates — Task 2: the `dfmSpec({...})` declaration captures a
// virtual record carrying normalized print-prep gate parameters. This
// slice is capture-side only (record + API surface + validation); the
// check engine that enforces the gates at evaluate time lands in later
// tasks.
//
// Validation deviates from the renderEnvironment stash-on-metadata
// pattern DELIBERATELY: stashed virtual-record diagnostics never reach
// evaluate (recomputeEngine marks virtual records healthy and skips
// them), and a silently-disabled enforcement gate is agent-hostile.
// Malformed declarations THROW KernelError instead.

import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { DfmSpecMetadata } from '../../../src/shared/intent/dfmSpecRecord';

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createApi({ session }) };
}

function getMeta(session: CaptureSession): DfmSpecMetadata {
  const records = session.getRecords().filter(r => r.kind === 'dfmSpec');
  expect(records).toHaveLength(1);
  return records[0].metadata as unknown as DfmSpecMetadata;
}

describe('dfmSpec capture', () => {
  it('registers ONE dfmSpec record with normalized metadata', () => {
    const { session, api } = makeApi();
    const handle = api.dfmSpec({ minWall: 1.5, minClearance: 0.45 });
    const meta = getMeta(session);
    expect(handle.id).toMatch(/^dfmSpec_/);
    expect(handle.metadata).toEqual(meta);
    expect(meta.virtual).toBe(true);
    expect(meta.minWall).toBe(1.5);
    expect(meta.minClearance).toBe(0.45);
    expect(meta.ignore).toEqual([]);
    expect(meta.exclude).toEqual([]);
    expect(meta.channels).toEqual([]);
  });

  it('normalizes channels with a sealed default of false', () => {
    const { session, api } = makeApi();
    api.dfmSpec({
      channels: [
        { part: 'shape', name: 'drain', openings: 2 },
        { part: 'shape', name: 'pocket', openings: 0, sealed: true },
      ],
    });
    const meta = getMeta(session);
    expect(meta.channels).toEqual([
      { part: 'shape', name: 'drain', openings: 2, sealed: false },
      { part: 'shape', name: 'pocket', openings: 0, sealed: true },
    ]);
  });

  it('keeps exclude globs verbatim (expansion happens at check time)', () => {
    const { session, api } = makeApi();
    api.dfmSpec({ minWall: 1, exclude: ['servo-*'] });
    const meta = getMeta(session);
    expect(meta.exclude).toEqual(['servo-*']);
  });

  it('throws KernelError naming minWall for a negative minWall', () => {
    const { api } = makeApi();
    expect(() => api.dfmSpec({ minWall: -1 })).toThrow(KernelError);
    try { api.dfmSpec({ minWall: -1 }); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/minWall/);
    }
  });

  it('throws KernelError when the spec declares no checks at all', () => {
    const { api } = makeApi();
    expect(() => api.dfmSpec({})).toThrow(KernelError);
    try { api.dfmSpec({}); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/declares no checks/);
    }
  });

  it('throws KernelError naming ignore when an entry is not a pair', () => {
    const { api } = makeApi();
    const spec = { minWall: 1, ignore: [['a']] as unknown as ReadonlyArray<readonly [string, string]> };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/ignore/);
    }
  });

  it('throws KernelError (not a raw TypeError) for a non-array ignore field', () => {
    const { api } = makeApi();
    const spec = { minWall: 1, ignore: 'a,b' as unknown as ReadonlyArray<readonly [string, string]> };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/ignore/);
    }
  });

  it('throws KernelError naming openings for a non-integer channel openings', () => {
    const { api } = makeApi();
    const spec = { channels: [{ part: 'x', name: 'c', openings: 1.5 }] };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/openings/);
    }
  });

  it('throws KernelError when openings is 0 without sealed: true', () => {
    const { api } = makeApi();
    const spec = { channels: [{ part: 'x', name: 'c', openings: 0 }] };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/openings/);
    }
  });
});

describe('dfmSpec in a built model', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds with zero diagnostics — virtual record skipped by the engine', async () => {
    const m = await buildModel({
      fileName: 'dfm-spec-box.kcad.ts',
      code: `
        dfmSpec({ minWall: 1.2, minClearance: 0.4 });
        return box(10, 10, 10);
      `,
    });
    expect(m.diagnostics).toEqual([]);
    expect(m.tailShape).toBeDefined();
    expect(m.tailShape!.volume()).toBeGreaterThan(990);
  });
});
