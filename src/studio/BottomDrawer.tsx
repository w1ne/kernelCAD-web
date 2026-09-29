// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useShellStore } from './store/useShellStore';
import { ValidityDeltaHeader } from './ValidityDeltaHeader';
import { DiagnosticRow } from './DiagnosticRow';
import { IconButton } from '../ui/IconButton';
import { SheetHandle } from '../ui/Sheet';
import { DEFAULT_SNAPS } from '../ui/sheetModel';
import { cx } from '../ui/cx';

const STORAGE_KEY_DRAWER_COLLAPSED = 'kernelcad:validityDrawerCollapsed';

function readStoredCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY_DRAWER_COLLAPSED) === 'true';
}

/**
 * Bottom drawer. Open-state is derived from `currentValidity.status`:
 * any non-solved status with a non-null result opens it. Closed when
 * validity is null or status === 'solved'.
 *
 * The drawer can be collapsed to its slim header bar (status chip + delta
 * text stay visible; the diagnostics list is hidden). Collapse preference
 * persists across reloads via localStorage.
 */
export const BottomDrawer: React.FC = () => {
    const { currentValidity, previousValidity } = useShellStore();
    const [collapsed, setCollapsed] = useState<boolean>(() => readStoredCollapsed());

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY_DRAWER_COLLAPSED, String(collapsed));
    }, [collapsed]);

    const isOpen = currentValidity != null && currentValidity.status !== 'solved';
    if (!isOpen || !currentValidity) return null;

    return (
        <section
            aria-label="Validity drawer"
            data-open="true"
            data-collapsed={collapsed ? 'true' : 'false'}
            className="flex-shrink-0 bg-[#181818] border-t border-[#2d2d2d] text-gray-200 flex flex-col"
            style={collapsed ? undefined : { height: '25vh' }}
        >
            <ValidityDeltaHeader
                prev={previousValidity}
                curr={currentValidity}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed((prev) => !prev)}
            />
            {!collapsed && (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {currentValidity.diagnostics.map((d, i) => (
                        <DiagnosticRow key={`${d.code}-${i}`} diagnostic={d} />
                    ))}
                </div>
            )}
        </section>
    );
};

export interface MobileDrawerProps {
    /** The sheet title; also its accessible name. */
    readonly title: string;
    readonly onClose: () => void;
    /** Shown as a back arrow before the title (sheets opened from "More"). */
    readonly onBack?: () => void;
    readonly backLabel?: string;
    /** Index into the 25 / 55 / 90 % snap points. */
    readonly snap: number;
    readonly onSnap: (index: number) => void;
    /** The body fills the sheet and scrolls itself (the code editor). */
    readonly fill?: boolean;
    /** Tab-panel wiring from the tab bar that owns the sheet. */
    readonly panelId?: string;
    readonly labelledBy?: string;
    readonly children?: ReactNode;
}

/**
 * The phone Studio's sheet: docked between the model and the tab bar, not
 * modal. The model stays live above it and shrinks to fit, so a Params
 * change shows at once. A grab handle snaps it to 25 / 55 / 90 % of the
 * screen; Esc or the close button returns to the model.
 *
 * The height does not animate: each frame of a transition would resize the
 * WebGL canvas above.
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    title, onClose, onBack, backLabel = 'Back', snap, onSnap, fill = false, panelId, labelledBy, children,
}) => {
    const titleId = React.useId();
    const [drag, setDrag] = useState<number | null>(null);
    const fraction = drag ?? DEFAULT_SNAPS[snap];
    return (
        <section
            id={panelId}
            role={panelId ? 'tabpanel' : 'region'}
            aria-labelledby={labelledBy ? `${labelledBy} ${titleId}` : titleId}
            data-testid="mobile-drawer"
            data-snap={DEFAULT_SNAPS[snap]}
            onKeyDown={(e) => {
                if (e.key !== 'Escape' || e.defaultPrevented) return;
                e.preventDefault();
                onClose();
            }}
            // The handle measures from the bottom of the window; the tab bar
            // sits below the sheet, so take it off to keep the edge under the finger.
            style={{ height: `calc(${fraction * 100}dvh - var(--kc-tabbar-h, 0px))` }}
            className="relative flex max-h-[calc(100%-4rem)] min-h-32 shrink-0 flex-col rounded-t-sheet border-t border-border bg-surface-1 text-fg shadow-e3"
        >
            <SheetHandle snapPoints={DEFAULT_SNAPS} snap={snap} onSnap={onSnap} onDrag={setDrag} />
            <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-1">
                {onBack && (
                    <IconButton
                        label={backLabel}
                        icon={<ChevronLeft className="size-5" strokeWidth={1.75} />}
                        size="touch"
                        onClick={onBack}
                        data-testid="mobile-drawer-back"
                    />
                )}
                <h2 id={titleId} className={cx('min-w-0 flex-1 truncate text-title text-fg', !onBack && 'pl-3')}>
                    {title}
                </h2>
                <IconButton
                    label="Close"
                    shortcut={['Escape']}
                    icon={<X className="size-5" strokeWidth={1.75} />}
                    size="touch"
                    onClick={onClose}
                    data-testid="mobile-drawer-close"
                />
            </header>
            <div className={cx('min-h-0 flex-1', fill ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain')}>
                {children}
            </div>
        </section>
    );
};

export default BottomDrawer;
