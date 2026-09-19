// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { StudioGenerate } from '../../StudioGenerate';
import { BuildLoopPanel, ScenePanel } from './SidePanelParts';

interface SidePanelProps {
    onJumpToLine: (line: number) => void;
}

export function SidePanel({ onJumpToLine }: SidePanelProps) {
    const { scriptParams, scriptReview } = useWorkbench();
    const [activeTab, setActiveTab] = useState<'scene' | 'loop' | 'generate'>('scene');
    const [showReviewDetails, setShowReviewDetails] = useState(false);

    const reviewOk = scriptReview?.ok ?? null;
    const verdict = reviewOk === null ? 'No Review' : reviewOk ? 'Functional' : 'Needs Repair';
    const repairMode = scriptReview?.fitness?.repairMode ?? 'none';
    const blockingReasons = scriptReview?.fitness?.blockingReasons ?? [];
    const nonBlockingDiagnostics = (scriptReview?.diagnostics ?? []).filter((diagnostic) =>
        diagnostic.severity !== 'error' &&
        !blockingReasons.some((reason) => reason.code === diagnostic.code && reason.message === diagnostic.message),
    );

    return (
        <div className="flex flex-col h-full bg-[#111] border-b border-[#333]">
            {/* Tab Header */}
            <div className="flex border-b border-[#333] text-xs font-bold text-gray-400">
                <button
                    onClick={() => setActiveTab('scene')}
                    className={`flex-1 py-2 text-center hover:bg-[#222] ${activeTab === 'scene' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1e1e1e]' : ''}`}
                >
                    SCENE
                </button>
                <button
                    onClick={() => setActiveTab('loop')}
                    className={`flex-1 py-2 text-center hover:bg-[#222] ${activeTab === 'loop' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1e1e1e]' : ''}`}
                >
                    BUILD LOOP
                </button>
                <button
                    onClick={() => setActiveTab('generate')}
                    className={`flex-1 py-2 text-center hover:bg-[#222] ${activeTab === 'generate' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1e1e1e]' : ''}`}
                >
                    GENERATE
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'scene' ? (
                    <ScenePanel onJumpToLine={onJumpToLine} />
                ) : activeTab === 'loop' ? (
<BuildLoopPanel
                        verdict={verdict}
                        repairMode={repairMode}
                        scriptParams={scriptParams}
                        blockingReasons={blockingReasons}
                        nonBlockingDiagnostics={nonBlockingDiagnostics}
                        showReviewDetails={showReviewDetails}
                        onToggleReviewDetails={() => setShowReviewDetails((prev) => !prev)}
                        suggestedRepairPrompt={scriptReview?.suggestedRepairPrompt}
                    />
                ) : (
                    <StudioGenerate />
                )}
            </div>
        </div>
    );
}
