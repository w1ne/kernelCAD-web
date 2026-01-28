import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
    [key: string]: KeyHandler;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input, textarea, or contentEditable element
            const target = e.target as HTMLElement;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Check if we are inside the Monaco editor (it usually handles its own keys, but just in case)
            // Monaco editor usually has class 'monaco-editor' or is inside one.
            // But checking target.closest might be slow on every keydown? It's fine for UI events.
            const isMonaco = target.closest('.monaco-editor');

            // If we are in an input context, we generally want to ignore single-letter shortcuts (like 's' for sketch)
            // But we might want to allow 'Escape' to close dialogs even if focused in an input.
            if ((isInput || isMonaco) && e.key !== 'Escape') {
                return;
            }

            const key = e.key.toLowerCase();
            const handler = shortcuts[key];

            if (handler) {
                // e.preventDefault(); // Optional: decide per handler?
                handler(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
