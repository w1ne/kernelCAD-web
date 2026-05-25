import { useState } from 'react';
import type { JSX } from 'react';

/**
 * When set, this param is implicated in one or more interference pairs at
 * the current pose. The slider track turns red and a "!" badge with a
 * tooltip listing the colliding pairs is shown. v0.7 — wired from
 * ParamsTab's `rawInterferencePairs` channel + joints adapter so the user
 * gets a slider-level signal that dragging put the model into a self-
 * colliding pose, instead of relying on the small footer counter.
 */
export interface ScrubInterference {
    readonly collidingPairs: readonly {
        readonly a: string;
        readonly b: string;
        readonly volumeMm3: number;
    }[];
}

export interface NumericScrubInputProps {
    /** Human-readable name (used for accessibility labels). */
    readonly name: string;
    /** Current value. */
    readonly value: number;
    /** Called when the user commits a new value (input blur, slider release, or scrub tick). */
    readonly onChange: (next: number) => void;
    /** Called when an interaction ends and debounced callers should flush. */
    readonly onCommit?: () => void;
    /** Optional min. */
    readonly min?: number;
    /** Optional max. */
    readonly max?: number;
    /** Step for slider + keyboard arrow. Defaults to (max-min)/100 or 1. */
    readonly step?: number;
    /** Cosmetic suffix shown after the input ("mm", "°"). */
    readonly unit?: string;
    /** Marks on the slider track at these positions (used for joint limits). */
    readonly limitMarks?: readonly { at: number; label?: string }[];
    /** When set, render the slider in "this param is implicated in an
     *  interference at the current pose" state — red track + badge. */
    readonly interference?: ScrubInterference;
}

export function NumericScrubInput(props: NumericScrubInputProps): JSX.Element {
    const { name, value, onChange, onCommit, min, max, step: stepProp, unit, limitMarks, interference } = props;
    const isColliding = !!interference && interference.collidingPairs.length > 0;
    const interferenceTitle = isColliding
        ? `current pose collides:\n${interference.collidingPairs
              .map((p) => `  ${p.a} ↔ ${p.b} — ${p.volumeMm3.toFixed(1)} mm³`)
              .join('\n')}`
        : undefined;
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

    const inputClassBase =
        'bg-[#1f1f1f] text-white border rounded px-1.5 py-0.5 w-16 font-mono text-xs text-right';
    const inputClass = isOutOfRange
        ? `${inputClassBase} border-red-500 ring-1 ring-red-500`
        : `${inputClassBase} border-[#333]`;
    const outOfRangeTitle = isOutOfRange
        ? `value (${displayValue}) is outside declared range [${min}, ${max}] — clamped from script override`
        : undefined;

    return (
        <div
            className="flex flex-col gap-1 px-3 py-2"
            data-testid={`scrub-${name}`}
            data-colliding={isColliding ? 'true' : undefined}
        >
            <div className="flex items-center justify-between gap-2">
                <span
                    className="text-xs text-gray-300 truncate cursor-ew-resize select-none border-b border-dashed border-gray-700 flex items-center gap-1"
                    title={`${name} (drag to scrub, ⌥ fine, ⇧ coarse)`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    data-testid={`scrub-handle-${name}`}
                >
                    {name}
                    {isColliding && (
                        <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none cursor-help"
                            title={interferenceTitle}
                            aria-label={`${name} is implicated in an interference at the current pose`}
                            data-testid={`scrub-interference-badge-${name}`}
                        >
                            !
                        </span>
                    )}
                </span>
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        value={draft}
                        step={step}
                        min={min}
                        max={max}
                        data-scrub-name={name}
                        data-testid={`scrub-input-${name}`}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={(e) => commit(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commit((e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        className={inputClass}
                        aria-label={`${name} value`}
                        aria-invalid={isOutOfRange || undefined}
                        title={outOfRangeTitle}
                    />
                    {unit && <span className="text-[10px] text-gray-500 w-4">{unit}</span>}
                </div>
            </div>
            {hasRange && (
                <div className="relative">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={displayValue}
                        onChange={(e) => applyLocalValue(clamp(Number(e.target.value)))}
                        onPointerUp={() => onCommit?.()}
                        onKeyUp={(e) => {
                            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                                onCommit?.();
                            }
                        }}
                        className="w-full appearance-none bg-transparent h-5"
                        data-testid={`scrub-slider-${name}`}
                        aria-label={`${name} slider`}
                        aria-valuetext={`${displayValue}${unit ?? ''}`}
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center">
                        <div
                            className={
                                isColliding
                                    ? 'h-1.5 w-full bg-red-950 rounded relative ring-1 ring-red-500'
                                    : 'h-1.5 w-full bg-[#1f1f1f] rounded relative'
                            }
                            title={interferenceTitle}
                            data-testid={`scrub-track-${name}`}
                        >
                            <div
                                className={
                                    isColliding ? 'h-full bg-red-500 rounded' : 'h-full bg-[#4a9eff] rounded'
                                }
                                style={{ width: `${pct * 100}%` }}
                            />
                            {limitMarks?.map((m, i) => {
                                const lpct = hasRange
                                    ? Math.max(0, Math.min(100, ((m.at - min) / (max - min)) * 100))
                                    : 0;
                                return (
                                    <div
                                        key={i}
                                        className="absolute top-[-2px] w-[1px] h-[10px] bg-gray-500"
                                        style={{ left: `${lpct}%` }}
                                        title={m.label ?? String(m.at)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>
                            {min}
                            {unit ?? ''}
                        </span>
                        <span>
                            {max}
                            {unit ?? ''}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
