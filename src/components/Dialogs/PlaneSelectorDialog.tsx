import React from 'react';
import type { SketchPlane } from '../../types/sketch';
import { Box, Layers, Grid } from 'lucide-react';

interface PlaneSelectorDialogProps {
    onSelect: (plane: SketchPlane) => void;
    onCancel: () => void;
}

export function PlaneSelectorDialog({ onSelect, onCancel }: PlaneSelectorDialogProps) {
    const planes: { id: SketchPlane; label: string; description: string; icon: React.ReactNode }[] = [
        {
            id: 'XY',
            label: 'XY Plane (Top)',
            description: 'Sketch on the horizontal ground plane.',
            icon: <Grid className="w-8 h-8 text-blue-400" />,
        },
        {
            id: 'XZ',
            label: 'XZ Plane (Front)',
            description: 'Sketch on the vertical front-facing plane.',
            icon: <Layers className="w-8 h-8 text-red-400" />,
        },
        {
            id: 'YZ',
            label: 'YZ Plane (Right)',
            description: 'Sketch on the vertical side-facing plane.',
            icon: <Box className="w-8 h-8 text-green-400" />,
        },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-8 shadow-2xl max-w-lg w-full">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Select Sketch Plane</h2>
                <p className="text-gray-400 text-center mb-8">Choose the orientation for your 2D sketch.</p>

                <div className="grid grid-cols-1 gap-4 mb-8">
                    {planes.map((plane) => (
                        <button
                            key={plane.id}
                            onClick={() => onSelect(plane.id)}
                            className="flex items-center gap-6 p-4 rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-transparent hover:border-blue-500/50 transition-all group text-left"
                        >
                            <div className="p-3 bg-black/30 rounded-lg group-hover:scale-110 transition-transform">
                                {plane.icon}
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-white">{plane.label}</div>
                                <div className="text-sm text-gray-400">{plane.description}</div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
