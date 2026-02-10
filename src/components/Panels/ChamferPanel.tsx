import React, { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateChamferCode } from '../../features/core/modifiers.feature';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';

export function ChamferPanel() {
    const [targetName, setTargetName] = useState('shape');
    const [distance, setDistance] = useState(1);
    const [filterType, setFilterType] = useState('all');

    const { setPreviewCode, codeContext } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();

    // Live Preview Effect
    useEffect(() => {
        if (!targetName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateChamferCode(
            codeContext,
            targetName,
            distance,
            filterType
        );
        setPreviewCode(previewCode);

        return () => setPreviewCode(null);
    }, [targetName, distance, filterType, codeContext, setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const codeSnippet = generateChamferCode(
            codeContext,
            targetName,
            distance,
            filterType
        );
        insertCode(codeSnippet);
        closePanel('chamfer');
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Target Name */}
            <div className="flex flex-col gap-1">
                <label htmlFor="target-name" className="text-xs font-medium text-zinc-400">Target Variable</label>
                <input
                    id="target-name"
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    placeholder="e.g. box1, shape"
                    required
                />
            </div>

            {/* Distance */}
            <div className="flex flex-col gap-1">
                <label htmlFor="chamfer-distance" className="text-xs font-medium text-zinc-400">Distance (mm)</label>
                <input
                    id="chamfer-distance"
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    step="0.1"
                    min="0.1"
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                />
            </div>

            {/* Filter Type */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-400">Edge Filter</label>
                <div className="flex rounded border border-white/10 bg-black/20 p-1">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'vertical', label: 'Vertical' },
                        { id: 'horizontal', label: 'Horiz.' }
                    ].map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilterType(f.id)}
                            className={`flex-1 rounded py-1 text-[10px] transition-colors ${filterType === f.id
                                ? 'bg-zinc-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="mt-2 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => closePanel('chamfer')}
                    className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                >
                    Apply Chamfer
                </button>
            </div>
        </form>
    );
}
