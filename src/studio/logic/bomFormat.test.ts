// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { formatMass, totalsFromRows } from './bomFormat';
import type { BomRow, BomTotals } from '../../agent/script-runtime/bom';

function row(overrides: Partial<BomRow>): BomRow {
    return {
        item: 1,
        name: 'part',
        quantity: 1,
        kind: 'fabricated',
        material: null,
        density: null,
        massGPerUnit: null,
        massGTotal: null,
        bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
        process: '3d-print',
        processSource: 'declared',
        instancePaths: ['part'],
        ...overrides,
    };
}

describe('totalsFromRows', () => {
    it('returns the server totals untouched when present', () => {
        const totals: BomTotals = { partCount: 9, uniquePartCount: 4, totalMassG: 123 };
        expect(totalsFromRows([row({})], totals)).toBe(totals);
    });

    it('sums the partial masses when totals are missing', () => {
        const rows = [
            row({ item: 1, quantity: 2, massGPerUnit: 100, massGTotal: 200 }),
            row({ item: 2, quantity: 4 }),
        ];
        expect(totalsFromRows(rows, null)).toEqual({
            partCount: 6,
            uniquePartCount: 2,
            totalMassG: 200,
        });
    });

    it('reports a null mass when no row has one', () => {
        const rows = [row({ item: 1, quantity: 2 }), row({ item: 2, quantity: 3 })];
        expect(totalsFromRows(rows, null)).toEqual({
            partCount: 5,
            uniquePartCount: 2,
            totalMassG: null,
        });
    });
});

describe('formatMass', () => {
    it('reads grams below 1 kg, kilograms at and above it', () => {
        expect(formatMass(200)).toBe('200 g');
        expect(formatMass(999.5)).toBe('999.5 g');
        expect(formatMass(1500)).toBe('1.5 kg');
        expect(formatMass(1234.567)).toBe('1.23 kg');
    });

    it('reads an unknown mass as an em dash', () => {
        expect(formatMass(null)).toBe('—');
    });
});
