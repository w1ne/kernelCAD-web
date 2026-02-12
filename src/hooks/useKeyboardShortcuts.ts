import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
    [key: string]: KeyHandler;
}

function isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    // Monaco and similar editors often use div-based textboxes.
    if (el.getAttribute('role') === 'textbox') return true;
    if (el.closest('.monaco-editor')) return true;
    return false;
}

function normalizeKey(e: KeyboardEvent): string {
    const key = e.key.toLowerCase();
    const parts: string[] = [];
    const hasMod = e.metaKey || e.ctrlKey;
    if (hasMod) parts.push('mod');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(key);
    return parts.join('+');
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            const key = e.key.toLowerCase();
            const combo = normalizeKey(e);

            // Don't trigger shortcuts while typing in inputs/editor, but always allow Escape.
            if (key !== 'escape' && (isTypingTarget(e.target) || isTypingTarget(document.activeElement))) return;

            const handler = shortcuts[combo] ?? shortcuts[key];
            if (handler) {
                e.preventDefault();
                e.stopPropagation();
                // Prevent downstream handlers (including editors) from also processing the key.
                if (typeof e.stopImmediatePropagation === 'function') {
                    e.stopImmediatePropagation();
                }
                handler(e);
            }
        };

        // Capture phase lets us consume app shortcuts before nested widgets.
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [shortcuts]);
}
