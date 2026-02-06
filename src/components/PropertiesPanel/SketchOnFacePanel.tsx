import React, { useState } from 'react';
import { FloatingPanel } from './FloatingPanel';

interface SketchOnFacePanelProps {
    defaultName: string;
    faceId: number;
    shapeName: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export function SketchOnFacePanel({ defaultName, faceId, shapeName, onConfirm, onCancel }: SketchOnFacePanelProps) {
    const [name, setName] = useState(defaultName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(name);
    };

    return (
        <FloatingPanel title="New Sketch" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="text-[11px] text-zinc-400 bg-black/20 p-2 rounded border border-white/5">
                    Sketching on <span className="text-selection-blue font-medium">{shapeName}</span> (Face {faceId})
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="sketch-name" className="text-xs font-medium text-zinc-400">
                        Sketch Name
                    </label>
                    <input
                        id="sketch-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                        autoFocus
                    />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                    >
                        Create Sketch
                    </button>
                </div>
            </form>
        </FloatingPanel>
    );
}
