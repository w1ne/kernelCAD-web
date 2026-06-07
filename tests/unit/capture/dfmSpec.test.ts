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

  it('throws KernelError when sealed: true comes with openings !== 0', () => {
    const { api } = makeApi();
    const spec = { channels: [{ part: 'x', name: 'c', openings: 2, sealed: true }] };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/channels\[0\]\.openings/);
      expect((e as KernelError).message).toMatch(/sealed/);
    }
  });

  it('throws KernelError naming the duplicate channel for a repeated (part, name) pair', () => {
    const { api } = makeApi();
    const spec = {
      channels: [
        { part: 'shape', name: 'drain', openings: 2 },
        { part: 'shape', name: 'drain', openings: 3 },
      ],
    };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/channels\[1\]/);
      expect((e as KernelError).message).toMatch(/duplicates/);
      expect((e as KernelError).message).toMatch(/'shape'/);
      expect((e as KernelError).message).toMatch(/'drain'/);
    }
  });

  it('throws KernelError for a self-pair in ignore', () => {
    const { api } = makeApi();
    const spec = { minWall: 1, ignore: [['lid', 'lid']] as ReadonlyArray<readonly [string, string]> };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/ignore\[0\]/);
      expect((e as KernelError).message).toMatch(/two different parts/);
    }
  });

  it('throws KernelError for a non-trailing * in an exclude glob', () => {
    const { api } = makeApi();
    for (const glob of ['ser*vo', '*servo']) {
      const spec = { minWall: 1, exclude: [glob] };
      expect(() => api.dfmSpec(spec)).toThrow(KernelError);
      try { api.dfmSpec(spec); }
      catch (e) {
        expect((e as KernelError).code).toBe('feature.invalid-args');
        expect((e as KernelError).message).toMatch(/exclude\[0\]/);
        expect((e as KernelError).message).toMatch(/trailing-'\*'/);
      }
    }
  });

  it('throws KernelError for a bare * exclude (would no-op every check)', () => {
    const { api } = makeApi();
    const spec = { minWall: 1, exclude: ['*'] };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/exclude\[0\]/);
    }
  });

  it('throws KernelError naming minWall for NaN and Infinity', () => {
    const { api } = makeApi();
    for (const v of [NaN, Infinity]) {
      expect(() => api.dfmSpec({ minWall: v })).toThrow(KernelError);
      try { api.dfmSpec({ minWall: v }); }
      catch (e) {
        expect((e as KernelError).code).toBe('feature.invalid-args');
        expect((e as KernelError).message).toMatch(/minWall/);
      }
    }
  });

  it('throws KernelError naming minClearance for NaN and Infinity', () => {
    const { api } = makeApi();
    for (const v of [NaN, Infinity]) {
      expect(() => api.dfmSpec({ minClearance: v })).toThrow(KernelError);
      try { api.dfmSpec({ minClearance: v }); }
      catch (e) {
        expect((e as KernelError).code).toBe('feature.invalid-args');
        expect((e as KernelError).message).toMatch(/minClearance/);
      }
    }
  });

  it('throws KernelError for invalid exclude entries (empty string, non-string)', () => {
    const { api } = makeApi();
    for (const entry of ['', 42 as unknown as string]) {
      const spec = { minWall: 1, exclude: [entry] };
      expect(() => api.dfmSpec(spec)).toThrow(KernelError);
      try { api.dfmSpec(spec); }
      catch (e) {
        expect((e as KernelError).code).toBe('feature.invalid-args');
        expect((e as KernelError).message).toMatch(/exclude\[0\]/);
      }
    }
  });

  it('throws KernelError for a non-object channel entry', () => {
    const { api } = makeApi();
    const spec = { channels: ['drain' as unknown as { part: string; name: string; openings: number }] };
    expect(() => api.dfmSpec(spec)).toThrow(KernelError);
    try { api.dfmSpec(spec); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/channels\[0\]/);
    }
  });

  it('throws KernelError naming part / name for empty channel part and name', () => {
    const { api } = makeApi();
    const emptyPart = { channels: [{ part: '', name: 'drain', openings: 1 }] };
    expect(() => api.dfmSpec(emptyPart)).toThrow(KernelError);
    try { api.dfmSpec(emptyPart); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/channels\[0\]\.part/);
    }
    const emptyName = { channels: [{ part: 'shape', name: '', openings: 1 }] };
    expect(() => api.dfmSpec(emptyName)).toThrow(KernelError);
    try { api.dfmSpec(emptyName); }
    catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
      expect((e as KernelError).message).toMatch(/channels\[0\]\.name/);
    }
  });

  it('keeps the last record when called twice', () => {
    const { session, api } = makeApi();
    api.dfmSpec({ minWall: 1 });
    api.dfmSpec({ minWall: 2 });
    const recs = session.getRecords().filter(r => r.kind === 'dfmSpec');
    expect(recs).toHaveLength(2);
    // Resolution rule (last wins) lives in the check engine, not the session;
    // session simply allows multiple registrations. Readers take the LAST
    // dfmSpec record (same convention as renderEnvironment).
    const last = recs[recs.length - 1].metadata as unknown as DfmSpecMetadata;
    expect(last.minWall).toBe(2);
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
