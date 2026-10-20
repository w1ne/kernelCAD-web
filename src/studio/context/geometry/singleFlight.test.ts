// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createSingleFlight } from './singleFlight';

describe('createSingleFlight', () => {
    it('runs one value at a time and then the newest value that arrived during it', async () => {
        let active = 0;
        let maxActive = 0;
        const seen: number[] = [];
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const flight = createSingleFlight(async (n: number) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await gate;
            seen.push(n);
            active -= 1;
        });

        const first = flight.push(1);
        await Promise.resolve();
        const second = flight.push(2);
        flight.push(3);
        expect(flight.followUpPending()).toBe(true);
        expect(maxActive).toBe(1);
        expect(seen).toEqual([]);

        release();
        await first;
        await second;
        expect(seen).toEqual([1, 3]);
        expect(maxActive).toBe(1);
        expect(flight.followUpPending()).toBe(false);
    });

    it('starts the first value immediately, then runs only the latest same-turn follow-up', async () => {
        const seen: number[] = [];
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const flight = createSingleFlight(async (n: number) => {
            seen.push(n);
            await gate;
        });
        const all = Promise.all([flight.push(1), flight.push(2), flight.push(3)]);
        expect(seen).toEqual([1]);
        expect(flight.followUpPending()).toBe(true);
        release();
        await all;
        expect(seen).toEqual([1, 3]);
    });
});
