// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useId, type JSX } from 'react';
import { RotateCcw } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { NumberInput } from './NumberInput';
import { formatNumber } from './numberModel';
import { Slider } from './Slider';

export interface SliderFieldProps {
    /** Visible label; names both the slider and the number field. */
    readonly label: string;
    readonly value: number;
    readonly onChange: (next: number) => void;
    readonly onCommit?: () => void;
    readonly min: number;
    readonly max: number;
    readonly step?: number;
    readonly unit?: string;
    /** Draws a tick at the default and shows a reset button when changed. */
    readonly defaultValue?: number;
    readonly disabled?: boolean;
    readonly className?: string;
}

/** Label, slider, number field with unit, and reset-to-default: one row per parameter. */
export function SliderField({
    label,
    value,
    onChange,
    onCommit,
    min,
    max,
    step = 1,
    unit,
    defaultValue,
    disabled,
    className,
}: SliderFieldProps): JSX.Element {
    const labelId = useId();
    const changed = typeof defaultValue === 'number' && value !== defaultValue;
    return (
        <div className={cx('grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_5.5rem_1.75rem] items-center gap-2', className)}>
            <span id={labelId} className="truncate text-ui text-fg-2" title={label}>
                {label}
            </span>
            <Slider
                value={value}
                onChange={onChange}
                onCommit={onCommit}
                min={min}
                max={max}
                step={step}
                unit={unit}
                defaultValue={defaultValue}
                disabled={disabled}
                aria-labelledby={labelId}
            />
            <NumberInput
                value={value}
                onChange={(v) => {
                    onChange(v);
                    onCommit?.();
                }}
                min={min}
                max={max}
                step={step}
                unit={unit}
                disabled={disabled}
                aria-labelledby={labelId}
            />
            {changed ? (
                <IconButton
                    size="sm"
                    label={`Reset ${label} to ${formatNumber(defaultValue, step)}${unit ? ` ${unit}` : ''}`}
                    icon={<RotateCcw className="size-3.5" strokeWidth={1.75} />}
                    disabled={disabled}
                    onClick={() => {
                        onChange(defaultValue);
                        onCommit?.();
                    }}
                />
            ) : (
                <span aria-hidden="true" />
            )}
        </div>
    );
}
