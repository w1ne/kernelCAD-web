import { useWorkbench } from '../../context/WorkbenchContext';
import type { ConstraintType } from '../../lib/constraints/types';
import { Anchor, ArrowLeftRight, MoveHorizontal, MoveVertical, Circle, Ruler, Equal, CircleDot, FlipHorizontal2 } from 'lucide-react';

export function ConstraintsToolbar() {
    const {
        sketchMode,
        selectedEntityIds,
        addConstraint,
        solve
    } = useWorkbench();

    if (!sketchMode.active) return null;

    const handleAddConstraint = (type: ConstraintType) => {
        let val: number | undefined = undefined;

        if (type === 'RADIUS') {
            if (selectedEntityIds.length !== 1) {
                alert("Select exactly 1 circle for Radius");
                return;
            }
            const input = prompt("Enter Radius:");
            if (!input) return;
            val = parseFloat(input);
            if (isNaN(val)) return;
        } else if (type === 'ANGLE') {
            if (selectedEntityIds.length !== 2) {
                alert("Select exactly 2 lines for Angle");
                return;
            }
            const input = prompt("Enter Angle (degrees):");
            if (!input) return;
            val = parseFloat(input);
            if (isNaN(val)) return;
        } else if (type === 'EQUAL_LENGTH') {
            if (selectedEntityIds.length !== 2) {
                alert("Select exactly 2 lines");
                return;
            }
        } else if (type === 'CONCENTRIC') {
            if (selectedEntityIds.length !== 2) {
                alert("Select exactly 2 circles");
                return;
            }
        } else if (type === 'SYMMETRIC') {
            if (selectedEntityIds.length !== 3) {
                alert("Select 2 points and 1 mirror line");
                return;
            }
        } else if (type === 'DISTANCE') {
            if (selectedEntityIds.length < 2) {
                alert("Select at least 2 entities");
                return;
            }
            val = 50; // Default or prompt? Let's leave default for now as per prev code, or prompt?
            // Prev code had default 50. Let's keep it but maybe prompt in future.
        } else {
            if (selectedEntityIds.length < 2) { // Coincident, etc
                alert("Select at least 2 entities");
                return;
            }
        }

        addConstraint({
            id: crypto.randomUUID(),
            type,
            entities: [...selectedEntityIds],
            value: val ?? (type === 'DISTANCE' ? 50 : undefined)
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

            <div className="h-px bg-[#444] my-1" />

            <button
                onClick={() => handleAddConstraint('RADIUS')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Radius"
            >
                <Circle size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('ANGLE')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Angle"
            >
                <Ruler size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('EQUAL_LENGTH')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Equal"
            >
                <Equal size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('CONCENTRIC')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Concentric"
            >
                <CircleDot size={16} />
            </button>

            <button
                onClick={() => handleAddConstraint('SYMMETRIC')}
                className="p-1.5 hover:bg-[#333] rounded text-gray-300 hover:text-white flex items-center gap-2"
                title="Symmetric"
            >
                <FlipHorizontal2 size={16} />
            </button>

            {/* Debug Info */}
            <div className="mt-2 text-[10px] text-gray-600 border-t border-[#333] pt-1">
                Sel: {selectedEntityIds.length}
            </div>
        </div>
    );
}
