import React, { useEffect, useMemo, useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { getSketchVariablesAST } from '../../lib/ast';
import { generateRevolveCode } from '../../features/core/revolve.feature';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';

export function RevolvePanel() {
    const { sketches, code, setPreviewCode, codeContext, selectedSketchName } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();

    const sketchOptions = useMemo(() => {
        const options: Array<{ key: string; value: string; label: string }> = [];
        const seenNames = new Set<string>();

        for (const s of sketches) {
            if (!s.name || seenNames.has(s.name)) continue;
            seenNames.add(s.name);
            options.push({
                key: `ui:${s.id}`,
                value: s.name,
                label: `${s.name} (${s.plane} Plane)`
            });
        }

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
        selectedSketchName || (sketchOptions.length > 0 ? sketchOptions[sketchOptions.length - 1].value : '')
    );
    const [angle, setAngle] = useState(360);
    const [axis, setAxis] = useState('X');

    // Live Preview Effect
    useEffect(() => {
        if (!selectedSketch) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateRevolveCode(
            codeContext,
            selectedSketch,
            angle,
            axis
        );
        setPreviewCode(previewCode);

        return () => setPreviewCode(null);
    }, [selectedSketch, angle, axis, codeContext, setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSketch) return;

        const revolveCode = generateRevolveCode(
            codeContext,
            selectedSketch,
            angle,
            axis
        );
        insertCode(revolveCode);
        closePanel('revolve');
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Sketch Selection */}
            <div className="flex flex-col gap-1">
                <label htmlFor="revolve-profile" className="text-xs font-medium text-zinc-400">Profile</label>
                <select
                    id="revolve-profile"
                    value={selectedSketch}
                    onChange={(e) => setSelectedSketch(e.target.value)}
                    className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    required
                >
                    <option value="" disabled>Select Sketch...</option>
                    {sketchOptions.map((s) => (
                        <option key={s.key} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            {/* Angle Input */}
            <div className="flex flex-col gap-1">
                <label htmlFor="revolve-angle" className="text-xs font-medium text-zinc-400">Angle (deg)</label>
                <input
                    id="revolve-angle"
                    type="number"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    step="1"
                    max="360"
                    min="1"
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                />
            </div>

            {/* Axis Selection */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-400">Rotation Axis</label>
                <div className="flex rounded border border-white/10 bg-black/20 p-1">
                    {['X', 'Y', 'Z'].map((ax) => (
                        <button
                            key={ax}
                            type="button"
                            onClick={() => setAxis(ax)}
                            className={`flex-1 rounded py-1 text-xs transition-colors ${axis === ax
                                ? 'bg-zinc-700 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {ax}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="mt-2 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => closePanel('revolve')}
                    className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                >
                    Revolve
                </button>
            </div>
        </form>
    );
}
