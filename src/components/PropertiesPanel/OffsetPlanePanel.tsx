import React, { useState, useEffect } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { useWorkbench } from '../../context/WorkbenchContext';

interface OffsetPlanePanelProps {
    onConfirm: (params: { basePlaneId: string; offset: number }) => void;
    onCancel: () => void;
}

export function OffsetPlanePanel({ onConfirm, onCancel }: OffsetPlanePanelProps) {
    const { planes, selectedFace, setPreviewCode } = useWorkbench();

    // Determine initial selection
    const getInitialPlaneId = () => {
        if (selectedFace) {
            return `face-${selectedFace.faceId}`;
        }
        return planes.length > 0 ? planes[0].id : '';
    };

    const [baseRefId, setBaseRefId] = useState(getInitialPlaneId());
    const [offset, setOffset] = useState(0);

    // Live Preview Effect (Future: Implement plane ghosting)
    useEffect(() => {
        // For now, we'll just clear preview on mount/unmount.
        // Implementing a "Ghost Plane" requires a generatePlaneCode helper 
        // that creates a visual-only plane in the previewGeometries.
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!baseRefId) return;
        onConfirm({ basePlaneId: baseRefId, offset });
    };

    return (
        <FloatingPanel title="Construction Plane" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Reference Selection */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">Reference Entity</label>
                    <select
                        value={baseRefId}
                        onChange={(e) => setBaseRefId(e.target.value)}
                        className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                        required
                    >
                        <option value="" disabled>Select a plane or face...</option>
                        <optgroup label="Standard Planes">
                            {planes.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} {p.type === 'base' ? '(Origin)' : ''}</option>
                            ))}
                        </optgroup>
                        {selectedFace && (
                            <optgroup label="Selection">
                                <option value={`face-${selectedFace.faceId}`}>
                                    Selected Face {selectedFace.faceId}
                                </option>
                            </optgroup>
                        )}
                    </select>
                </div>

                {/* Offset Distance */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">Offset Distance (mm)</label>
                    <input
                        type="number"
                        value={offset}
                        onChange={(e) => setOffset(Number(e.target.value))}
                        className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                        step="1"
                        autoFocus
                    />
                </div>

                {/* Actions */}
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                    >
                        Create Plane
                    </button>
                </div>
            </form>
        </FloatingPanel>
    );
}
