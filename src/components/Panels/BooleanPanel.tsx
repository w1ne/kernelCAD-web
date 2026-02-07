import React, { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateBooleanCode } from '../../features/core/modifiers.feature';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';

interface BooleanPanelProps {
    type: 'fuse' | 'cut' | 'intersect';
}

export function BooleanPanel({ type }: BooleanPanelProps) {
    const { codeContext, setPreviewCode } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();

    const [baseName, setBaseName] = useState('shape1');
    const [toolName, setToolName] = useState('shape2');

    const actionLabel = type === 'fuse' ? 'Join' : type === 'cut' ? 'Cut' : 'Intersect';
    const panelId = type === 'fuse' ? 'union' : type;

    // Live Preview Effect
    useEffect(() => {
        if (!baseName || !toolName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateBooleanCode(
            codeContext,
            baseName,
            toolName,
            type
        );
        setPreviewCode(previewCode);

        return () => setPreviewCode(null);
    }, [baseName, toolName, type, codeContext, setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const codeSnippet = generateBooleanCode(
            codeContext,
            baseName,
            toolName,
            type
        );
        insertCode(codeSnippet);
        closePanel(panelId);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Target Selection */}
            <div className="flex flex-col gap-1">
                <label htmlFor="boolean-base" className="text-xs font-medium text-zinc-400">Base Shape (Target)</label>
                <input
                    id="boolean-base"
                    type="text"
                    value={baseName}
                    onChange={(e) => setBaseName(e.target.value)}
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    placeholder="e.g. part1"
                    required
                />
            </div>

            {/* Tool Selection */}
            <div className="flex flex-col gap-1">
                <label htmlFor="boolean-tool" className="text-xs font-medium text-zinc-400">Tool Shape (Modifier)</label>
                <input
                    id="boolean-tool"
                    type="text"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    placeholder="e.g. cutter"
                    required
                />
            </div>

            {/* Actions */}
            <div className="mt-2 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => closePanel(panelId)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                >
                    {actionLabel}
                </button>
            </div>
        </form>
    );
}
