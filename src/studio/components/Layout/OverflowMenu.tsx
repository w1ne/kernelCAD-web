// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface OverflowMenuProps {
    /** Accessible name for the trigger, e.g. "View and file controls". */
    label: string;
    /** Menu body. Rendered as-is inside the dropdown panel. */
    children: ReactNode;
    /** Which trigger edge the panel lines up with. Default 'right'. */
    align?: 'left' | 'right';
    testId?: string;
}

/**
 * Narrow-viewport overflow menu for the chrome bars.
 *
 * The Header and Toolbar are `bar-scroll-x` containers (overflow-x:auto →
 * overflow-y:hidden), which would CLIP an in-flow dropdown to the 32-40px bar
 * height. So the panel is rendered into a portal on <body> with fixed
 * positioning, anchored under the trigger — the same escape hatch `UserMenu`
 * already uses for the account dropdown.
 *
 * The panel stays open while controls inside it are used (most are toggles
 * whose effect is visible in the viewport behind); it closes on outside click,
 * Escape, or a second press of the trigger.
 */
export function OverflowMenu({ label, children, align = 'right', testId }: OverflowMenuProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<{ top: number; left?: number; right?: number } | null>(null);

    const positionPanel = useCallback(() => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (!r) return;
        setAnchor(
            align === 'left'
                ? { top: r.bottom + 4, left: Math.max(4, r.left) }
                : { top: r.bottom + 4, right: Math.max(4, window.innerWidth - r.right) },
        );
    }, [align]);

    // Anchor up-front in the click handler (not in an effect) so the panel
    // never paints at a stale position.
    const toggleOpen = () => {
        if (!open) positionPanel();
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const reposition = () => positionPanel();
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [open, positionPanel]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                title={label}
                data-testid={testId}
                className={`shrink-0 p-1.5 rounded transition-colors ${
                    open ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'
                }`}
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open &&
                anchor &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="menu"
                        aria-label={label}
                        data-testid={testId ? `${testId}-panel` : undefined}
                        style={{ top: anchor.top, left: anchor.left, right: anchor.right }}
                        className="fixed z-[60] max-w-[calc(100vw-8px)] max-h-[70vh] overflow-y-auto rounded border border-[#333] bg-[#1a1a1a] shadow-xl p-2"
                    >
                        {children}
                    </div>,
                    document.body,
                )}
        </>
    );
}
