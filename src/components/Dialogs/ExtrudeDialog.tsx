import { useState } from 'react';

interface ExtrudeDialogProps {
    sketchName: string;
    onConfirm: (params: { distance: number; direction: 'normal' | 'reversed' }) => void;
    onCancel: () => void;
}

export function ExtrudeDialog({ sketchName, onConfirm, onCancel }: ExtrudeDialogProps) {
    const [distance, setDistance] = useState(10);
    const [direction, setDirection] = useState<'normal' | 'reversed'>('normal');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ distance, direction });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    Extrude: {sketchName}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Distance (mm)
                        </label>
                        <input
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Direction
                        </label>
                        <select
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
