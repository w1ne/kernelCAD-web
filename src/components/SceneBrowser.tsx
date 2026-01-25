import React from 'react';
import type { VariableDefinition } from '../lib/codeAnalysis';
import { Box, Cylinder, Layers, Scissors, Divide, Circle, Square, MousePointer2 } from 'lucide-react';

interface SceneBrowserProps {
    items: VariableDefinition[];
    onSelect: (item: VariableDefinition) => void;
}

const getIconForType = (type: string) => {
    switch (type) {
        case 'Box': return <Box size={14} className="text-blue-400" />;
        case 'Cylinder': return <Cylinder size={14} className="text-green-400" />;
        case 'Sphere': return <Circle size={14} className="text-yellow-400" />;
        case 'Fillet':
        case 'Chamfer': return <Scissors size={14} className="text-purple-400" />;
        case 'Cut':
        case 'Union': return <Divide size={14} className="text-red-400" />;
        case 'Sketch': return <Square size={14} className="text-gray-400" />;
        default: return <Layers size={14} className="text-gray-500" />;
    }
};

const SceneBrowser: React.FC<SceneBrowserProps> = ({ items, onSelect }) => {
    if (items.length === 0) {
        return (
            <div className="p-4 text-xs text-gray-500 text-center italic">
                No objects found.
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#333] flex items-center gap-2">
                <Layers size={12} />
                Browser
            </div>
            <div className="flex-1 overflow-y-auto">
                {items.map((item, idx) => (
                    <button
                        key={`${item.name}-${idx}`}
                        onClick={() => onSelect(item)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-[#222] hover:text-white transition-colors text-left group"
                    >
                        {getIconForType(item.type)}
                        <span className="font-mono">{item.name}</span>
                        <span className="ml-auto opacity-0 group-hover:opacity-100 text-gray-500 text-[10px]">
                            L{item.line}
                        </span>
                        <MousePointer2 size={10} className="opacity-0 group-hover:opacity-50" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SceneBrowser;
