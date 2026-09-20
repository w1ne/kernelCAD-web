// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { useNumericScrub } from './useNumericScrub';
import { ScrubRange } from './ScrubRange';
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

function ScrubValueInput({
    name,
    draft,
    setDraft,
    commit,
    step,
    min,
    max,
    inputClass,
    isOutOfRange,
    outOfRangeTitle,
    unit,
}: {
    name: string;
    draft: string;
    setDraft: (value: string) => void;
    commit: (raw: string) => void;
    step: number;
    min: number | undefined;
    max: number | undefined;
    inputClass: string;
    isOutOfRange: boolean;
    outOfRangeTitle: string | undefined;
    unit: string | undefined;
}): JSX.Element {
    return (
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
    );
}

function ScrubInterferenceBadge({
    name,
    title,
}: {
    name: string;
    title: string | undefined;
}): JSX.Element {
    return (
        <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none cursor-help"
            title={title}
            aria-label={`${name} is implicated in an interference at the current pose`}
            data-testid={`scrub-interference-badge-${name}`}
        >
            !
        </span>
    );
}

export function NumericScrubInput(props: NumericScrubInputProps): JSX.Element {
    const { name, onCommit, min, max, unit, limitMarks, interference } = props;
    const isColliding = !!interference && interference.collidingPairs.length > 0;
    const interferenceTitle = isColliding
        ? `current pose collides:\n${interference.collidingPairs
              .map((p) => `  ${p.a} ↔ ${p.b} — ${p.volumeMm3.toFixed(1)} mm³`)
              .join('\n')}`
        : undefined;
    const {
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
    } = useNumericScrub(props);

    // Restricted to the range-rendered branches: when hasRange is true both are numbers.
    const rangeMin = typeof min === 'number' ? min : 0;
    const rangeMax = typeof max === 'number' ? max : 0;

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
                        <ScrubInterferenceBadge name={name} title={interferenceTitle} />
                    )}
                </span>
                <ScrubValueInput
                    name={name}
                    draft={draft}
                    setDraft={setDraft}
                    commit={commit}
                    step={step}
                    min={min}
                    max={max}
                    inputClass={inputClass}
                    isOutOfRange={isOutOfRange}
                    outOfRangeTitle={outOfRangeTitle}
                    unit={unit}
                />
            </div>
            {hasRange && (
                <ScrubRange
                    name={name}
                    min={rangeMin}
                    max={rangeMax}
                    step={step}
                    displayValue={displayValue}
                    pct={pct}
                    isColliding={isColliding}
                    interferenceTitle={interferenceTitle}
                    limitMarks={limitMarks}
                    unit={unit}
                    onCommit={onCommit}
                    onValueChange={(next) => applyLocalValue(clamp(next))}
                />
            )}
        </div>
    );
}
