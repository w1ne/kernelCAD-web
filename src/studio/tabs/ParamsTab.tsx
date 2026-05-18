import type { JSX } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import type { ParamEntry } from '../../shared/runtime/paramTable';
import { NumericScrubInput } from '../components/inputs/NumericScrubInput';

/**
 * Inspector tab listing script-declared params from `param()`.
 *
 * Slice 2A/2B: both numeric and boolean rows are interactive. Edits
 * commit through `updateParam` from `useRecomputeResult`, which POSTs to
 * `/__kernelcad/params`; the SSE `relower` event re-fetches mesh +
 * review so the param table refreshes with the new value.
 */
export function ParamsTab(): JSX.Element {
    const { paramTable, joints, updateParam } = useRecomputeResult();

    // Slice 2C: hide params that are surfaced as joint poses in JointsTab so
    // the same scalar isn't edited from two places. `poseParamNames` may
    // contain `null` for numeric-literal poses; only string entries filter.
    const jointPoseNames = new Set<string>();
    for (const j of joints ?? []) {
        for (const n of j.poseParamNames ?? []) {
            if (typeof n === 'string') jointPoseNames.add(n);
        }
    }

    const entries: ParamEntry[] = paramTable && paramTable.size() > 0
        ? paramTable.list().filter((e) => !jointPoseNames.has(e.name))
        : [];

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
                    <ParamRow key={entry.name} entry={entry} updateParam={updateParam} />
                ))}
            </ul>
        </div>
    );
}

interface ParamRowProps {
    readonly entry: ParamEntry;
    readonly updateParam?: (
        edits: { name: string; value: number | boolean }[],
    ) => Promise<void>;
}

function ParamRow({ entry, updateParam }: ParamRowProps): JSX.Element {
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
                    onChange={(e) => {
                        updateParam?.([{ name: entry.name, value: e.target.checked }])
                            ?.catch((err) => console.warn('[ParamsTab] updateParam failed', err));
                    }}
                    aria-label={`${entry.name} value`}
                    data-testid={`param-checkbox-${entry.name}`}
                />
            </li>
        );
    }

    const value = entry.value as number;
    const min = entry.meta?.min;
    const max = entry.meta?.max;

    return (
        <li
            className="text-xs text-gray-300"
            data-testid={`param-row-${entry.name}`}
        >
            <NumericScrubInput
                name={entry.name}
                value={value}
                min={min}
                max={max}
                onChange={(next) => {
                    updateParam?.([{ name: entry.name, value: next }])
                        ?.catch((err) => console.warn('[ParamsTab] updateParam failed', err));
                }}
            />
        </li>
    );
}
