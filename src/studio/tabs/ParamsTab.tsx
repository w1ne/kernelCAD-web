import type { JSX } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import type { ParamEntry } from '../../shared/runtime/paramTable';

/**
 * Read-only inspector tab listing script-declared params from `param()`.
 *
 * Slice 1 displays current values so a reviewing human can see what the
 * agent has set. Interactive scrub is deferred to a later slice; today,
 * editing happens via the Code tab.
 */
export function ParamsTab(): JSX.Element {
    const { paramTable } = useRecomputeResult();

    const entries: ParamEntry[] = paramTable && paramTable.size() > 0 ? paramTable.list() : [];

    if (entries.length === 0) {
        return (
            <div
                className="px-4 py-3 text-sm text-gray-500"
                data-testid="params-empty-state"
            >
                No script-declared params
            </div>
        );
    }

    return (
        <div className="flex flex-col" data-testid="params-tab">
            <ul className="flex flex-col divide-y divide-[#1f1f1f]">
                {entries.map((entry) => (
                    <ParamRow key={entry.name} entry={entry} />
                ))}
            </ul>
            <div className="px-3 py-2 text-[11px] text-gray-500">
                Edit in code · open the Code tab to change values
            </div>
        </div>
    );
}

function ParamRow({ entry }: { entry: ParamEntry }): JSX.Element {
    if (entry.type === 'boolean') {
        return (
            <li
                className="flex items-center gap-3 h-6 px-3 text-xs text-gray-300"
                data-testid={`param-row-${entry.name}`}
            >
                <span className="flex-1 truncate" title={entry.name}>
                    {entry.name}
                </span>
                <input
                    type="checkbox"
                    checked={entry.value as boolean}
                    disabled
                    aria-label={`${entry.name} value`}
                    data-testid={`param-checkbox-${entry.name}`}
                />
            </li>
        );
    }

    const value = entry.value as number;
    const min = entry.meta?.min;
    const max = entry.meta?.max;
    const hasRange = typeof min === 'number' && typeof max === 'number' && max > min;
    const pct = hasRange ? Math.max(0, Math.min(1, (value - (min as number)) / ((max as number) - (min as number)))) : 0;

    return (
        <li
            className="flex items-center gap-3 h-6 px-3 text-xs text-gray-300"
            data-testid={`param-row-${entry.name}`}
        >
            <span className="flex-1 truncate" title={entry.name}>
                {entry.name}
            </span>
            {hasRange && (
                <div
                    className="relative h-1 w-20 rounded bg-[#222]"
                    data-testid={`param-range-${entry.name}`}
                    aria-label={`${entry.name} range`}
                >
                    <div
                        className="absolute inset-y-0 left-0 rounded bg-[#3b82f6]"
                        style={{ width: `${pct * 100}%` }}
                    />
                </div>
            )}
            <span className="tabular-nums text-gray-200">{formatNumber(value)}</span>
        </li>
    );
}

function formatNumber(v: number): string {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(3).replace(/\.?0+$/, '');
}
