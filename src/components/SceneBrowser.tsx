import React from 'react';
import type { HistoryItem } from '../lib/codeAnalysis';
import type { SketchPlaneEntity } from '../types/plane';
import { Box, Cylinder, Layers, SquaresSubtract, SquaresUnite, SquaresIntersect, SquareRoundCorner, Circle, Square, Plane, Eye, EyeOff, ChevronRight, ChevronDown, SquareArrowUp, Rotate3D } from 'lucide-react';
import { ChamferIcon } from '../icons/cad';

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

const getIconForType = (type: string) => {
    switch (type) {
        case 'Box': return <Box size={14} className="text-blue-400" />;
        case 'Cylinder': return <Cylinder size={14} className="text-green-400" />;
        case 'Sphere': return <Circle size={14} className="text-yellow-400" />;
        case 'Fillet': return <SquareRoundCorner size={14} className="text-purple-400" />;
        case 'Chamfer': return <ChamferIcon size={14} className="text-purple-400" />;
        case 'Cut': return <SquaresSubtract size={14} className="text-red-400" />;
        case 'Union': return <SquaresUnite size={14} className="text-red-400" />;
        case 'Intersect': return <SquaresIntersect size={14} className="text-red-400" />;
        case 'Extrude': return <SquareArrowUp size={14} className="text-cyan-400" />;
        case 'Revolve': return <Rotate3D size={14} className="text-cyan-400" />;
        case 'Sketch': return <Square size={14} className="text-gray-400" />;
        default: return <Layers size={14} className="text-gray-500" />;
    }
};

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
    const [constructionOpen, setConstructionOpen] = React.useState(true);
    const [historyOpen, setHistoryOpen] = React.useState(true);

    const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, item: HistoryItem } | null>(null);

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
            {/* Context Menu Overlay */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-[#222] border border-[#444] rounded shadow-xl py-1 min-w-[120px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            onDelete?.(contextMenu.item);
                            setContextMenu(null);
                        }}
                    >
                        Delete
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            onToggleVisibility(contextMenu.item.name);
                            // Plus hide others... (Isolate logic)
                            items.forEach(it => {
                                if (it.name !== contextMenu.item.name && !hiddenIds.includes(it.name)) {
                                    onToggleVisibility(it.name);
                                }
                            });
                            setContextMenu(null);
                        }}
                    >
                        Isolate
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            // Show all hidden items
                            hiddenIds.forEach(id => {
                                onToggleVisibility(id);
                            });
                            setContextMenu(null);
                        }}
                    >
                        Show All
                    </button>
                    <div className="border-t border-[#444] my-1"></div>
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            const newName = window.prompt("Rename variable:", contextMenu.item.name);
                            if (newName && newName !== contextMenu.item.name && onRename) {
                                onRename(contextMenu.item.name, newName);
                            }
                            setContextMenu(null);
                        }}
                    >
                        Rename...
                    </button>
                </div>
            )}

            {/* Construction / Origin Folder */}
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

            {/* History Folder */}
            <div className="bg-[#1a1a1a] border-t border-[#333]">
                <button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-gray-400 hover:text-white uppercase tracking-wider font-semibold border-b border-[#333]"
                >
                    {historyOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Layers size={12} />
                    History
                </button>
                {historyOpen && (
                    <div className="py-1">
                        {items.length === 0 ? (
                            <div className="px-6 py-4 text-gray-500 italic">No operations yet.</div>
                        ) : (
                            items.map((item, idx) => {
                                const isSelected = selectedItemIds ? selectedItemIds.includes(item.name) : selectedItemId === item.name;
                                const isHovered = hoveredItemId === item.name;
                                const isHidden = hiddenIds.includes(item.name);
                                return (
                                    <div
                                        key={item.id ?? `${item.name}-${idx}`}
                                        data-testid={`scene-item-${item.id ?? item.name}`}
                                        onClick={(e) => {
                                            if (onToggleSelection && (e.metaKey || e.ctrlKey || e.shiftKey)) {
                                                onToggleSelection(item.name, true);
                                            } else {
                                                onSelect(item);
                                            }
                                        }}
                                        onMouseEnter={() => onHover(item.name)}
                                        onMouseLeave={() => onHover(null)}
                                        onContextMenu={(e) => handleContextMenu(e, item)}
                                        className={`w-full flex items-center gap-2 px-6 py-2 text-gray-300 hover:bg-[#222] hover:text-white transition-colors text-left group cursor-pointer ${isSelected ? 'bg-selection-blue/20 text-white border-l-2 border-selection-blue' : isHovered ? 'bg-[#333] text-white' : ''}`}
                                    >
                                        {getIconForType(item.type)}
                                        <span className={`font-mono ${isHidden ? 'text-gray-600 italic' : ''} ${isHovered ? 'underline decoration-blue-500/50' : ''}`}>{item.name}</span>
                                        {item.detail && (
                                            <span className="ml-2 text-[10px] px-1 bg-[#444] rounded text-gray-400 font-mono">
                                                {item.detail}
                                            </span>
                                        )}
                                        <div className="ml-auto flex items-center gap-1">
                                            <span className="opacity-0 group-hover:opacity-100 text-gray-500 text-[10px]">
                                                L{item.line}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleVisibility(item.name);
                                                }}
                                                className={`p-1 hover:bg-[#444] rounded transition-all ${isHidden ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
                                                title={isHidden ? "Show Operation" : "Hide Operation"}
                                            >
                                                {isHidden ? <EyeOff size={12} className="text-gray-600" /> : <Eye size={12} className="text-blue-400" />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SceneBrowser;
