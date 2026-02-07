import React from 'react';
import { FloatingPanel } from './FloatingPanel';
import { Box, Layers, Grid, MousePointer2 } from 'lucide-react';
import type { SketchPlane } from '../../types/sketch';

interface PlaneSelectorPanelProps {
    onSelect: (plane: SketchPlane) => void;
    onSelectFace: () => void;
    onCancel: () => void;
}

export function PlaneSelectorPanel({ onSelect, onSelectFace, onCancel }: PlaneSelectorPanelProps) {
    const planes: { id: SketchPlane; label: string; icon: React.ReactNode }[] = [
        {
            id: 'XY',
            label: 'XY Plane (Top)',
            icon: <Grid size={18} className="text-blue-400" />,
        },
        {
            id: 'XZ',
            label: 'XZ Plane (Front)',
            icon: <Layers size={18} className="text-red-400" />,
        },
        {
            id: 'YZ',
            label: 'YZ Plane (Right)',
            icon: <Box size={18} className="text-green-400" />,
        },
    ];

    return (
        <FloatingPanel title="Select Sketch Plane" onClose={onCancel}>
            <div className="flex flex-col gap-3">
                <p className="text-xs text-zinc-400 mb-1">Choose an orientation for your 2D sketch.</p>

                <div className="grid grid-cols-1 gap-2">
                    {planes.map((plane) => (
                        <button
                            key={plane.id}
                            onClick={() => onSelect(plane.id)}
                            className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 hover:border-selection-blue/50 transition-all group group text-left"
                        >
                            <div className="p-2 bg-black/30 rounded-md group-hover:scale-110 transition-transform">
                                {plane.icon}
                            </div>
                            <span className="text-sm font-medium text-zinc-200">{plane.label}</span>
                        </button>
                    ))}

                    <div className="h-px bg-white/5 my-1" />

                    <button
                        onClick={onSelectFace}
                        className="flex items-center gap-3 p-3 rounded-lg bg-selection-blue/10 border border-selection-blue/20 hover:bg-selection-blue/20 hover:border-selection-blue/40 transition-all group text-left"
                    >
                        <div className="p-2 bg-selection-blue/20 rounded-md group-hover:scale-110 transition-transform">
                            <MousePointer2 size={18} className="text-selection-blue" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Select from 3D View</div>
                            <div className="text-[10px] text-zinc-400">Click any planar face</div>
                        </div>
                    </button>
                </div>

                <div className="mt-2 flex justify-end">
                    <button
                        onClick={onCancel}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors py-1 px-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </FloatingPanel>
    );
}
