import { useState } from 'react';

interface ChamferDialogProps {
    onConfirm: (params: { targetName: string; distance: number; filterType: string }) => void;
    onCancel: () => void;
}

export function ChamferDialog({ onConfirm, onCancel }: ChamferDialogProps) {
    const [targetName, setTargetName] = useState('shape');
    const [distance, setDistance] = useState(1);
    const [filterType, setFilterType] = useState('all');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ targetName, distance, filterType });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    Chamfer Edges
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="target-name"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Target Variable Name
                        </label>
                        <input
                            id="target-name"
                            type="text"
                            value={targetName}
                            onChange={(e) => setTargetName(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. box1, shape"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The variable name of the shape to chamfer.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="chamfer-distance"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Distance (mm)
                        </label>
                        <input
                            id="chamfer-distance"
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(Number(e.target.value))}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            step="0.1"
                            min="0.1"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="edge-filter"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Edge Filter
                        </label>
                        <select
                            id="edge-filter"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">All Edges</option>
                            <option value="vertical">Vertical (Z)</option>
                            <option value="horizontal">Horizontal (XY)</option>
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
                            Apply Chamfer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
