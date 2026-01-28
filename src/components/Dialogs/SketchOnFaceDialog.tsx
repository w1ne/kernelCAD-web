import { useState } from 'react';

interface SketchOnFaceDialogProps {
    defaultName: string;
    faceId: number;
    shapeName: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export function SketchOnFaceDialog({ defaultName, faceId, shapeName, onConfirm, onCancel }: SketchOnFaceDialogProps) {
    const [name, setName] = useState(defaultName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(name);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[300px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    New Sketch
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-sm text-gray-400 mb-4">
                        Creating sketch on <span className="text-blue-400">{shapeName}</span> (Face {faceId})
                    </div>

                    <div>
                        <label
                            htmlFor="sketch-name"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Sketch Name
                        </label>
                        <input
                            id="sketch-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
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
                            Create Sketch
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
