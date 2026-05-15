import { useRecomputeResult } from './hooks/useRecomputeResult';

const MAX_VISIBLE = 4;

function formatValue(value: number | boolean): string {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
}

export function ParamChips() {
    const { paramTable } = useRecomputeResult();
    if (!paramTable) return null;

    const entries = paramTable.list();
    if (entries.length === 0) return null;

    const visible = entries.slice(0, MAX_VISIBLE);
    const overflow = entries.length - visible.length;

    return (
        <div
            data-testid="param-chips"
            className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none"
        >
            {visible.map((entry) => (
                <span
                    key={entry.name}
                    data-testid={`param-chip-${entry.name}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#222]/90 border border-[#333] text-[11px] text-gray-200"
                >
                    <span className="text-gray-400">{entry.name}</span>
                    <span className="font-mono">{formatValue(entry.value)}</span>
                </span>
            ))}
            {overflow > 0 && (
                <span
                    data-testid="param-chip-overflow"
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#222]/90 border border-[#333] text-[11px] text-gray-400"
                >
                    +{overflow} more
                </span>
            )}
        </div>
    );
}
