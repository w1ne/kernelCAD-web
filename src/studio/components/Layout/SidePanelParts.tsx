// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import SceneBrowser from '../SceneBrowser';
import { useWorkbench } from '../../context/WorkbenchContext';
import { extractHistoryItems, type HistoryItem } from '../../../shared/codeGeneration/codeAnalysis';

interface BuildLoopPanelProps {
    readonly verdict: string;
    readonly repairMode: string;
    readonly scriptParams: readonly { name: string; value: unknown; meta?: { description?: string } | null }[];
    readonly blockingReasons: readonly { code?: string | null; message?: string }[];
    readonly nonBlockingDiagnostics: readonly { code?: string | null; message?: string }[];
    readonly showReviewDetails: boolean;
    readonly onToggleReviewDetails: () => void;
    readonly suggestedRepairPrompt?: string;
}

export function BuildLoopPanel({
    verdict,
    repairMode,
    scriptParams,
    blockingReasons,
    nonBlockingDiagnostics,
    showReviewDetails,
    onToggleReviewDetails,
    suggestedRepairPrompt,
}: BuildLoopPanelProps): JSX.Element {
    return (
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
                                    onClick={() => onToggleReviewDetails()}
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

                        {suggestedRepairPrompt && (
                            <div>
                                <div className="mb-2 font-bold text-gray-400">NEXT REPAIR PROMPT</div>
                                <pre className="whitespace-pre-wrap border border-[#2d3340] bg-[#111827] p-2 font-mono text-[11px] leading-5 text-blue-100">
                                    {suggestedRepairPrompt}
                                </pre>
                            </div>
                        )}
                    </div>
    );
}

interface ScenePanelProps {
    readonly onJumpToLine: (line: number) => void;
}

export function ScenePanel({ onJumpToLine }: ScenePanelProps): JSX.Element {
    const {
        code,
        planes,
        setViewMode,
        selectedItemId,
        setSelectedItemId,
        hoveredItemId,
        setHoveredItemId,
        hiddenIds,
        toggleVisibility,
        togglePlaneVisibility,
        selectedItemIds,
        toggleSelection,
        renameItem,
        deleteHistoryItem,
    } = useWorkbench();

    // We compute items on the fly.
    // In a real app we might memoize this or put it in context.
    const items = extractHistoryItems(code);
    const historyIds = new Set(items.map((item) => item.id));
    const selectedHistoryId = selectedItemId && historyIds.has(selectedItemId) ? selectedItemId : null;
    const hoveredHistoryId = hoveredItemId && historyIds.has(hoveredItemId) ? hoveredItemId : null;
    const selectedHistoryIds = selectedItemIds.filter((id) => historyIds.has(id));

    return (
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
    );
}
