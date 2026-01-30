import { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';

interface OffsetPlaneDialogProps {
    onConfirm: (params: { basePlaneId: string; offset: number }) => void;
    onCancel: () => void;
}

export function OffsetPlaneDialog({ onConfirm, onCancel }: OffsetPlaneDialogProps) {
    const { planes, selectedFace } = useWorkbench();

    // Determine initial selection
    const getInitialPlaneId = () => {
        if (selectedFace) {
            return `face-${selectedFace.faceId}`; // specific format for faces
        }
        return planes.length > 0 ? planes[0].id : '';
    };

    const [baseRefId, setBaseRefId] = useState(getInitialPlaneId());
    const [offset, setOffset] = useState(0); // Default to 0 instead of 10

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!baseRefId) return;
        onConfirm({ basePlaneId: baseRefId, offset });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    Construction Plane
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="base-plane-select"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Reference Entity
                        </label>
                        <select
                            id="base-plane-select"
                            value={baseRefId}
                            onChange={(e) => setBaseRefId(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
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

                    <div>
                        <label
                            htmlFor="offset-distance"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Offset Distance (mm)
                        </label>
                        <input
                            id="offset-distance"
                            type="number"
                            value={offset}
                            onChange={(e) => setOffset(Number(e.target.value))}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            step="1"
                            autoFocus
                        />
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
                            Create Plane
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
