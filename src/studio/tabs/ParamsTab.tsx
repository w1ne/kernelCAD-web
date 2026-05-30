import type { JSX } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useParamUpdate, type ParamUpdater } from '../hooks/useParamUpdate';
import type { ParamEntry } from '../../shared/runtime/paramTable';
import { NumericScrubInput, type ScrubInterference } from '../components/inputs/NumericScrubInput';
import type { JointPoseSnapshot } from '../adapters/featureRecordsToMates';
import type { StudioRecomputeResult } from '../types';

/**
 * Inspector tab listing script-declared params from `param()`.
 *
 * Slice 2A/2B: both numeric and boolean rows are interactive. Edits
 * commit through `updateParam` from `useRecomputeResult`, which POSTs to
 * `/__kernelcad/params`; the SSE `relower` event re-fetches mesh +
 * review so the param table refreshes with the new value.
 *
 * v0.7 — interference-on-slider indicator. We read live interference
 * pairs from `recompute.rawInterferencePairs` (the pre-filter HUD channel,
 * not the validator's filtered diagnostic stream — so a slider pulling
 * the model into a clash flags even when the script `ignore`s known-
 * acceptable contacts) and cross-reference each pair's parts with the
 * joint adapter's `poseParamNames` to figure out which params drive a
 * colliding pose. Implicated rows render the slider track red and show a
 * "!" badge with a tooltip listing the colliding pairs. If interferences
 * exist but no param can be implicated (e.g. all parts are joint-less /
 * numeric-literal poses) we fall back to a top-of-panel warning so the
 * user still gets a Params-tab signal, not just the small footer counter.
 */
export function ParamsTab(): JSX.Element {
    const { paramTable, updateParam, rawInterferencePairs, joints } = useRecomputeResult();
    // Single shared updater for every row in this tab. Numeric scrubs get
    // a debounced send so slider drag doesn't fire one POST + one full
    // relower per pointer-move; boolean toggles are single high-intent
    // clicks, so they fire immediately via `commit`.
    const updater = useParamUpdate(updateParam, { source: 'ParamsTab', debounceMs: 700 });

    const entries: ParamEntry[] = paramTable && paramTable.size() > 0
        ? paramTable.list()
        : [];

    const { byParam, allPairs } = buildInterferenceIndex(rawInterferencePairs, joints);
    const unattributedPairs = allPairs.length > 0 && byParam.size === 0 ? allPairs : [];

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
            {unattributedPairs.length > 0 && (
                <div
                    className="flex items-start gap-2 px-3 py-2 text-[11px] text-red-200 bg-red-950/40 border-b border-red-900"
                    data-testid="params-interference-banner"
                    title={unattributedPairs
                        .map((p) => `${p.a} ↔ ${p.b} — ${p.volumeMm3.toFixed(1)} mm³`)
                        .join('\n')}
                >
                    <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none flex-shrink-0"
                        aria-hidden="true"
                    >
                        !
                    </span>
                    <span className="leading-tight">
                        {unattributedPairs.length === 1
                            ? '1 interference in current pose'
                            : `${unattributedPairs.length} interferences in current pose`}
                    </span>
                </div>
            )}
            <ul className="flex flex-col divide-y divide-[#1f1f1f]">
                {entries.map((entry) => (
                    <ParamRow
                        key={entry.name}
                        entry={entry}
                        updater={updater}
                        interference={byParam.get(entry.name)}
                    />
                ))}
            </ul>
        </div>
    );
}

interface ParamRowProps {
    readonly entry: ParamEntry;
    readonly updater: ParamUpdater;
    readonly interference?: ScrubInterference;
}

function ParamRow({ entry, updater, interference }: ParamRowProps): JSX.Element {
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
                        updater.commit([{ name: entry.name, value: e.target.checked }]);
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
                interference={interference}
                onChange={(next) => {
                    updater.commitDebounced([{ name: entry.name, value: next }]);
                }}
                onCommit={updater.flush}
            />
        </li>
    );
}

type RawPair = StudioRecomputeResult['rawInterferencePairs'][number];

/**
 * Cross-reference current-pose interference pairs with the assembly's
 * joint→param map to figure out which Params-tab sliders are implicated in
 * a colliding pose.
 *
 * Returns:
 *  - `byParam` — param name → `ScrubInterference` (subset of pairs the
 *    param's joint touches). Empty when no joint binds to any pair part.
 *  - `allPairs` — every interference pair, used for the top-of-panel
 *    fallback banner when none could be attributed to a slider.
 */
function buildInterferenceIndex(
    rawPairs: StudioRecomputeResult['rawInterferencePairs'],
    joints: readonly JointPoseSnapshot[] | undefined,
): {
    byParam: Map<string, ScrubInterference>;
    allPairs: readonly RawPair[];
} {
    const pairs: RawPair[] = (rawPairs ?? []).slice();
    const byParam = new Map<string, RawPair[]>();
    if (pairs.length === 0 || !joints || joints.length === 0) {
        return { byParam: new Map(), allPairs: pairs };
    }
    // For each joint, look at the parts it connects (split connector refs on
    // the first dot). A param is implicated in an interference pair when at
    // least one of the colliding parts appears in that joint's pair. This is
    // intentionally a loose heuristic — a kinematic chain like
    // base↔arm + arm↔head means moving the shoulder param shifts head
    // relative to other parts too, even though the shoulder joint's pair is
    // base↔arm. Strict "both-parts-in-joint" matching missed the obvious
    // culprit in the Luxo lamp case (shoulder joint = base↔arm, collision =
    // head↔arm). Some false positives are acceptable — the badge says "this
    // slider can move into / out of the collision," which is still true.
    for (const joint of joints) {
        const partA = joint.mate.a.split('.')[0];
        const partB = joint.mate.b.split('.')[0];
        const jointParts = new Set([partA, partB]);
        const paramNames = joint.poseParamNames.filter(
            (n): n is string => typeof n === 'string',
        );
        if (paramNames.length === 0) continue;
        for (const pair of pairs) {
            if (!jointParts.has(pair.a) && !jointParts.has(pair.b)) continue;
            for (const paramName of paramNames) {
                let list = byParam.get(paramName);
                if (!list) {
                    list = [];
                    byParam.set(paramName, list);
                }
                if (!list.some((p) => p.a === pair.a && p.b === pair.b)) {
                    list.push(pair);
                }
            }
        }
    }
    const out = new Map<string, ScrubInterference>();
    for (const [name, list] of byParam) {
        out.set(name, { collidingPairs: list });
    }
    return { byParam: out, allPairs: pairs };
}
