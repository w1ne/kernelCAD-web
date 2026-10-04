// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useIsNarrow } from './hooks/useIsNarrow';
import {
    AGENT_PANE_WIDTH,
    agentPaneWidthForKey,
    clampAgentPaneWidth,
    readStoredAgentPaneWidth,
    writeStoredAgentPaneWidth,
} from './logic/agentPaneWidth';
import { useShellStore } from './store/useShellStore';
import { StudioGenerate } from './StudioGenerate';

/**
 * Drag, arrow-key and double-click resizing for the pane's right edge.
 * The width persists per browser.
 */
function useAgentPaneResize() {
    const [width, setWidth] = useState(readStoredAgentPaneWidth);
    const [dragging, setDragging] = useState(false);
    const drag = useRef<{ x: number; width: number } | null>(null);

    const commit = (next: number) => {
        setWidth(next);
        writeStoredAgentPaneWidth(next);
    };

    const handleProps = {
        role: 'separator',
        'aria-orientation': 'vertical' as const,
        'aria-label': 'Resize agent pane',
        'aria-valuemin': AGENT_PANE_WIDTH.min,
        'aria-valuemax': AGENT_PANE_WIDTH.max,
        'aria-valuenow': width,
        tabIndex: 0,
        title: 'Drag to resize · double-click to reset',
        'data-testid': 'agent-resize-handle',
        'data-dragging': dragging,
        className:
            'focus-ring absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none transition-colors duration-80 hover:bg-agent/40 data-[dragging=true]:bg-agent/60',
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, width };
            setDragging(true);
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
            if (drag.current == null) return;
            // The pane is on the left: moving the edge right widens it.
            setWidth(clampAgentPaneWidth(drag.current.width + e.clientX - drag.current.x));
        },
        onPointerUp: () => {
            if (drag.current == null) return;
            drag.current = null;
            setDragging(false);
            writeStoredAgentPaneWidth(width);
        },
        onPointerCancel: () => {
            drag.current = null;
            setDragging(false);
        },
        onDoubleClick: () => commit(AGENT_PANE_WIDTH.default),
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
            const next = agentPaneWidthForKey(width, e.key);
            if (next == null) return;
            e.preventDefault();
            commit(next);
        },
    };

    return { width, handleProps };
}

/**
 * The agent pane: 360 px by default, resizable from its right edge on a
 * desktop, full width of its sheet on a phone. StudioGenerate holds the
 * conversation, the run progress, the proposed change and the composer.
 *
 * External-agent MCP onboarding lives on /connect and in the activity bar.
 */
export const AgentRail: React.FC = () => {
    const { agentRailOpen } = useShellStore();
    const narrow = useIsNarrow();
    const { width, handleProps } = useAgentPaneResize();
    const shownWidth = !agentRailOpen ? 0 : narrow ? '100%' : width;

    return (
        <aside
            aria-label="Agent rail"
            aria-hidden={!agentRailOpen}
            data-open={agentRailOpen}
            style={{ width: shownWidth }}
            className="relative flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden bg-surface-1 text-fg"
        >
            <StudioGenerate />
            {agentRailOpen && !narrow && <div {...handleProps} />}
        </aside>
    );
};

export default AgentRail;
