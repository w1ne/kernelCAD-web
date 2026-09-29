// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
    hosted: true,
    meshSourceHosted: vi.fn(),
    reviewSourceDev: vi.fn(),
}));

vi.mock('../scriptSource', () => ({
    shouldUseHostedMesh: () => hoisted.hosted,
    meshSourceHosted: hoisted.meshSourceHosted,
    reviewSourceDev: hoisted.reviewSourceDev,
}));

import { reviewCandidate } from './candidateReview';

beforeEach(() => {
    hoisted.hosted = true;
    hoisted.meshSourceHosted.mockReset();
    hoisted.reviewSourceDev.mockReset();
});

describe('reviewCandidate on the hosted app (no review endpoint)', () => {
    it('runs the candidate through the server mesh endpoint; a clean run is ok', async () => {
        hoisted.meshSourceHosted.mockResolvedValue({ features: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } });
        const result = await reviewCandidate({ source: 'return box(1);', script: '', baseline: null });
        expect(hoisted.meshSourceHosted).toHaveBeenCalledWith('return box(1);');
        expect(hoisted.reviewSourceDev).not.toHaveBeenCalled();
        expect(result).toMatchObject({ ok: true, reviewed: false, delta: null });
    });

    it('a failed run is a failed candidate', async () => {
        hoisted.meshSourceHosted.mockRejectedValue(new Error('one or more features failed to compile'));
        const result = await reviewCandidate({ source: 'broken', script: '', baseline: null });
        expect(result).toMatchObject({ ok: false, error: 'one or more features failed to compile' });
    });

    it('localhost keeps the dev review endpoint', async () => {
        hoisted.hosted = false;
        hoisted.reviewSourceDev.mockResolvedValue({ ok: true, diagnostics: [] });
        await reviewCandidate({ source: 'return box(1);', script: 'examples/a.kcad.ts', baseline: null });
        expect(hoisted.reviewSourceDev).toHaveBeenCalledWith('return box(1);', 'examples/a.kcad.ts');
        expect(hoisted.meshSourceHosted).not.toHaveBeenCalled();
    });
});
