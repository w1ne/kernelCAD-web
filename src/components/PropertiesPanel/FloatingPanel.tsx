import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';

interface FloatingPanelProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    initialPosition?: { x: number; y: number };
}

export function FloatingPanel({ title, onClose, children, initialPosition = { x: 20, y: 80 } }: FloatingPanelProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, x: initialPosition.x, y: initialPosition.y }}
                animate={{ opacity: 1, scale: 1, x: initialPosition.x, y: initialPosition.y }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                drag
                dragMomentum={false}
                role="dialog"
                aria-label={title}
                className="fixed z-40 w-80 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-md"
            >
                {/* Header / Drag Handle */}
                <div className="flex cursor-grab items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3 active:cursor-grabbing">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <GripHorizontal className="h-4 w-4 opacity-50" />
                        <h2 className="text-sm font-medium">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {children}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
