// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useRef, useState } from 'react';
import type { JSX, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { TabPanel } from '../ui';
import type { TabId } from './types';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useShellStore } from './store/useShellStore';
import { DEFAULT_INSPECTOR_TAB, INSPECTOR_TABS_ID, getVisibleTabs } from './logic/adaptiveTabs';
import { checksBadgeCount } from './logic/checksModel';
import {
    INSPECTOR_WIDTH,
    clampInspectorWidth,
    inspectorWidthForKey,
    readStoredInspectorWidth,
    writeStoredInspectorWidth,
} from './logic/inspectorWidth';
import { InspectorTabs } from './InspectorTabs';

interface InspectorProps {
    readonly tabSlots: Partial<Record<TabId, ReactNode>>;
}

export function Inspector({ tabSlots }: InspectorProps): JSX.Element {
    const result = useRecomputeResult();
    const { inspectorOpen } = useShellStore();
    const visibleTabs = getVisibleTabs(result);

    const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_INSPECTOR_TAB);
    const { width, dragging, handleProps } = useInspectorResize();

    // Derive the effective tab in render rather than syncing via useEffect —
    // setState-in-effect causes cascading renders and is lint-blocked
    // (react-hooks/set-state-in-effect). If the requested tab left the
    // visible set, the Code tab shows; picking the tab again works as usual.
    const effectiveTab: TabId = visibleTabs.includes(activeTab) ? activeTab : DEFAULT_INSPECTOR_TAB;

    return (
        // Width collapses to 0 when hidden (mirrors AgentRail) so the
        // viewport reclaims the space without unmounting tab state.
        <div
            data-theme="dark"
            className="relative flex shrink-0 flex-col overflow-hidden border-l border-border bg-surface-1 text-fg"
            style={{
                width: inspectorOpen ? width : 0,
                transition: dragging ? 'none' : 'width 160ms ease-out',
            }}
            aria-hidden={!inspectorOpen}
            data-open={inspectorOpen}
            data-testid="inspector"
        >
            {inspectorOpen && <div {...handleProps} />}
            {/* A fixed inner width keeps the content from reflowing while the panel animates. */}
            <div className="flex min-h-0 flex-1 flex-col" style={{ width }}>
                <InspectorTabs
                    tabs={visibleTabs}
                    activeTab={effectiveTab}
                    onSelectTab={setActiveTab}
                    counts={{ validity: checksBadgeCount(result) }}
                    width={width}
                />
                <div className="min-h-0 flex-1 overflow-auto" data-testid="inspector-body">
                    <TabPanel tabsId={INSPECTOR_TABS_ID} id={effectiveTab} value={effectiveTab} className="h-full">
                        {tabSlots[effectiveTab] ?? null}
                    </TabPanel>
                </div>
            </div>
        </div>
    );
}

/**
 * Drag, arrow-key and double-click resizing for the inspector's left edge.
 * The width persists per browser.
 */
function useInspectorResize() {
    const [width, setWidth] = useState(readStoredInspectorWidth);
    const [dragging, setDragging] = useState(false);
    const drag = useRef<{ x: number; width: number } | null>(null);

    const commit = (next: number) => {
        setWidth(next);
        writeStoredInspectorWidth(next);
    };

    const handleProps = {
        role: 'separator',
        'aria-orientation': 'vertical' as const,
        'aria-label': 'Resize inspector',
        'aria-valuemin': INSPECTOR_WIDTH.min,
        'aria-valuemax': INSPECTOR_WIDTH.max,
        'aria-valuenow': width,
        tabIndex: 0,
        title: 'Drag to resize · double-click to reset',
        'data-testid': 'inspector-resize-handle',
        className:
            'focus-ring absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize touch-none transition-colors duration-80 hover:bg-accent/40 data-[dragging=true]:bg-accent/60',
        'data-dragging': dragging,
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, width };
            setDragging(true);
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
            if (drag.current == null) return;
            // The panel is on the right: moving the edge left widens it.
            setWidth(clampInspectorWidth(drag.current.width + drag.current.x - e.clientX));
        },
        onPointerUp: () => {
            if (drag.current == null) return;
            drag.current = null;
            setDragging(false);
            writeStoredInspectorWidth(width);
        },
        onPointerCancel: () => {
            drag.current = null;
            setDragging(false);
        },
        onDoubleClick: () => commit(INSPECTOR_WIDTH.default),
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
            const next = inspectorWidthForKey(width, e.key);
            if (next == null) return;
            e.preventDefault();
            commit(next);
        },
    };

    return { width, dragging, handleProps };
}
