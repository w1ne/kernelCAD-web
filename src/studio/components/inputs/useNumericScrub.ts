// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import type { NumericScrubInputProps } from './NumericScrubInput';

export function useNumericScrub(props: NumericScrubInputProps) {
    const { name, value, onChange, onCommit, min, max, step: stepProp } = props;
    const hasRange = typeof min === 'number' && typeof max === 'number' && max > min;
    const rawStep = stepProp ?? (hasRange ? Math.max((max - min) / 100, 0.01) : 1);
    // Guard: step must be > 0 for a sensible slider/scrub increment.
    const step = rawStep > 0 ? rawStep : 1;
    const [lastSyncedValue, setLastSyncedValue] = useState<number>(value);
    const [displayValue, setDisplayValue] = useState<number>(value);
    const [draft, setDraft] = useState<string>(Number.isFinite(value) ? String(value) : '');
    const [scrubStart, setScrubStart] = useState<{ x: number; baseValue: number } | null>(null);
    // Sync draft when external value changes (e.g. another component updated the param).
    // Guard with focus check so user's in-progress typing isn't clobbered. The focus
    // check uses `data-scrub-name` on the active element (no ref-during-render lint).
    // React-canonical "adjust state when a prop changes" pattern — runs during render,
    // no extra paint, idempotent because the !== check stops after one pass.
    // https://react.dev/reference/react/useState#storing-information-from-previous-renders
    const isFocused =
        typeof document !== 'undefined' &&
        document.activeElement?.getAttribute('data-scrub-name') === name;
    if (value !== lastSyncedValue && !isFocused) {
        setLastSyncedValue(value);
        setDisplayValue(value);
        setDraft(Number.isFinite(value) ? String(value) : '');
    }
    const clamp = (v: number): number => {
        let out = v;
        if (typeof min === 'number') out = Math.max(min, out);
        if (typeof max === 'number') out = Math.min(max, out);
        return out;
    };

    const applyLocalValue = (next: number): void => {
        setDisplayValue(next);
        setDraft(Number.isFinite(next) ? String(next) : '');
        if (next !== displayValue) onChange(next);
    };

    const commit = (raw: string): void => {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
            setDraft(Number.isFinite(displayValue) ? String(displayValue) : '');
            return;
        }
        const next = clamp(n);
        applyLocalValue(next);
        onCommit?.();
    };

    const pct = hasRange ? Math.max(0, Math.min(1, (displayValue - min) / (max - min))) : 0;
    const isOutOfRange =
        hasRange &&
        Number.isFinite(displayValue) &&
        (displayValue < (min as number) || displayValue > (max as number));

    const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>): void => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setScrubStart({ x: e.clientX, baseValue: value });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLSpanElement>): void => {
        if (!scrubStart) return;
        const dx = e.clientX - scrubStart.x;
        const multiplier = e.altKey ? 0.1 : e.shiftKey ? 10 : 1;
        const next = clamp(scrubStart.baseValue + dx * step * multiplier);
        applyLocalValue(next);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLSpanElement>): void => {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setScrubStart(null);
        onCommit?.();
    };

    return {
        step,
        hasRange,
        isOutOfRange,
        pct,
        draft,
        setDraft,
        displayValue,
        commit,
        clamp,
        applyLocalValue,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
}
