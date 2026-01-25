import React from 'react';
import { Box, Cylinder, Scissors, LayoutTemplate, PenTool } from 'lucide-react';



interface ToolbarProps {
    onToolClick: (toolId: string, isDialog?: boolean) => void;
}

export default function Toolbar({ onToolClick }: ToolbarProps) {
    return (
        <div className="flex flex-col gap-2 p-2 bg-[#111] border-r border-[#333] w-14 items-center">
            <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Add</span>
            <button
                onClick={() => onToolClick('BOX', true)}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title="Add Box"
            >
                <Box size={20} />
            </button>
            <button
                onClick={() => onToolClick('CYLINDER', true)}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title="Add Cylinder"
            >
                <Cylinder size={20} />
            </button>
            <div className="w-full h-px bg-[#333] my-1" />
            <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Mod</span>
            <button
                onClick={() => onToolClick('.fillet(1)', false)}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title="Fillet"
            >
                <LayoutTemplate size={20} />
            </button>
            <button
                onClick={() => onToolClick('.chamfer(1)', false)}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title="Chamfer"
            >
                <PenTool size={20} />
            </button>
            <button
                onClick={() => onToolClick('.cut(other)', false)}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title="Cut"
            >
                <Scissors size={20} />
            </button>
        </div>
    );
}
