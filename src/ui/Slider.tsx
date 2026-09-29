// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { cx } from './cx';
import { formatNumber } from './numberModel';

export interface SliderProps {
    readonly value: number;
    readonly onChange: (next: number) => void;
    /** Called when a drag or key press ends, for debounced rebuilds. */
    readonly onCommit?: () => void;
    readonly min: number;
    readonly max: number;
    readonly step?: number;
    readonly unit?: string;
    /** Draws a tick at the default value. */
    readonly defaultValue?: number;
    readonly id?: string;
    readonly 'aria-label'?: string;
    readonly 'aria-labelledby'?: string;
    readonly disabled?: boolean;
    readonly className?: string;
}

const COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/** A native range input in the accent colour, with an optional default tick. */
export function Slider({
    value,
    onChange,
    onCommit,
    min,
    max,
    step = 1,
    unit,
    defaultValue,
    id,
    disabled,
    className,
    ...aria
}: SliderProps): JSX.Element {
    const span = max - min;
    const tickPct =
        typeof defaultValue === 'number' && span > 0
            ? Math.max(0, Math.min(100, ((defaultValue - min) / span) * 100))
            : null;
    const text = formatNumber(value, step);
    return (
        <div className={cx('relative flex h-control-sm items-center', className)}>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                aria-label={aria['aria-label']}
                aria-labelledby={aria['aria-labelledby']}
                aria-valuetext={unit ? `${text} ${unit}` : text}
                onChange={(e) => onChange(Number(e.target.value))}
                onPointerUp={() => onCommit?.()}
                onKeyUp={(e) => {
                    if (COMMIT_KEYS.has(e.key)) onCommit?.();
                }}
                className="focus-ring relative z-10 h-4 w-full cursor-pointer rounded-full accent-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
            {tickPct !== null && (
                <span
                    aria-hidden="true"
                    data-default-tick=""
                    className="pointer-events-none absolute top-1/2 z-0 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-3"
                    // The thumb travels 8 px short of each end; keep the tick under it.
                    style={{ left: `calc(8px + (100% - 16px) * ${tickPct / 100})` }}
                />
            )}
        </div>
    );
}
