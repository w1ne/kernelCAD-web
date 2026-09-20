// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';

interface ScrubRangeProps {
    readonly name: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly displayValue: number;
    readonly pct: number;
    readonly isColliding: boolean;
    readonly interferenceTitle: string | undefined;
    readonly limitMarks?: readonly { at: number; label?: string }[];
    readonly unit?: string;
    readonly onCommit?: () => void;
    readonly onValueChange: (next: number) => void;
}

export function ScrubRange(props: ScrubRangeProps): JSX.Element {
    const {
        name,
        min,
        max,
        step,
        displayValue,
        pct,
        isColliding,
        interferenceTitle,
        limitMarks,
        unit,
        onCommit,
        onValueChange,
    } = props;

    return (
        <div className="relative">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={displayValue}
                onChange={(e) => onValueChange(Number(e.target.value))}
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
                        const lpct = Math.max(0, Math.min(100, ((m.at - min) / (max - min)) * 100));
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
    );
}
