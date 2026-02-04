import React from 'react';
import type { VariableDefinition } from '../lib/codeAnalysis';
import type { SketchPlaneEntity } from '../types/plane';
import { Box, Cylinder, Layers, SquaresSubtract, SquaresUnite, SquaresIntersect, SquareRoundCorner, Circle, Square, MousePointer2, Plane, Eye, EyeOff, ChevronRight, ChevronDown, SquareArrowUp, Rotate3D } from 'lucide-react';
import { ChamferIcon } from '../icons/cad';

interface SceneBrowserProps {
    items: VariableDefinition[];
    planes: SketchPlaneEntity[];
    onSelect: (item: VariableDefinition) => void;
    onTogglePlane: (id: string) => void;
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

const SceneBrowser: React.FC<SceneBrowserProps> = ({ items, planes, onSelect, onTogglePlane }) => {
    const [constructionOpen, setConstructionOpen] = React.useState(true);
    const [historyOpen, setHistoryOpen] = React.useState(true);

    return (
        <div className="flex flex-col w-full text-xs">
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
                        {planes.map((plane) => (
                            <div
                                key={plane.id}
                                className="w-full flex items-center gap-2 px-6 py-2 text-gray-300 hover:bg-[#222] group transition-colors"
                            >
                                <Plane size={14} className="text-gray-500" />
                                <span className="font-sans truncate">{plane.name}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePlane(plane.id);
                                    }}
                                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-[#333] rounded transition-all"
                                    title={plane.visible ? "Hide Plane" : "Show Plane"}
                                >
                                    {plane.visible ? <Eye size={12} className="text-blue-400" /> : <EyeOff size={12} className="text-gray-600" />}
                                </button>
                            </div>
                        ))}
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
                            items.map((item, idx) => (
                                <button
                                    key={`${item.name}-${idx}`}
                                    onClick={() => onSelect(item)}
                                    className="w-full flex items-center gap-2 px-6 py-2 text-gray-300 hover:bg-[#222] hover:text-white transition-colors text-left group"
                                >
                                    {getIconForType(item.type)}
                                    <span className="font-mono">{item.name}</span>
                                    {item.detail && (
                                        <span className="ml-2 text-[10px] px-1 bg-[#333] rounded text-gray-400 font-mono">
                                            {item.detail}
                                        </span>
                                    )}
                                    <span className="ml-auto opacity-0 group-hover:opacity-100 text-gray-500 text-[10px]">
                                        L{item.line}
                                    </span>
                                    <MousePointer2 size={10} className="opacity-0 group-hover:opacity-50 ml-1" />
                                </button>
                            )
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SceneBrowser;
