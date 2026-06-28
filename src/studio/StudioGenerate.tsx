// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useMemo, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useGeneration } from '../funnel/hooks/useGeneration';
import type { GenerateEvent } from '../funnel/lib/generateClient';
import { useCode } from './context/CodeContext';
import { useGeometry } from './context/GeometryContext';

/**
 * The in-app agent exists ONLY on the hosted web build (which sets a generation
 * backend via VITE_API_BASE_URL). The npm-distributed / local-MCP Studio has no
 * backend env → the panel is hidden there; locally the agent is the developer's
 * own Claude via the `kernelcad` MCP.
 */
function inAppAgentEnabled(): boolean {
    const base = import.meta.env?.VITE_API_BASE_URL;
    return typeof base === 'string' && base.length > 0;
}

/** Web-only gate. No hooks here, so the conditional return is safe. */
export const StudioGenerate: React.FC = () => {
    if (!inAppAgentEnabled()) return null;
    return <StudioGenerateInner />;
};

/** Human-readable label for a streamed agent event (the live "what it's doing"). */
function stepLabel(e: GenerateEvent): string | null {
    switch (e.kind) {
        case 'status':
            return e.phase === 'tool_calling' ? 'using tools…' : 'thinking…';
        case 'tool_call':
            return `→ ${e.name}`;
        case 'tool_result':
            return `${e.ok ? '✓' : '⟳'} ${e.name}`;
        default:
            return null;
    }
}

const StudioGenerateInner: React.FC = () => {
    const { phase, events, submit } = useGeneration();
    const { code, setCode } = useCode();
    const { executeGeometry } = useGeometry();
    const [prompt, setPrompt] = useState('');
    // The generationId we've already accepted/rejected — gates the review panel
    // so an applied/dismissed proposal doesn't reappear.
    const [resolvedId, setResolvedId] = useState<string | null>(null);
    // The editor source captured at submit time — the "before" side of the diff
    // (so the diff is stable even though `code` changes once we apply).
    const [baseline, setBaseline] = useState('');

    const busy = phase.state === 'running';
    // A finished, not-yet-resolved proposal → show the review (diff + accept/reject).
    const reviewing = phase.state === 'done' && resolvedId !== phase.generationId;

    const steps = useMemo(() => events.map(stepLabel).filter(Boolean) as string[], [events]);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed || busy) return;
        // Edit mode: hand the agent the current model so it iterates instead of
        // replacing. Empty editor → fresh generation.
        setBaseline(code);
        void submit(trimmed, code.trim() ? code : undefined);
    };

    const accept = () => {
        if (phase.state !== 'done') return;
        setCode(phase.artifact.code);
        void executeGeometry(phase.artifact.code);
        setResolvedId(phase.generationId);
    };
    const reject = () => {
        if (phase.state !== 'done') return;
        setResolvedId(phase.generationId);
    };

    const isEdit = baseline.trim().length > 0;

    return (
        <div className="p-3 flex flex-col gap-2">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">Agent</div>
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
                <textarea
                    aria-label="Agent prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    disabled={busy}
                    placeholder={code.trim() ? 'Edit this model… e.g. add two 4mm mounting holes' : 'Describe a part… e.g. a 20mm cube'}
                    className="w-full rounded bg-[#111] border border-[#2a2e38] text-gray-100 p-2 text-[11px] placeholder:text-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50 resize-none font-sans"
                />
                <button
                    type="submit"
                    disabled={busy || !prompt.trim()}
                    className="rounded bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {busy ? 'Working…' : code.trim() ? 'Edit with agent →' : 'Generate →'}
                </button>
            </form>

            {/* Live plan / tool-calls while the agent works. */}
            {busy && (
                <div className="flex flex-col gap-0.5 max-h-28 overflow-auto" aria-live="polite">
                    {steps.length === 0 && <div className="text-[10px] text-gray-500">starting…</div>}
                    {steps.slice(-6).map((s, i) => (
                        <div key={i} className="text-[10px] text-gray-400 truncate font-mono">{s}</div>
                    ))}
                </div>
            )}

            {/* Review gate: diff + verified badge + accept/reject. Never auto-applies. */}
            {reviewing && phase.state === 'done' && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] text-gray-300 truncate" title={phase.artifact.title}>
                            {phase.artifact.title}
                        </div>
                        <div className="text-[10px] text-green-500 whitespace-nowrap" title="Built and passed the kernel gates">
                            ✓ verified
                        </div>
                    </div>
                    <div className="rounded overflow-hidden border border-[#2a2e38]" style={{ height: 180 }}>
                        <DiffEditor
                            original={baseline}
                            modified={phase.artifact.code}
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
                            onClick={accept}
                            className="flex-1 rounded bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-[11px] font-medium transition-colors"
                        >
                            {isEdit ? 'Apply changes' : 'Use this'}
                        </button>
                        <button
                            type="button"
                            onClick={reject}
                            className="flex-1 rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium transition-colors"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {phase.state === 'done' && !reviewing && (
                <div className="text-[10px] text-green-500 truncate" aria-live="polite">
                    ✓ applied — {phase.artifact.title}
                </div>
            )}
            {phase.state === 'error' && (
                <div className="text-[10px] text-red-400" aria-live="polite">
                    {phase.code === 'rate_limited'
                        ? 'Rate limit reached — try again in a minute.'
                        : `Didn't finish: ${phase.message.slice(0, 140)}`}
                </div>
            )}
        </div>
    );
};

export default StudioGenerate;
