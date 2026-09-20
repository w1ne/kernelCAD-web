// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React from 'react';
import type { HistoryItem } from '../../shared/codeGeneration/codeAnalysis';
import type { SketchPlaneEntity } from '../../shared/types/plane';
import { Layers, Plane, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';
import { SceneContextMenu, SceneFeatureRow, type SceneContextMenuState } from './SceneBrowserParts';

interface SceneBrowserProps {
    items: HistoryItem[];
    planes: SketchPlaneEntity[];
    selectedItemId: string | null;
    selectedItemIds?: string[];
    hoveredItemId: string | null;
    hiddenIds: string[];
    onSelect: (item: HistoryItem) => void;
    onToggleSelection?: (id: string, multi: boolean) => void;
    onHover: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onTogglePlane: (id: string) => void;
    onSelectPlane?: (id: string) => void;
    onRename?: (oldName: string, newName: string) => void;
    onDelete?: (item: HistoryItem) => void;
}

interface SceneConstructionFolderProps {
    planes: SketchPlaneEntity[];
    selectedItemId: string | null;
    hiddenIds: string[];
    onToggleSelection?: (id: string, multi: boolean) => void;
    onSelectPlane?: (id: string) => void;
    onTogglePlane: (id: string) => void;
}

function SceneConstructionFolder({
    planes,
    selectedItemId,
    hiddenIds,
    onToggleSelection,
    onSelectPlane,
    onTogglePlane
}: SceneConstructionFolderProps): React.ReactElement {
    const [constructionOpen, setConstructionOpen] = React.useState(true);

    return (
        <div className="bg-[#1a1a1a]">
            <button
                onClick={() => setConstructionOpen(!constructionOpen)}
                className="w-full px-3 py-2 flex items-center gap-2 text-gray-400 hover:text-white uppercase tracking-wider font-semibold border-b border-[#333]"
            >
                {constructionOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Plane size={12} />
                Construction
            </button>
            {constructionOpen && (
                <div className="py-1">
                    {planes.map((plane) => {
                        const isHidden = hiddenIds.includes(plane.id);
                        return (
                            <div
                                key={plane.id}
                                data-testid={`scene-item-${plane.id}`}
                                onClick={() => {
                                    if (onToggleSelection) {
                                        onToggleSelection(plane.id, false);
                                    } else if (onSelectPlane) {
                                        onSelectPlane(plane.id);
                                    }
                                }}
                                className={`w-full flex items-center gap-2 px-6 py-2 text-gray-300 hover:bg-[#222] group transition-colors cursor-pointer ${selectedItemId === plane.id ? 'bg-selection-blue/20 text-white border-l-2 border-selection-blue' : ''}`}
                            >
                                <Plane size={14} className="text-gray-500" />
                                <span className={`font-sans truncate ${isHidden ? 'text-gray-600 italic' : ''}`}>{plane.name}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePlane(plane.id);
                                    }}
                                    data-testid={`visibility-toggle-${plane.id}`}
                                    className={`ml-auto ${isHidden ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} p-1 hover:bg-[#333] rounded transition-all`}
                                    title={isHidden ? "Show Plane" : "Hide Plane"}
                                >
                                    {isHidden ? <EyeOff size={12} className="text-gray-600" /> : <Eye size={12} className="text-blue-400" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface SceneFeaturesFolderProps {
    items: HistoryItem[];
    selectedItemId: string | null;
    selectedItemIds?: string[];
    hoveredItemId: string | null;
    hiddenIds: string[];
    onSelect: (item: HistoryItem) => void;
    onToggleSelection?: (id: string, multi: boolean) => void;
    onHover: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, item: HistoryItem) => void;
}

function SceneFeaturesFolder({
    items,
    selectedItemId,
    selectedItemIds,
    hoveredItemId,
    hiddenIds,
    onSelect,
    onToggleSelection,
    onHover,
    onToggleVisibility,
    onContextMenu
}: SceneFeaturesFolderProps): React.ReactElement {
    const [featuresOpen, setFeaturesOpen] = React.useState(true);

    return (
        <div className="bg-[#1a1a1a] border-t border-[#333]">
            <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className="w-full px-3 py-2 flex items-center gap-2 text-gray-400 hover:text-white uppercase tracking-wider font-semibold border-b border-[#333]"
            >
                {featuresOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Layers size={12} />
                Features
            </button>
            {featuresOpen && (
                <div className="py-1">
                    {items.length === 0 ? (
                        <div className="px-6 py-4 text-gray-500 italic">No operations yet.</div>
                    ) : (
                        items.map((item, idx) => {
                            const isSelected = selectedItemIds
                                ? selectedItemIds.includes(item.id)
                                : selectedItemId === item.id;
                            const isHovered = hoveredItemId === item.id;
                            const isHidden = hiddenIds.includes(item.name);
                            return (
                                <SceneFeatureRow
                                    key={item.id ?? `${item.name}-${idx}`}
                                    item={item}
                                    idx={idx}
                                    isSelected={isSelected}
                                    isHovered={isHovered}
                                    isHidden={isHidden}
                                    onSelect={onSelect}
                                    onHover={onHover}
                                    onToggleVisibility={onToggleVisibility}
                                    onToggleSelection={onToggleSelection}
                                    onContextMenu={onContextMenu}
                                />
                            );
                        }
                        ))}
                </div>
            )}
        </div>
    );
}

const SceneBrowser: React.FC<SceneBrowserProps> = ({
    items,
    planes,
    selectedItemId,
    selectedItemIds,
    hoveredItemId,
    hiddenIds,
    onSelect,
    onToggleSelection,
    onHover,
    onToggleVisibility,
    onTogglePlane,
    onSelectPlane,
    onRename,
    onDelete
}) => {
    const [contextMenu, setContextMenu] = React.useState<SceneContextMenuState | null>(null);

    const handleContextMenu = (e: React.MouseEvent, item: HistoryItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    React.useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="flex flex-col w-full text-xs relative">
            <SceneContextMenu
                contextMenu={contextMenu}
                items={items}
                hiddenIds={hiddenIds}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
                onRename={onRename}
                onClose={() => setContextMenu(null)}
            />

            {/* Construction / Origin Folder */}
            <SceneConstructionFolder
                planes={planes}
                selectedItemId={selectedItemId}
                hiddenIds={hiddenIds}
                onToggleSelection={onToggleSelection}
                onSelectPlane={onSelectPlane}
                onTogglePlane={onTogglePlane}
            />

            {/* Features Folder — the construction operations (box, fillet, extrude, …) */}
            <SceneFeaturesFolder
                items={items}
                selectedItemId={selectedItemId}
                selectedItemIds={selectedItemIds}
                hoveredItemId={hoveredItemId}
                hiddenIds={hiddenIds}
                onSelect={onSelect}
                onToggleSelection={onToggleSelection}
                onHover={onHover}
                onToggleVisibility={onToggleVisibility}
                onContextMenu={handleContextMenu}
            />
        </div>
    );
};

export default SceneBrowser;
