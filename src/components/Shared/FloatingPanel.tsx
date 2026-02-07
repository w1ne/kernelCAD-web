import React from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';

interface FloatingPanelProps {
    id: string;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
}

export function FloatingPanel({ id, title, children, onClose, initialPosition = { x: 100, y: 100 } }: FloatingPanelProps) {
    const controls = useDragControls();

    return (
        <motion.div
            role="dialog"
            data-testid={`panel-${id}`}
            aria-label={title}
            aria-labelledby={`panel-title-${id}`}
            drag
            dragMomentum={false}
            dragListener={false}
            dragControls={controls}
            initial={{ opacity: 0, scale: 0.9, x: initialPosition.x, y: initialPosition.y }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
                position: 'fixed',
                zIndex: 40,
            }}
            className="w-[320px] bg-[#1a1a1a]/95 border border-[#333] rounded-lg shadow-2xl overflow-hidden backdrop-blur-md"
        >
            {/* Header / Drag Handle */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-[#252525] border-b border-[#333] cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => controls.start(e)}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                    <span
                        id={`panel-title-${id}`}
                        className="text-xs font-semibold text-zinc-300 tracking-wider select-none"
                    >
                        {title}
                    </span>
                    <span className="sr-only">Panel ID: {id}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-[#333] rounded-md transition-colors text-zinc-500 hover:text-white"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </motion.div>
    );
}
