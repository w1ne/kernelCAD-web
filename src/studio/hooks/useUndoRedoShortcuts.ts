// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useMemo } from 'react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface UndoRedoStack {
    undo: () => void;
    redo: () => void;
}

/**
 * Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo on the workbench
 * command stack (the header Undo/Redo buttons' stack), outside text inputs.
 * Inside the code editor, the editor keeps its own undo.
 */
export function useUndoRedoShortcuts(commandManager: UndoRedoStack): void {
    const shortcuts = useMemo(() => ({
        'mod+z': () => commandManager.undo(),
        'mod+shift+z': () => commandManager.redo(),
        'mod+y': () => commandManager.redo(),
    }), [commandManager]);
    useKeyboardShortcuts(shortcuts);
}
