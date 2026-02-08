import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Circle, Square, Triangle } from 'lucide-react';

interface ContextToolbarProps {
    visible: boolean;
    position: { x: number, y: number } | null;
    type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH';
    onAction: (actionId: string) => void;
}

export function ContextToolbar({ visible, position, type, onAction }: ContextToolbarProps) {
    const actions = useMemo(() => {
        const baseActions = [
            { id: 'extrude', label: 'Extrude', icon: <Box size={16} />, shortcut: 'E' },
        ];

        if (type === 'FACE') {
            return [
                ...baseActions,
                { id: 'sketchOnFace', label: 'Sketch on Face', icon: <Square size={16} />, shortcut: 'S' },
                { id: 'revolve', label: 'Revolve', icon: <Circle size={16} />, shortcut: 'R' },
            ];
        }

        if (type === 'EDGE') {
            return [
                { id: 'fillet', label: 'Fillet', icon: <Circle size={16} />, shortcut: 'F' },
                { id: 'chamfer', label: 'Chamfer', icon: <Triangle size={16} />, shortcut: 'C' },
            ];
        }

        if (type === 'SKETCH') {
            return [
                { id: 'extrude', label: 'Extrude Sketch', icon: <Box size={16} />, shortcut: 'E' },
                { id: 'revolve', label: 'Revolve Sketch', icon: <Circle size={16} />, shortcut: 'R' },
            ];
        }

        return baseActions;
    }, [type]);

    if (!visible || !position) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                style={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -120%)',
                    zIndex: 100,
                }}
                className="flex items-center gap-1 p-1 bg-zinc-900/90 border border-white/10 rounded-lg shadow-2xl backdrop-blur-xl pointer-events-auto"
            >
                {actions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => onAction(action.id)}
                        title={`${action.label} (${action.shortcut})`}
                        className="group relative flex items-center justify-center w-9 h-9 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        {action.icon}
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {action.label} <span className="text-zinc-500 ml-1">{action.shortcut}</span>
                        </span>
                    </button>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}
