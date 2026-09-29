// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, type JSX, type KeyboardEvent } from 'react';
import { cx } from './cx';
import { formatNumber, keyStep, normalize, parseNumber } from './numberModel';

export interface NumberInputProps {
    readonly value: number;
    /** Called with a clamped value on Enter, blur, or an arrow step. */
    readonly onChange: (next: number) => void;
    readonly min?: number;
    readonly max?: number;
    /** Arrow-key step; Shift ×10, Alt ×0.1. Default 1. */
    readonly step?: number;
    /** Unit shown inside the field ("mm", "°"). */
    readonly unit?: string;
    readonly id?: string;
    readonly 'aria-label'?: string;
    readonly 'aria-labelledby'?: string;
    readonly disabled?: boolean;
    readonly size?: 'sm' | 'md';
    readonly className?: string;
}

/**
 * A numeric field with a unit. Typing does not commit until Enter or blur;
 * Esc reverts; arrows step. Out-of-range input is clamped, text that is not a
 * number is rejected and the last value comes back.
 */
export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    unit,
    id,
    disabled,
    size = 'sm',
    className,
    ...aria
}: NumberInputProps): JSX.Element {
    const shown = formatNumber(value, step);
    const [draft, setDraft] = useState(shown);
    const [editing, setEditing] = useState(false);
    const [lastShown, setLastShown] = useState(shown);
    // Follow outside changes (a slider drag) unless the user is typing.
    if (shown !== lastShown && !editing) {
        setLastShown(shown);
        setDraft(shown);
    }

    const commit = (raw: string): void => {
        const n = parseNumber(raw);
        if (n === null) {
            setDraft(shown);
            return;
        }
        const next = normalize(n, { min, max, step });
        setDraft(formatNumber(next, step));
        if (next !== value) onChange(next);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
        } else if (e.key === 'Escape') {
            if (draft !== shown) {
                e.preventDefault();
                e.stopPropagation();
                setDraft(shown);
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const base = parseNumber(draft) ?? value;
            const delta = keyStep(step, e) * (e.key === 'ArrowUp' ? 1 : -1);
            const next = normalize(base + delta, { min, max, step: Math.min(step, keyStep(step, e)) });
            setDraft(formatNumber(next, step));
            if (next !== value) onChange(next);
        }
    };

    return (
        <div
            className={cx(
                'flex items-center gap-1 rounded-control border border-border-strong bg-surface-1 px-2 text-fg',
                'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
                size === 'sm' ? 'h-control-sm' : 'h-control-md',
                disabled && 'opacity-50',
                className,
            )}
        >
            <input
                id={id}
                type="text"
                inputMode="decimal"
                role="spinbutton"
                autoComplete="off"
                spellCheck={false}
                disabled={disabled}
                value={draft}
                aria-valuenow={value}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuetext={unit ? `${shown} ${unit}` : shown}
                aria-label={aria['aria-label']}
                aria-labelledby={aria['aria-labelledby']}
                onFocus={() => setEditing(true)}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                    setEditing(false);
                    commit(draft);
                }}
                onKeyDown={onKeyDown}
                className="w-full min-w-0 bg-transparent text-right font-mono text-code-lg text-fg outline-none disabled:cursor-not-allowed"
            />
            {unit && (
                <span aria-hidden="true" className="shrink-0 font-mono text-code text-fg-3">
                    {unit}
                </span>
            )}
        </div>
    );
}
