import { describe, expect, it } from 'vitest';
import { createTransformsEndpoint, type TransformsReqLike } from './transformsEndpoint';
import type { SessionPool } from '../sessionPool';

function fakeReq(query: string): TransformsReqLike {
    return { url: `/__kernelcad/transforms${query}` };
}

function fakeRes() {
    const out = { statusCode: 0, body: undefined as unknown };
    return {
        res: {
            statusCode: 0,
            setHeader() {},
            end(chunk?: string) {
                out.statusCode = this.statusCode;
                out.body = chunk ? JSON.parse(chunk) : undefined;
            },
        },
        out,
    };
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// Rotation about Y by 90° (column-major): [0] and [10] go 1 → 0.
const ROT_Y_90 = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];

/** Minimal SceneBackend-shaped tail: `_kind` satisfies `isSceneBackend`. */
function fakeScene(parts: Array<{ name: string; transform: readonly number[] }>) {
    return {
        _kind: 'scene',
        target: 'occt',
        assemblyName: 'asm',
        parts: parts.map((p) => ({
            name: p.name,
            shape: {},
            worldTransform: { toMat4: () => p.transform },
        })),
    };
}

function fakePool(model: unknown): SessionPool {
    const entry = { token: 't1', scriptPath: '/s', model, lastAccessAt: 0, onRelower: () => () => {} };
    return {
        get: (token: string) => (token === 't1' ? (entry as never) : undefined),
        getOrCreate: async () => entry as never,
        runExclusive: (fn) => fn(),
        eject() {},
        prune() {},
        entries: function* () {} as never,
        rebuildByScript: async () => false,
    };
}

describe('transformsEndpoint', () => {
    it('400 without a session token, 404 for an unknown one', async () => {
        const handler = createTransformsEndpoint({ pool: fakePool({}) });
        const missing = fakeRes();
        await handler(fakeReq(''), missing.res as never);
        expect(missing.out.statusCode).toBe(400);
        const unknown = fakeRes();
        await handler(fakeReq('?session=nope'), unknown.res as never);
        expect(unknown.out.statusCode).toBe(404);
    });

    it('returns per-part transforms from the LIVE cachedShapes tail, not the stale model.tailShape', async () => {
        // After params.update the session's cachedShapes carries the fresh
        // solved tail while model.tailShape still holds the build-time pose.
        const model = {
            tailId: 'solvedAssembly_1',
            tailShape: fakeScene([{ name: 'doser', transform: IDENTITY }]),
            session: {
                cachedShapes: new Map<string, unknown>([
                    ['solvedAssembly_1', fakeScene([
                        { name: 'base', transform: IDENTITY },
                        { name: 'doser', transform: ROT_Y_90 },
                    ])],
                ]),
            },
        };
        const handler = createTransformsEndpoint({ pool: fakePool(model) });
        const r = fakeRes();
        await handler(fakeReq('?session=t1'), r.res as never);
        expect(r.out.statusCode).toBe(200);
        expect(r.out.body).toEqual({
            parts: [
                { name: 'base', transform: IDENTITY },
                { name: 'doser', transform: ROT_Y_90 },
            ],
        });
    });

    it('falls back to model.tailShape when cachedShapes has no tail entry', async () => {
        const model = {
            tailId: 'solvedAssembly_1',
            tailShape: fakeScene([{ name: 'drum', transform: IDENTITY }]),
            session: { cachedShapes: new Map<string, unknown>() },
        };
        const handler = createTransformsEndpoint({ pool: fakePool(model) });
        const r = fakeRes();
        await handler(fakeReq('?session=t1'), r.res as never);
        expect(r.out.statusCode).toBe(200);
        expect(r.out.body).toEqual({ parts: [{ name: 'drum', transform: IDENTITY }] });
    });

    it('409 when the tail is not an assembly scene (client falls back to full mesh)', async () => {
        const model = {
            tailId: 'feat_1',
            tailShape: { _kind: 'solid' },
            session: { cachedShapes: new Map<string, unknown>() },
        };
        const handler = createTransformsEndpoint({ pool: fakePool(model) });
        const r = fakeRes();
        await handler(fakeReq('?session=t1'), r.res as never);
        expect(r.out.statusCode).toBe(409);
    });
});
