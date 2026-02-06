import React, { useEffect, useMemo, useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { getSketchVariablesAST } from '../../lib/ast';
import { FloatingPanel } from './FloatingPanel';
import { generateExtrudeCode } from '../../features/core/extrude.feature';

interface ExtrudePanelProps {
    sketchName?: string;
    onConfirm: (payload: { sketchName: string; distance: number; direction: 'normal' | 'reversed' }) => void;
    onCancel: () => void;
}

export function ExtrudePanel({ sketchName: initialSketchName, onConfirm, onCancel }: ExtrudePanelProps) {
    const { sketches, code } = useWorkbench();

    // Replicate sketch finding logic
    const sketchOptions = useMemo(() => {
        const options: Array<{ key: string; value: string; label: string }> = [];
        const seenNames = new Set<string>();

        // 1. Current session sketches
        for (const s of sketches) {
            if (!s.name || seenNames.has(s.name)) continue;
            seenNames.add(s.name);
            options.push({
                key: `ui:${s.id}`,
                value: s.name,
                label: `${s.name} (${s.plane} Plane)`
            });
        }

        // 2. Sketches in code AST
        let codeSketches: string[] = [];
        try {
            codeSketches = getSketchVariablesAST(code);
        } catch {
            codeSketches = [];
        }

        for (const name of codeSketches) {
            if (!name || seenNames.has(name)) continue;
            seenNames.add(name);
            options.push({
                key: `code:${name}`,
                value: name,
                label: `${name} (From Code)`
            });
        }
        return options;
    }, [sketches, code]);

    const [selectedSketch, setSelectedSketch] = useState(
        initialSketchName || (sketchOptions.length > 0 ? sketchOptions[sketchOptions.length - 1].value : '')
    );
    const [distance, setDistance] = useState(10);
    const [direction, setDirection] = useState<'normal' | 'reversed'>('normal');

    const { setPreviewCode, codeContext } = useWorkbench();

    useEffect(() => {
        if (!selectedSketch && sketchOptions.length > 0) {
            setSelectedSketch(sketchOptions[sketchOptions.length - 1].value);
        }
    }, [selectedSketch, sketchOptions]);

    // Live Preview Effect
    useEffect(() => {
        if (!selectedSketch) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateExtrudeCode(
            codeContext,
            selectedSketch,
            distance,
            direction === 'normal' ? 'default' : direction
        );
        setPreviewCode(previewCode);

        return () => setPreviewCode(null);
    }, [selectedSketch, distance, direction, codeContext, setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSketch) return;
        onConfirm({ sketchName: selectedSketch, distance, direction });
    };

    return (
        <FloatingPanel title="Extrude" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Sketch Selection */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">Profile</label>
                    <select
                        value={selectedSketch}
                        onChange={(e) => setSelectedSketch(e.target.value)}
                        className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    >
                        <option value="" disabled>Select Sketch...</option>
                        {sketchOptions.map((s) => (
                            <option key={s.key} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Distance Input */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="extrude-distance" className="text-xs font-medium text-zinc-400">Distance (mm)</label>
                    <div className="relative">
                        <input
                            id="extrude-distance"
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(parseFloat(e.target.value))}
                            step="0.5"
                            className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                        />
                    </div>
                </div>

                {/* Direction Toggle (Segmented Control style) */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">Direction</label>
                    <div className="flex rounded border border-white/10 bg-black/20 p-1">
                        <button
                            type="button"
                            onClick={() => setDirection('normal')}
                            className={`flex-1 rounded py-1 text-xs transition-colors ${direction === 'normal'
                                ? 'bg-zinc-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Normal
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirection('reversed')}
                            className={`flex-1 rounded py-1 text-xs transition-colors ${direction === 'reversed'
                                ? 'bg-zinc-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Reversed
                        </button>
                    </div>
                </div>

                {/* Actions */}
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
                        Extrude
                    </button>
                </div>
            </form>
        </FloatingPanel>
    );
}
