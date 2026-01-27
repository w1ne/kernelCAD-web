import { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';

interface RevolveDialogProps {
    onConfirm: (params: { sketchName: string; angle: number; axis: string }) => void;
    onCancel: () => void;
}

export function RevolveDialog({ onConfirm, onCancel }: RevolveDialogProps) {
    const { sketches } = useWorkbench();
    const [selectedSketch, setSelectedSketch] = useState(sketches.length > 0 ? sketches[sketches.length - 1].name : '');
    const [angle, setAngle] = useState(360);
    const [axis, setAxis] = useState('X');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSketch) return;
        onConfirm({ sketchName: selectedSketch, angle, axis });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    Revolve
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="sketch-select"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Select Sketch Profile
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
                            <p className="text-xs text-amber-500 mt-1">No sketches available to revolve.</p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="revolve-angle"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Angle (degrees)
                        </label>
                        <input
                            id="revolve-angle"
                            type="number"
                            value={angle}
                            onChange={(e) => setAngle(Number(e.target.value))}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            step="1"
                            max="360"
                            min="1"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="revolve-axis"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Rotation Axis (local)
                        </label>
                        <select
                            id="revolve-axis"
                            value={axis}
                            onChange={(e) => setAxis(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="X">X Axis</option>
                            <option value="Y">Y Axis</option>
                            <option value="Z">Z Axis</option>
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
                            Revolve
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
