// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { createSessionPool } from './sessionPool';
import type { BuiltModel } from '../modeling/buildModel';

/** Minimal fake BuiltModel: just enough session.engine surface for the hub. */
function fakeModel(label: string) {
    const subscribers = new Set<(ids: string[]) => void>();
    const model = {
        label,
        session: {
            engine: {
                onRelower(cb: (ids: string[]) => void) {
                    subscribers.add(cb);
                    return () => subscribers.delete(cb);
                },
            },
        },
        emit(ids: string[]) {
            for (const cb of subscribers) cb(ids);
        },
        subscriberCount: () => subscribers.size,
    };
    return model as typeof model & BuiltModel;
}

describe('sessionPool.rebuildByScript', () => {
    it('swaps the model, keeps the token, and emits a synthetic relower to hub subscribers', async () => {
        const modelA = fakeModel('a');
        const modelB = fakeModel('b');
        const build = vi.fn().mockResolvedValueOnce(modelA).mockResolvedValueOnce(modelB);
        const pool = createSessionPool({ build, ttlMs: 60_000 });

        const entry = await pool.getOrCreate('/repo/examples/part.kcad.ts');
        entry.selection = { shapeIndex: 0, kind: 'face', id: 3, featureId: 'feat' };
        entry.selectionFaceSignature = { owner: 'feat', surface: 'plane', area: 1, centroid: [0, 0, 0], normal: [0, 0, 1], bounds: [0, 0, 0, 1, 1, 0] };
        const seen: string[][] = [];
        entry.onRelower((ids) => seen.push(ids));

        const rebuilt = await pool.rebuildByScript('/repo/examples/part.kcad.ts');

        expect(rebuilt).toBe(true);
        expect(build).toHaveBeenCalledTimes(2);
        expect(pool.get(entry.token)?.model).toBe(modelB);
        expect(entry.selection).toBeNull();
        expect(entry.selectionPendingSignature).toEqual({ owner: 'feat', surface: 'plane', area: 1, centroid: [0, 0, 0], normal: [0, 0, 1], bounds: [0, 0, 0, 1, 1, 0] });
        expect(entry.selectionModelGeneration).toBe(1);
        expect(seen).toEqual([[]]); // one synthetic relower, empty affected set
    });

    it('forwards engine relower events through the hub before AND after a rebuild', async () => {
        const modelA = fakeModel('a');
        const modelB = fakeModel('b');
        const build = vi.fn().mockResolvedValueOnce(modelA).mockResolvedValueOnce(modelB);
        const pool = createSessionPool({ build, ttlMs: 60_000 });

        const entry = await pool.getOrCreate('/repo/examples/part.kcad.ts');
        const seen: string[][] = [];
        entry.onRelower((ids) => seen.push(ids));

        modelA.emit(['feat_1']);
        await pool.rebuildByScript('/repo/examples/part.kcad.ts');
        modelB.emit(['feat_2']);
        // The old engine is detached — its events must no longer reach the hub.
        modelA.emit(['stale']);

        expect(seen).toEqual([['feat_1'], [], ['feat_2']]);
    });

    it('clears picks on an in-place relower without starting a remap', async () => {
        const model = fakeModel('a');
        const pool = createSessionPool({ build: vi.fn().mockResolvedValue(model), ttlMs: 60_000 });
        const entry = await pool.getOrCreate('/repo/examples/part.kcad.ts');
        entry.selection = { shapeIndex: 0, kind: 'face', id: 3, featureId: 'feat' };
        entry.selectionFaceSignature = { owner: 'feat', surface: 'plane', area: 1, centroid: [0, 0, 0], normal: [0, 0, 1], bounds: [0, 0, 0, 1, 1, 0] };

        model.emit(['feat']);

        expect(entry.selection).toBeNull();
        expect(entry.selectionFaceSignature).toBeNull();
        expect(entry.selectionPendingSignature).toBeNull();
        expect(entry.selectionModelGeneration).toBe(1);
    });

    it('preserves a pending face remap signature through an in-place relower', async () => {
        const modelA = fakeModel('a');
        const modelB = fakeModel('b');
        const build = vi.fn().mockResolvedValueOnce(modelA).mockResolvedValueOnce(modelB);
        const pool = createSessionPool({ build, ttlMs: 60_000 });
        const entry = await pool.getOrCreate('/repo/examples/part.kcad.ts');
        const signature = { owner: 'feat', surface: 'plane', area: 1, centroid: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], bounds: [0, 0, 0, 1, 1, 0] as [number, number, number, number, number, number] };
        entry.selection = { shapeIndex: 0, kind: 'face', id: 3, featureId: 'feat' };
        entry.selectionFaceSignature = signature;

        await pool.rebuildByScript('/repo/examples/part.kcad.ts');
        expect(entry.selectionPendingSignature).toEqual(signature);
        modelB.emit(['feat']);

        expect(entry.selection).toBeNull();
        expect(entry.selectionFaceSignature).toBeNull();
        expect(entry.selectionPendingSignature).toEqual(signature);
        expect(entry.selectionModelGeneration).toBe(2);
    });

    it('returns false when no session matches the file', async () => {
        const pool = createSessionPool({ build: vi.fn().mockResolvedValue(fakeModel('a')), ttlMs: 60_000 });
        await pool.getOrCreate('/repo/examples/part.kcad.ts');
        expect(await pool.rebuildByScript('/repo/examples/other.kcad.ts')).toBe(false);
    });

    it('matches scriptPath by resolved path, not string identity', async () => {
        const build = vi.fn().mockResolvedValue(fakeModel('a'));
        const pool = createSessionPool({ build, ttlMs: 60_000 });
        await pool.getOrCreate('/repo/examples/part.kcad.ts');
        expect(await pool.rebuildByScript('/repo/examples/../examples/part.kcad.ts')).toBe(true);
    });

    it('keeps the previous model and rethrows when the rebuild build fails', async () => {
        const modelA = fakeModel('a');
        const build = vi
            .fn()
            .mockResolvedValueOnce(modelA)
            .mockRejectedValueOnce(new Error('syntax error mid-edit'));
        const pool = createSessionPool({ build, ttlMs: 60_000 });

        const entry = await pool.getOrCreate('/repo/examples/part.kcad.ts');
        await expect(pool.rebuildByScript('/repo/examples/part.kcad.ts')).rejects.toThrow('syntax error mid-edit');
        expect(pool.get(entry.token)?.model).toBe(modelA);

        // Session stays usable: a later successful rebuild still works.
        const modelB = fakeModel('b');
        build.mockResolvedValueOnce(modelB);
        await expect(pool.rebuildByScript('/repo/examples/part.kcad.ts')).resolves.toBe(true);
        expect(pool.get(entry.token)?.model).toBe(modelB);
    });

    it('unsubscribe returned by entry.onRelower stops further events', async () => {
        const modelA = fakeModel('a');
        const build = vi.fn().mockResolvedValueOnce(modelA).mockResolvedValue(fakeModel('b'));
        const pool = createSessionPool({ build, ttlMs: 60_000 });
        const entry = await pool.getOrCreate('/repo/examples/part.kcad.ts');

        const seen: string[][] = [];
        const off = entry.onRelower((ids) => seen.push(ids));
        off();
        await pool.rebuildByScript('/repo/examples/part.kcad.ts');
        expect(seen).toEqual([]);
    });
});
