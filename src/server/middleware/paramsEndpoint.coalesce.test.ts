import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { createParamsEndpoint, type ParamsReqLike } from './paramsEndpoint';
import type { SessionPool } from '../sessionPool';

function fakeReq(token: string, edits: unknown): ParamsReqLike {
    const req = Readable.from([JSON.stringify({ edits })]) as unknown as ParamsReqLike & { method: string };
    req.url = `/__kernelcad/params?session=${token}`;
    req.method = 'POST';
    return req;
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

/** A params.update fake that resolves only when the test releases it. */
function gatedUpdate() {
    const calls: Array<{ edits: Array<{ name: string; value: number | boolean }>; release: () => void }> = [];
    const update = vi.fn(
        (edits: Array<{ name: string; value: number | boolean }>) =>
            new Promise((resolve) => {
                calls.push({ edits, release: () => resolve({ relowered: ['r'], skipped: [], warnings: [] }) });
            }),
    );
    return { update, calls };
}

function fakePool(update: (edits: Array<{ name: string; value: number | boolean }>) => Promise<unknown>): SessionPool {
    const entry = { token: 't1', scriptPath: '/s', model: { session: { params: { update } } }, lastAccessAt: 0, onRelower: () => () => {} };
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

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('paramsEndpoint coalescing', () => {
    it('merges a burst of updates into at most two kernel runs, latest value wins', async () => {
        const { update, calls } = gatedUpdate();
        const handler = createParamsEndpoint({ pool: fakePool(update) });

        const responses = Array.from({ length: 5 }, () => fakeRes());
        const inFlight = responses.map((r, i) =>
            handler(fakeReq('t1', [{ name: 'angle', value: (i + 1) * 10 }]), r.res as never),
        );
        await tick();

        // First request started a run; the other four merged into one pending batch.
        expect(calls.length).toBe(1);
        expect(calls[0].edits).toEqual([{ name: 'angle', value: 10 }]);

        calls[0].release();
        await tick();
        // Trailing batch runs once with the LATEST value only.
        expect(calls.length).toBe(2);
        expect(calls[1].edits).toEqual([{ name: 'angle', value: 50 }]);

        calls[1].release();
        await Promise.all(inFlight);
        for (const r of responses) {
            expect(r.out.statusCode).toBe(200);
            expect(r.out.body).toMatchObject({ relowered: ['r'] });
        }
        expect(update).toHaveBeenCalledTimes(2);
    });

    it('merges edits to DIFFERENT params instead of dropping them', async () => {
        const { update, calls } = gatedUpdate();
        const handler = createParamsEndpoint({ pool: fakePool(update) });

        const a = fakeRes(); const b = fakeRes(); const c = fakeRes();
        const p1 = handler(fakeReq('t1', [{ name: 'angle', value: 10 }]), a.res as never);
        await tick();
        const p2 = handler(fakeReq('t1', [{ name: 'width', value: 5 }]), b.res as never);
        const p3 = handler(fakeReq('t1', [{ name: 'angle', value: 20 }]), c.res as never);
        await tick();

        calls[0].release();
        await tick();
        expect(calls.length).toBe(2);
        // Both param names survive the merge; angle carries the latest value.
        expect(new Map(calls[1].edits.map((e) => [e.name, e.value]))).toEqual(
            new Map([['width', 5], ['angle', 20]]),
        );
        calls[1].release();
        await Promise.all([p1, p2, p3]);
    });

    it('rejects only the failed batch and keeps the session usable', async () => {
        const update = vi
            .fn()
            .mockRejectedValueOnce(Object.assign(new Error('out of range'), { code: 'param.out-of-range' }))
            .mockResolvedValue({ relowered: [], skipped: [], warnings: [] });
        const handler = createParamsEndpoint({ pool: fakePool(update) });

        const bad = fakeRes();
        await handler(fakeReq('t1', [{ name: 'angle', value: 999 }]), bad.res as never);
        expect(bad.out.statusCode).toBe(422);

        const ok = fakeRes();
        await handler(fakeReq('t1', [{ name: 'angle', value: 10 }]), ok.res as never);
        expect(ok.out.statusCode).toBe(200);
    });
});
