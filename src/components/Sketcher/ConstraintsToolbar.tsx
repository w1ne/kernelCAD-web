import { useWorkbench } from '../../context/WorkbenchContext';
import type { ConstraintType } from '../../lib/constraints/types';
import { Anchor, ArrowLeftRight, MoveHorizontal, MoveVertical } from 'lucide-react';

export function ConstraintsToolbar() {
    const {
        sketchMode,
        selectedEntityIds,
        addConstraint,
        solve
    } = useWorkbench();

    if (!sketchMode.active) return null;

    const handleAddConstraint = (type: ConstraintType) => {
        if (selectedEntityIds.length < 2) {
            alert("Select at least 2 entities");
            return;
        }
        addConstraint({
            id: crypto.randomUUID(),
            type,
            entities: [...selectedEntityIds],
            value: type === 'DISTANCE' ? 50 : undefined // Default distance
        });
        solve();
    };

    return (
        <div className="absolute top-16 left-4 bg-[#222] border border-[#444] rounded p-2 flex flex-col gap-2 shadow-lg z-10">
            <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Constraints</div>

            <button
                onClick={() => handleAddConstraint('COINCIDENT')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Coincident"
            >
                <Anchor size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('DISTANCE')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Distance"
            >
                <ArrowLeftRight size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('HORIZONTAL')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Horizontal"
            >
                <MoveHorizontal size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('VERTICAL')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Vertical"
            >
                <MoveVertical size={16} />
            </button>

            {/* Debug Info */}
            <div className="mt-2 text-[10px] text-gray-600 border-t border-[#333] pt-1">
                Sel: {selectedEntityIds.length}
            </div>
        </div>
    );
}
