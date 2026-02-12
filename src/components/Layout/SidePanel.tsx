import { useState } from 'react';
import SceneBrowser from '../SceneBrowser';
import { useWorkbench } from '../../context/WorkbenchContext';
import { extractHistoryItems, type HistoryItem } from '../../lib/codeAnalysis';
import { AIAssistant } from '../../features/ai/AIAssistant';

interface SidePanelProps {
    onJumpToLine: (line: number) => void;
}

export function SidePanel({ onJumpToLine }: SidePanelProps) {
    const {
        code,
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

    const [activeTab, setActiveTab] = useState<'scene' | 'ai'>('scene');

    // We compute items on the fly. 
    // In a real app we might memoize this or put it in context.
    const items = extractHistoryItems(code);

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
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-2 text-center hover:bg-[#222] ${activeTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1e1e1e]' : ''}`}
                >
                    AI ASSISTANT
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'scene' ? (
                    <SceneBrowser
                        items={items}
                        planes={planes}
                        selectedItemId={selectedItemId}
                        selectedItemIds={selectedItemIds}
                        hoveredItemId={hoveredItemId}
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
                            const item = items.find((entry) => entry.id === id);
                            setHoveredItemId(item?.name ?? id);
                        }}
                        onToggleVisibility={toggleVisibility}
                        onTogglePlane={togglePlaneVisibility}
                        onSelectPlane={(id) => setSelectedItemId(id)}
                        onRename={renameItem}
                        onDelete={(item) => {
                            deleteHistoryItem(item);
                            if (selectedItemId === item.id || selectedItemId === item.name) {
                                setSelectedItemId(null);
                            }
                            if (hoveredItemId === item.id || hoveredItemId === item.name) {
                                setHoveredItemId(null);
                            }
                        }}
                    />
                ) : (
                    <AIAssistant />
                )}
            </div>
        </div>
    );
}
