import type { JSX } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { NumericScrubInput } from '../components/inputs/NumericScrubInput';
import type { JointPoseSnapshot } from '../adapters/featureRecordsToMates';

/**
 * Inspector tab listing assembly mates with declared pose (joints). Each
 * row drives the same `params.update` codepath the ParamsTab numeric rows
 * use — the slider's name maps back to a ParamTable entry via the
 * `poseParamNames` field carried on the snapshot.
 *
 * Slice 2C ships the read+scrub loop. Rows that don't bind to a
 * ParamTable entry (e.g. a numeric-literal pose) render as read-only —
 * the slider still moves but onChange is a no-op against the kernel.
 */

const ROTATIONAL_TYPES = new Set(['revolute', 'cylindrical', 'pin_slot', 'ball']);

export function JointsTab(): JSX.Element {
    const { joints, updateParam } = useRecomputeResult();
    const posed = joints ?? [];

    if (posed.length === 0) {
        return (
            <div
                className="px-4 py-3 text-sm text-gray-500"
                data-testid="joints-empty-state"
            >
                No joints with pose declared
            </div>
        );
    }

    const handleReset = (): void => {
        if (!updateParam) return;
        const edits: { name: string; value: number }[] = [];
        for (const j of posed) {
            for (const pname of j.poseParamNames) {
                if (pname !== null) edits.push({ name: pname, value: 0 });
            }
        }
        if (edits.length === 0) return;
        updateParam(edits)?.catch((err) => console.warn('[JointsTab] reset failed', err));
    };

    const partCount = new Set(posed.flatMap((j) => [j.mate.a.split('.')[0], j.mate.b.split('.')[0]])).size;
    const ballCount = posed.filter((j) => j.mate.type === 'ball').length;

    return (
        <div className="flex flex-col" data-testid="joints-tab">
            <ul className="flex flex-col divide-y divide-[#1f1f1f]">
                {posed.map((snap) => (
                    <JointRow
                        key={snap.mate.name}
                        snap={snap}
                        onChange={(name, value) => {
                            updateParam?.([{ name, value }])?.catch((err) =>
                                console.warn('[JointsTab] updateParam failed', err),
                            );
                        }}
                    />
                ))}
            </ul>
            <div className="flex justify-between items-center px-3 py-2 text-[11px] text-gray-500 border-t border-[#1f1f1f]">
                <span>
                    {partCount} parts · {posed.length} mates
                    {ballCount > 0
                        ? ` · ${ballCount} ball joint${ballCount === 1 ? '' : 's'}`
                        : ''}
                </span>
                {updateParam ? (
                    <button
                        type="button"
                        className="text-[#4a9eff] hover:underline"
                        onClick={handleReset}
                    >
                        ↻ reset all to rest
                    </button>
                ) : null}
            </div>
        </div>
    );
}

interface JointRowProps {
    readonly snap: JointPoseSnapshot;
    readonly onChange: (paramName: string, value: number) => void;
}

function JointRow({ snap, onChange }: JointRowProps): JSX.Element {
    const { mate, pose, poseParamNames } = snap;
    const isRotational = ROTATIONAL_TYPES.has(mate.type);
    const unit = isRotational ? '°' : 'mm';
    const limits = mate.limitsDeg ?? mate.limitsMm;
    const marks = limits
        ? [
              { at: limits[0], label: 'lo' },
              { at: limits[1], label: 'hi' },
          ]
        : undefined;

    if (mate.type === 'ball' && Array.isArray(pose)) {
        const [x, y, z] = pose;
        const [xName, yName, zName] = poseParamNames;
        return (
            <li
                className="text-xs text-gray-300 px-3 py-2 border-l-2 border-[#333] ml-3"
                data-testid={`joint-row-${mate.name}`}
            >
                <div className="pb-1">
                    <span className="text-gray-300">{mate.name}</span>
                    <span className="text-[10px] text-gray-500 ml-1.5 italic">
                        ball (XYZ Euler)
                    </span>
                </div>
                <BallAxis
                    label="X"
                    name={xName}
                    value={x}
                    unit="°"
                    limits={limits}
                    onChange={onChange}
                />
                <BallAxis
                    label="Y"
                    name={yName}
                    value={y}
                    unit="°"
                    limits={limits}
                    onChange={onChange}
                />
                <BallAxis
                    label="Z"
                    name={zName}
                    value={z}
                    unit="°"
                    limits={limits}
                    onChange={onChange}
                />
            </li>
        );
    }

    const value = typeof pose === 'number' ? pose : 0;
    const paramName = poseParamNames[0];
    return (
        <li
            className="text-xs text-gray-300"
            data-testid={`joint-row-${mate.name}`}
        >
            <div className="px-3 pt-2 pb-0.5 flex justify-between">
                <span className="text-gray-300">{mate.name}</span>
                <span className="text-[10px] text-gray-500 italic">{mate.type}</span>
            </div>
            <NumericScrubInput
                name={mate.name}
                value={value}
                unit={unit}
                min={limits?.[0]}
                max={limits?.[1]}
                limitMarks={marks}
                onChange={(v) => {
                    if (paramName !== null) onChange(paramName, v);
                }}
            />
        </li>
    );
}

function BallAxis({
    label,
    name,
    value,
    unit,
    limits,
    onChange,
}: {
    label: string;
    name: string | null;
    value: number;
    unit: string;
    limits: readonly [number, number] | undefined;
    onChange: (paramName: string, value: number) => void;
}): JSX.Element {
    const inputName = name ?? label;
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-3">{label}</span>
            <div className="flex-1">
                <NumericScrubInput
                    name={inputName}
                    value={value}
                    unit={unit}
                    min={limits?.[0]}
                    max={limits?.[1]}
                    onChange={(v) => {
                        if (name !== null) onChange(name, v);
                    }}
                />
            </div>
        </div>
    );
}
