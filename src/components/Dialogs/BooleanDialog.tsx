import { useState } from 'react';

interface BooleanDialogProps {
    type: 'fuse' | 'cut' | 'intersect';
    onConfirm: (params: { baseName: string; toolName: string; type: 'fuse' | 'cut' | 'intersect' }) => void;
    onCancel: () => void;
}

export function BooleanDialog({ type, onConfirm, onCancel }: BooleanDialogProps) {
    const [baseName, setBaseName] = useState('shape1');
    const [toolName, setToolName] = useState('shape2');

    const title = type === 'fuse' ? 'Join (Union)' : type === 'cut' ? 'Cut (Subtract)' : 'Intersect';
    const actionLabel = type === 'fuse' ? 'Join' : type === 'cut' ? 'Cut' : 'Intersect';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ baseName, toolName, type });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    {title}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="base-name"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Base Shape (Target)
                        </label>
                        <input
                            id="base-name"
                            type="text"
                            value={baseName}
                            onChange={(e) => setBaseName(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. box1"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="tool-name"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Tool Shape (Modifier)
                        </label>
                        <input
                            id="tool-name"
                            type="text"
                            value={toolName}
                            onChange={(e) => setToolName(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. cylinder1"
                            required
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
                            {actionLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
