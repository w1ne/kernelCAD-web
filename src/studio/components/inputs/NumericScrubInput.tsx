import { useCallback, useState } from 'react';
import type { JSX } from 'react';

export interface NumericScrubInputProps {
    /** Human-readable name (used for accessibility labels). */
    readonly name: string;
    /** Current value. */
    readonly value: number;
    /** Called when the user commits a new value (input blur, slider release, or scrub tick). */
    readonly onChange: (next: number) => void;
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
}

export function NumericScrubInput(props: NumericScrubInputProps): JSX.Element {
    const { name, value, onChange, min, max, step: stepProp, unit, limitMarks } = props;
    const hasRange = typeof min === 'number' && typeof max === 'number' && max > min;
    const step = stepProp ?? (hasRange ? Math.max((max - min) / 100, 0.01) : 1);
    const [lastSyncedValue, setLastSyncedValue] = useState<number>(value);
    const [draft, setDraft] = useState<string>(String(value));

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
        setDraft(String(value));
    }

    const clamp = useCallback(
        (v: number): number => {
            let out = v;
            if (typeof min === 'number') out = Math.max(min, out);
            if (typeof max === 'number') out = Math.min(max, out);
            return out;
        },
        [min, max]
    );

    const commit = useCallback(
        (raw: string) => {
            const n = Number(raw);
            if (!Number.isFinite(n)) {
                setDraft(String(value));
                return;
            }
            const next = clamp(n);
            setDraft(String(next));
            if (next !== value) onChange(next);
        },
        [clamp, onChange, value]
    );

    const pct = hasRange ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

    return (
        <div className="flex flex-col gap-1 px-3 py-2" data-testid={`scrub-${name}`}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-300 truncate" title={name}>
                    {name}
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
                            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
                        }}
                        className="bg-[#1f1f1f] text-white border border-[#333] rounded px-1.5 py-0.5 w-16 font-mono text-xs text-right"
                        aria-label={`${name} value`}
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
                        value={value}
                        onChange={(e) => onChange(clamp(Number(e.target.value)))}
                        className="w-full appearance-none bg-transparent h-1.5"
                        data-testid={`scrub-slider-${name}`}
                        aria-label={`${name} slider`}
                    />
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="h-1.5 bg-[#1f1f1f] rounded relative top-[2px]">
                            <div
                                className="h-full bg-[#4a9eff] rounded"
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
