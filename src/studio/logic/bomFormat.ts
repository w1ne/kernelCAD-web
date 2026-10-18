// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// BOM footer formatting shared by the Parts tab and the Order sheet: the
// totals fallback for an endpoint that sends none, and grams → display units.
import type { BomRow, BomTotals } from '../../agent/script-runtime/bom';

/**
 * The BOM totals to render: the server's when present, else computed from the
 * rows. The fallback keeps the endpoint contract honest in the UI — a real,
 * possibly-partial sum (`totalMassG` null only when NO row has a known mass,
 * never a silent zero-fill).
 */
export function totalsFromRows(rows: readonly BomRow[], totals: BomTotals | null): BomTotals {
    if (totals !== null) return totals;
    const knownMass = rows.some((row) => row.massGTotal !== null);
    return {
        partCount: rows.reduce((sum, row) => sum + row.quantity, 0),
        uniquePartCount: rows.length,
        totalMassG: knownMass
            ? Math.round(rows.reduce((sum, row) => sum + (row.massGTotal ?? 0), 0) * 1e4) / 1e4
            : null,
    };
}

/** BOM masses are grams; a kilogram-scale total reads better in kg. */
export function formatMass(grams: number | null): string {
    if (grams === null) return '—';
    if (grams >= 1000) return `${round(grams / 1000)} kg`;
    return `${round(grams)} g`;
}

function round(value: number): string {
    return String(Math.round(value * 100) / 100);
}
