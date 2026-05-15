import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useRecomputeResult } from './hooks/useRecomputeResult';

export function SelectionHighlight() {
    const { selectedFeatureId } = useFeatureSelection();
    const { features } = useRecomputeResult();

    if (!selectedFeatureId) return null;
    const match = features.find((f) => f.id === selectedFeatureId);
    if (!match) return null;

    return (
        <div
            data-testid="selection-highlight"
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#222]/90 border border-[#333] text-[11px] text-gray-200 pointer-events-none"
        >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Selected: {selectedFeatureId}</span>
        </div>
    );
}
