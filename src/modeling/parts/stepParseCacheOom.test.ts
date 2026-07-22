// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/stepParseCacheOom.test.ts
//
// The out-of-memory path of the STEP parse cache. Kept out of
// stepParseCache.test.ts because it mocks replicad.importSTEP, while that file
// deliberately exercises the real OCCT importer.
//
// Background: an exhausted OCCT wasm heap surfaces in JS as the bare number 24
// (`__cxa_allocate_exception` = `malloc(size + 24) + 24`, with malloc → 0).
// Reported as a parse failure it reads as "your file is corrupt", which is both
// wrong and unactionable — the same bytes import fine on a healthy heap.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const importSTEP = vi.fn();

vi.mock('replicad', async (importOriginal) => {
  const actual = await importOriginal<typeof import('replicad')>();
  return { ...actual, importSTEP: (blob: Blob) => importSTEP(blob) };
});

vi.mock('../../kernel/backends/occt/occtBackend', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../kernel/backends/occt/occtBackend')>();
  // initOcct would boot the real wasm module; these tests never reach OCCT.
  return { ...actual, initOcct: vi.fn(async () => {}) };
});

const { importStepCached, StepParseError, __resetStepParseCache, __stepParseCacheStats } = await import(
  './stepParseCache'
);

/** Minimal stand-in for a replicad Shape3D — `meshShape` is the duck-type the
 *  cache uses to accept an import as 3D. */
interface FakeSolid {
  deleted: boolean;
  meshShape: () => undefined;
  clone: () => FakeSolid;
  delete: () => void;
}

function fakeSolid(): FakeSolid {
  const solid: FakeSolid = {
    deleted: false,
    meshShape: () => undefined,
    clone: () => fakeSolid(),
    delete: () => {
      solid.deleted = true;
    },
  };
  return solid;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const OOM = 24;

beforeEach(() => {
  importSTEP.mockReset();
  __resetStepParseCache();
});

afterEach(() => vi.restoreAllMocks());

describe('importStepCached — OCCT out-of-memory', () => {
  it('deduplicates concurrent same-hash imports and gives callers independent clones', async () => {
    const importGate = deferred<FakeSolid>();
    importSTEP.mockImplementation(() => importGate.promise);
    const bytes = Buffer.from('same-step-concurrently');

    const first = importStepCached(bytes);
    await vi.waitFor(() => expect(importSTEP).toHaveBeenCalledTimes(1));

    const second = importStepCached(bytes);
    // Give an overlapping caller a full turn to observe the in-flight import.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const importsWhilePending = importSTEP.mock.calls.length;

    importGate.resolve(fakeSolid());
    const [firstClone, secondClone] = await Promise.all([first, second]);

    expect(importsWhilePending).toBe(1);
    expect(__stepParseCacheStats()).toMatchObject({ hits: 1, misses: 1, size: 1 });
    expect(firstClone).not.toBe(secondClone);

    const firstShape = firstClone.getReplicadShape() as unknown as FakeSolid;
    const secondShape = secondClone.getReplicadShape() as unknown as FakeSolid;
    expect(firstShape).not.toBe(secondShape);
    firstClone.dispose();
    expect(firstShape.deleted).toBe(true);
    expect(secondShape.deleted).toBe(false);
  });

  it('clears a failed same-hash pending import so a later caller can retry', async () => {
    const importGate = deferred<FakeSolid>();
    let failCurrentImport = true;
    importSTEP.mockImplementation(() =>
      failCurrentImport ? importGate.promise : Promise.resolve(fakeSolid()),
    );
    const bytes = Buffer.from('same-step-failure');

    const first = importStepCached(bytes);
    await vi.waitFor(() => expect(importSTEP).toHaveBeenCalledTimes(1));
    const second = importStepCached(bytes);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const importsWhilePending = importSTEP.mock.calls.length;

    importGate.reject(new Error('transient import failure'));
    await expect(Promise.all([first, second])).rejects.toMatchObject({ reason: 'parse' });

    failCurrentImport = false;
    await expect(importStepCached(bytes)).resolves.toBeDefined();
    expect(importsWhilePending).toBe(1);
    expect(importSTEP).toHaveBeenCalledTimes(2);
    expect(__stepParseCacheStats()).toMatchObject({ misses: 1, size: 1 });
  });

  it('retries once after purging cached masters, and succeeds', async () => {
    // First call OOMs; the cache drops its masters to reclaim wasm heap and the
    // retry — with the identical bytes — goes through.
    importSTEP.mockRejectedValueOnce(OOM).mockResolvedValueOnce(fakeSolid());

    await expect(importStepCached(Buffer.from('step-a'))).resolves.toBeDefined();
    expect(importSTEP).toHaveBeenCalledTimes(2);
  });

  it('reports out-of-memory, NOT a parse failure, when the retry also OOMs', async () => {
    importSTEP.mockRejectedValue(OOM);

    const err = await importStepCached(Buffer.from('step-b')).catch((e) => e);
    expect(err).toBeInstanceOf(StepParseError);
    expect((err as InstanceType<typeof StepParseError>).reason).toBe('out-of-memory');
    // The old behaviour was a message of literally "24".
    expect((err as Error).message).not.toBe('24');
    expect((err as Error).message).toContain('OCCT wasm heap exhausted');
  });

  it('does not retry — or mislabel — an ordinary parse failure', async () => {
    importSTEP.mockRejectedValue(new Error('Failed to load STEP file'));

    const err = await importStepCached(Buffer.from('step-c')).catch((e) => e);
    expect((err as InstanceType<typeof StepParseError>).reason).toBe('parse');
    expect((err as Error).message).toBe('Failed to load STEP file');
    // A malformed file will not become well-formed by freeing memory.
    expect(importSTEP).toHaveBeenCalledTimes(1);
  });

  it('surfaces an opaque non-OOM OCCT pointer without calling it out-of-memory', async () => {
    importSTEP.mockRejectedValue(5_600_432);

    const err = await importStepCached(Buffer.from('step-d')).catch((e) => e);
    expect((err as InstanceType<typeof StepParseError>).reason).toBe('parse');
    expect((err as Error).message).toContain('5600432');
    expect((err as Error).message).not.toBe('5600432');
  });
});
