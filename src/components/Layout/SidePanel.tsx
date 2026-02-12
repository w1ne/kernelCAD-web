import { useState } from 'react';
import SceneBrowser from '../SceneBrowser';
import { useWorkbench } from '../../context/WorkbenchContext';
import { extractVariables, type VariableDefinition } from '../../lib/codeAnalysis';
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
        deleteItem
    } = useWorkbench();

    const [activeTab, setActiveTab] = useState<'scene' | 'ai'>('scene');

    // We compute items on the fly. 
    // In a real app we might memoize this or put it in context.
    const items = extractVariables(code);

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
                        onSelect={(item: VariableDefinition) => {
                            setViewMode('code');
                            setSelectedItemId(item.name);
                            onJumpToLine(item.line);
                        }}
                        onToggleSelection={toggleSelection}
                        onHover={setHoveredItemId}
                        onToggleVisibility={toggleVisibility}
                        onTogglePlane={togglePlaneVisibility}
                        onSelectPlane={(id) => setSelectedItemId(id)}
                        onRename={renameItem}
                        onDelete={(item) => deleteItem(item.name, item.line)}
                    />
                ) : (
                    <AIAssistant />
                )}
            </div>
        </div>
    );
}
