import { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';

interface ExtrudeDialogProps {
    sketchName?: string;
    onConfirm: (params: { sketchName: string; distance: number; direction: 'normal' | 'reversed' }) => void;
    onCancel: () => void;
}

export function ExtrudeDialog({ sketchName: initialSketchName, onConfirm, onCancel }: ExtrudeDialogProps) {
    const { sketches } = useWorkbench();
    const [selectedSketch, setSelectedSketch] = useState(initialSketchName || (sketches.length > 0 ? sketches[sketches.length - 1].name : ''));
    const [distance, setDistance] = useState(10);
    const [direction, setDirection] = useState<'normal' | 'reversed'>('normal');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSketch) return;
        onConfirm({ sketchName: selectedSketch, distance, direction });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    Extrude
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="sketch-select"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Select Sketch
                        </label>
                        <select
                            id="sketch-select"
                            value={selectedSketch}
                            onChange={(e) => setSelectedSketch(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            required
                        >
                            <option value="" disabled>Select a sketch...</option>
                            {sketches.map((s) => (
                                <option key={s.id} value={s.name}>{s.name} ({s.plane} Plane)</option>
                            ))}
                        </select>
                        {sketches.length === 0 && (
                            <p className="text-xs text-amber-500 mt-1">No sketches available to extrude.</p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="extrude-distance"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Distance (mm)
                        </label>
                        <input
                            id="extrude-distance"
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(Number(e.target.value))}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            step="1"
                            min="1"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="extrude-direction"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Direction
                        </label>
                        <select
                            id="extrude-direction"
                            value={direction}
                            onChange={(e) => setDirection(e.target.value as 'normal' | 'reversed')}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="normal">Normal (upward)</option>
                            <option value="reversed">Reversed (downward)</option>
                        </select>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                            Extrude
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
