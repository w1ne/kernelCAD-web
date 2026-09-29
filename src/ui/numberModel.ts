// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Decimal places of a step (0.25 → 2), so values do not drift (0.1 + 0.2). */
export function stepDecimals(step: number): number {
    if (!Number.isFinite(step)) return 0;
    const s = String(step);
    const e = /e-(\d+)$/.exec(s);
    if (e) return Number(e[1]);
    const dot = s.indexOf('.');
    return dot < 0 ? 0 : s.length - dot - 1;
}

/** Clamp to [min, max] (either may be absent) and round to the step's decimals. */
export function normalize(value: number, opts: { min?: number; max?: number; step?: number }): number {
    let v = value;
    if (typeof opts.min === 'number') v = Math.max(opts.min, v);
    if (typeof opts.max === 'number') v = Math.min(opts.max, v);
    const d = stepDecimals(opts.step ?? 1);
    return Number(v.toFixed(Math.min(d + 2, 10)));
}

/**
 * Parse what the user typed: a number with an optional unit ("12.5 mm",
 * "12,5"). Returns null when it is not a number.
 */
export function parseNumber(raw: string): number | null {
    const m = /^\s*([-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?)\s*[a-zA-Z°%µ"']*\s*$/.exec(raw);
    if (!m) return null;
    const n = Number(m[1].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/** Arrow-key step: Shift ×10, Alt ×0.1. */
export function keyStep(step: number, e: { shiftKey: boolean; altKey: boolean }): number {
    if (e.shiftKey) return step * 10;
    if (e.altKey) return step / 10;
    return step;
}

/** Format for display, trimming float noise. */
export function formatNumber(value: number, step = 1): string {
    if (!Number.isFinite(value)) return '';
    const d = stepDecimals(step);
    return String(Number(value.toFixed(Math.min(d + 2, 10))));
}
