// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useRef, useState } from 'react';
import { useGeneration } from '../funnel/hooks/useGeneration';
import { inAppAgentEnabled } from './agentAvailability';
import { useCode } from './context/CodeContext';
import { useGeometry } from './context/GeometryContext';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useShellStore } from './store/useShellStore';

/**
 * In-Studio generation. Type a prompt → the hosted agent builds a model and
 * the result drops straight into the Studio editor (the viewer re-runs on code
 * change). No navigation, no sign-in wall — `/api/v1/generate` is anonymous
 * (IP rate-limited); signing in is only needed later to SAVE.
 *
 * This is the "generate directly in Studio" experience: same window, live.
 */
/**
 * Web-only gate. Locally the agent is the developer's own (Claude via the
 * `kernelcad` MCP); the in-app generate agent exists ONLY on the hosted deploy.
 * This wrapper has no hooks, so the conditional return is safe.
 */
export const StudioGenerate: React.FC = () => {
    if (!inAppAgentEnabled()) return null;
    return <StudioGenerateInner />;
};

const StudioGenerateInner: React.FC = () => {
    const { phase, events, submit } = useGeneration();
    const { setCode } = useCode();
    const { executeGeometry } = useGeometry();
    const { selectedFeatureId } = useFeatureSelection();
    const { agentDraftPrompt, agentDraftPromptVersion } = useShellStore();
    const [prompt, setPrompt] = useState('');
    const loadedRef = useRef<string | null>(null);

    useEffect(() => {
        if (agentDraftPrompt !== null) setPrompt(agentDraftPrompt);
    }, [agentDraftPrompt, agentDraftPromptVersion]);

    // When a generation finishes, load the model into the editor AND render it.
    // setCode updates the editor text; executeGeometry meshes it into the viewer
    // (on the hosted path setCode alone is a no-op for rendering).
    useEffect(() => {
        if (phase.state === 'done' && loadedRef.current !== phase.generationId) {
            loadedRef.current = phase.generationId;
            setCode(phase.artifact.code);
            void executeGeometry(phase.artifact.code);
        }
    }, [phase, setCode, executeGeometry]);

    const busy = phase.state === 'running';

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed || busy) return;
        if (selectedFeatureId === null) {
            void submit(trimmed);
            return;
        }
        void submit(`Edit selected target "${selectedFeatureId}": ${trimmed}`);
    };

    return (
        <div className="p-3 flex flex-col gap-2">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">Generate</div>
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
                <div className="text-[10px] text-gray-500 truncate" data-testid="studio-generate-target">
                    Target: {selectedFeatureId ?? 'whole model'}
                </div>
                <textarea
                    aria-label="Generate prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    disabled={busy}
                    placeholder="Describe a part… e.g. a 20mm cube"
                    className="w-full rounded bg-[#111] border border-[#2a2e38] text-gray-100 p-2 text-[11px] placeholder:text-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50 resize-none font-sans"
                />
                <button
                    type="submit"
                    disabled={busy || !prompt.trim()}
                    className="rounded bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {busy ? 'Generating…' : 'Generate →'}
                </button>
            </form>

            {phase.state === 'running' && (
                <div className="text-[10px] text-gray-500 truncate" aria-live="polite">
                    working — {events.length} events
                    {phase.lastEvent.kind === 'tool_call' && ` · ${phase.lastEvent.name}`}
                    {phase.lastEvent.kind === 'status' && ` · ${phase.lastEvent.phase}`}
                </div>
            )}
            {phase.state === 'done' && (
                <div className="text-[10px] text-green-500 truncate" aria-live="polite">
                    ✓ {phase.artifact.title} — loaded into Studio
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
