import React, { useState, useEffect } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { useWorkbench } from '../../context/WorkbenchContext';
import { generateExtrudeFromFaceCode } from '../../features/core/extrudeFromFace.feature';

interface ExtrudeFromFacePanelProps {
    onConfirm: (distance: number, direction: 'normal' | 'reversed') => void;
    onCancel: () => void;
}

export function ExtrudeFromFacePanel({ onConfirm, onCancel }: ExtrudeFromFacePanelProps) {
    const [distance, setDistance] = useState(20);
    const [direction, setDirection] = useState<'normal' | 'reversed'>('normal');

    const { setPreviewCode, codeContext, selectedFace } = useWorkbench();

    // Live Preview Effect
    useEffect(() => {
        if (!selectedFace) {
            setPreviewCode(null);
            return;
        }

        const targetName = codeContext.getVariableAtIndex(selectedFace.shapeIndex);
        const finalDistance = direction === 'reversed' ? -distance : distance;

        const previewCode = generateExtrudeFromFaceCode(
            codeContext,
            targetName,
            selectedFace.faceId,
            finalDistance
        );
        setPreviewCode(previewCode);

        return () => setPreviewCode(null);
    }, [selectedFace, distance, direction, codeContext, setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(distance, direction);
    };

    return (
        <FloatingPanel title="Extrude Face" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Distance Input */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">Distance (mm)</label>
                    <input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(parseFloat(e.target.value))}
                        step="0.5"
                        className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                        autoFocus
                    />
                </div>

                {/* Direction Toggle */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">Direction</label>
                    <div className="flex rounded border border-white/10 bg-black/20 p-1">
                        <button
                            type="button"
                            onClick={() => setDirection('normal')}
                            className={`flex-1 rounded py-1 text-xs transition-colors ${direction === 'normal'
                                ? 'bg-zinc-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Normal
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirection('reversed')}
                            className={`flex-1 rounded py-1 text-xs transition-colors ${direction === 'reversed'
                                ? 'bg-zinc-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Reversed
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                    >
                        Extrude
                    </button>
                </div>
            </form>
        </FloatingPanel>
    );
}
