// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import SceneBrowser from '../SceneBrowser';
import { useWorkbench } from '../../context/WorkbenchContext';
import { extractHistoryItems, type HistoryItem } from '../../../shared/codeGeneration/codeAnalysis';
import { StudioGenerate } from '../../StudioGenerate';

interface SidePanelProps {
    onJumpToLine: (line: number) => void;
}

export function SidePanel({ onJumpToLine }: SidePanelProps) {
    const {
        code,
        scriptParams,
        scriptReview,
        setViewMode,
        planes,
        togglePlaneVisibility,
        selectedItemId,
        setSelectedItemId,
        hoveredItemId,
        setHoveredItemId,
        hiddenIds,
        toggleVisibility,
        selectedItemIds,
        toggleSelection,
        renameItem,
        deleteHistoryItem
    } = useWorkbench();

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

    // We compute items on the fly. 
    // In a real app we might memoize this or put it in context.
    const items = extractHistoryItems(code);
    const historyIds = new Set(items.map((item) => item.id));
    const selectedHistoryId = selectedItemId && historyIds.has(selectedItemId) ? selectedItemId : null;
    const hoveredHistoryId = hoveredItemId && historyIds.has(hoveredItemId) ? hoveredItemId : null;
    const selectedHistoryIds = selectedItemIds.filter((id) => historyIds.has(id));

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
                    <SceneBrowser
                        items={items}
                        planes={planes}
                        selectedItemId={selectedHistoryId}
                        selectedItemIds={selectedHistoryIds}
                        hoveredItemId={hoveredHistoryId}
                        hiddenIds={hiddenIds}
                        onSelect={(item: HistoryItem) => {
                            setViewMode('code');
                            setSelectedItemId(item.id);
                            onJumpToLine(item.line);
                        }}
                        onToggleSelection={toggleSelection}
                        onHover={(id) => {
                            if (!id) {
                                setHoveredItemId(null);
                                return;
                            }
                            setHoveredItemId(id);
                        }}
                        onToggleVisibility={toggleVisibility}
                        onTogglePlane={togglePlaneVisibility}
                        onSelectPlane={(id) => setSelectedItemId(id)}
                        onRename={renameItem}
                        onDelete={(item) => {
                            deleteHistoryItem(item);
                            if (selectedHistoryId === item.id) {
                                setSelectedItemId(null);
                            }
                            if (hoveredHistoryId === item.id) {
                                setHoveredItemId(null);
                            }
                        }}
                    />
                ) : activeTab === 'loop' ? (
                    <div className="h-full overflow-auto p-3 text-xs text-gray-300" data-testid="build-loop-panel">
                        <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#333] pb-2">
                            <span className="font-bold text-gray-100">{verdict}</span>
                            <span className="rounded border border-[#333] px-2 py-1 font-mono text-[11px] text-gray-300">
                                {repairMode}
                            </span>
                        </div>

                        <div className="mb-4">
                            <div className="mb-2 font-bold text-gray-400">PARAMETERS</div>
                            {scriptParams.length > 0 ? (
                                <div className="space-y-1">
                                    {scriptParams.map((param) => (
                                        <div
                                            key={param.name}
                                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border border-[#262626] bg-[#171717] px-2 py-1.5"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate font-mono text-gray-100">{param.name}</div>
                                                {param.meta?.description && (
                                                    <div className="truncate text-[11px] text-gray-500">{param.meta.description}</div>
                                                )}
                                            </div>
                                            <div className="font-mono text-gray-100">{String(param.value)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500">No runtime parameters</div>
                            )}
                        </div>

                        <div className="mb-4">
                            <div className="mb-2 font-bold text-gray-400">BLOCKERS</div>
                            {blockingReasons.length > 0 ? (
                                <div className="space-y-2">
                                    {blockingReasons.map((reason, index) => (
                                        <div key={`${reason.code ?? 'blocker'}-${index}`} className="border border-[#332626] bg-[#1d1515] px-2 py-1.5">
                                            <div className="font-mono text-[11px] text-red-200">{reason.code}</div>
                                            <div className="mt-1 text-gray-200">{reason.message}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500">No blocking mechanical review facts</div>
                            )}
                        </div>

                        {nonBlockingDiagnostics.length > 0 && (
                            <div className="mb-4">
                                <button
                                    type="button"
                                    className="mb-2 text-left text-[11px] font-bold text-gray-400 hover:text-gray-200"
                                    onClick={() => setShowReviewDetails((prev) => !prev)}
                                >
                                    {showReviewDetails ? 'HIDE' : 'SHOW'} {nonBlockingDiagnostics.length} REVIEW DETAIL{nonBlockingDiagnostics.length === 1 ? '' : 'S'}
                                </button>
                                {showReviewDetails && (
                                    <div className="space-y-2">
                                        {nonBlockingDiagnostics.map((diagnostic, index) => (
                                            <div key={`${diagnostic.code ?? 'fact'}-${index}`} className="border border-[#333327] bg-[#1c1c14] px-2 py-1.5">
                                                <div className="font-mono text-[11px] text-yellow-200">{diagnostic.code}</div>
                                                <div className="mt-1 text-gray-200">{diagnostic.message}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {scriptReview?.suggestedRepairPrompt && (
                            <div>
                                <div className="mb-2 font-bold text-gray-400">NEXT REPAIR PROMPT</div>
                                <pre className="whitespace-pre-wrap border border-[#2d3340] bg-[#111827] p-2 font-mono text-[11px] leading-5 text-blue-100">
                                    {scriptReview.suggestedRepairPrompt}
                                </pre>
                            </div>
                        )}
                    </div>
                ) : (
                    <StudioGenerate />
                )}
            </div>
        </div>
    );
}
