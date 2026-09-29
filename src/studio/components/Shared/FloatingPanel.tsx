// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';

interface FloatingPanelProps {
    id: string;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    /** Tailwind width class for the panel shell. */
    widthClassName?: string;
}

export function FloatingPanel({
    id,
    title,
    children,
    onClose,
    initialPosition = { x: 100, y: 100 },
    widthClassName = 'w-[320px]',
}: FloatingPanelProps) {
    const controls = useDragControls();

    // Keep at least the header reachable: the drag offset may not push the
    // panel's top edge past the viewport edges (margin 8px), and a 140px-wide
    // sliver must stay on-screen horizontally. Static at mount — good enough
    // for a tool panel.
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const dragConstraints = {
        left: -initialPosition.x + 8,
        top: -initialPosition.y + 8,
        right: Math.max(0, viewportW - initialPosition.x - 140),
        bottom: Math.max(0, viewportH - initialPosition.y - 48),
    };

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
            dragConstraints={dragConstraints}
            dragElastic={0}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
                position: 'fixed',
                top: initialPosition.y,
                left: initialPosition.x,
                zIndex: 40,
            }}
            className={`${widthClassName} bg-surface-2/95 border border-border rounded-lg shadow-2xl overflow-hidden backdrop-blur-md`}
        >
            {/* Header / Drag Handle */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-surface-3 border-b border-border cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => controls.start(e)}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-fg-3" />
                    <span
                        id={`panel-title-${id}`}
                        className="text-xs font-semibold text-fg tracking-wider select-none"
                    >
                        {title}
                    </span>
                    <span className="sr-only">Panel ID: {id}</span>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close panel"
                    className="p-1 hover:bg-surface-3 rounded-md transition-colors text-fg-3 hover:text-white"
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
