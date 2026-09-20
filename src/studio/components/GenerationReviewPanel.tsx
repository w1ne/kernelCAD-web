// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { DiffEditor } from '@monaco-editor/react';
import type { Artifact } from '../../funnel/lib/generateClient';
import type { StagedEdit } from '../store/shellStore';

/**
 * Review gate: diff + verified badge + accept/reject. Never auto-applies.
 */
export function GenerationReviewPanel({
    artifact,
    baseline,
    stagedEdit,
    onStage,
    onReject,
}: {
    artifact: Artifact;
    baseline: string;
    stagedEdit: StagedEdit | null;
    onStage: () => void;
    onReject: () => void;
}) {
    if (stagedEdit != null) {
        return (
            <div className="rounded border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
                Review the current staged edit before staging another proposal.
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-300 truncate" title={artifact.title}>
                    {artifact.title}
                </div>
                <div className="text-[10px] text-green-500 whitespace-nowrap" title="Built and passed the kernel gates">
                    ✓ verified
                </div>
            </div>
            <div className="rounded overflow-hidden border border-[#2a2e38]" style={{ height: 180 }}>
                <DiffEditor
                    original={baseline}
                    modified={artifact.code}
                    language="typescript"
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        renderSideBySide: false,
                        minimap: { enabled: false },
                        fontSize: 11,
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        renderOverviewRuler: false,
                    }}
                />
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onStage}
                    className="flex-1 rounded bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-[11px] font-medium transition-colors"
                >
                    Stage edit
                </button>
                <button
                    type="button"
                    onClick={onReject}
                    className="flex-1 rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium transition-colors"
                >
                    Discard
                </button>
            </div>
        </div>
    );
}
