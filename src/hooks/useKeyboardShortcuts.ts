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
    return tag === 'input' || tag === 'textarea' || tag === 'select';
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
                handler(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
