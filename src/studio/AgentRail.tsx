// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React from 'react';
import { useShellStore } from './store/useShellStore';
import { StagedEditSlot } from './StagedEditSlot';
import { StudioGenerate } from './StudioGenerate';

/**
 * Left-side rail. Width animates between 0 and 240px based on
 * `agentRailOpen` in the shell store. Two stacked panes: the in-Studio agent
 * (prompt → plan → diff/apply, verified) on top, staged-edit slot below.
 *
 * The old "Cloud MCP connector" + "Studio Agent Mode: coming later" cards were
 * removed 2026-06-28: the in-Studio agent is now live (StudioGenerate), so the
 * "coming later" copy was false; and external-agent MCP onboarding has a proper
 * home on the /connect route (claude/codex/cursor install via http transport).
 */
export const AgentRail: React.FC = () => {
    const { agentRailOpen } = useShellStore();

    return (
        <aside
            aria-label="Agent rail"
            aria-hidden={!agentRailOpen}
            data-open={agentRailOpen}
            style={{ width: agentRailOpen ? 240 : 0 }}
            className="h-full flex-shrink-0 overflow-hidden bg-[#1a1a1a] border-r border-[#2d2d2d] text-gray-200 text-xs flex flex-col"
        >
            <div className="flex-shrink-0 border-b border-[#2d2d2d]">
                <StudioGenerate />
            </div>
            <div className="flex-1 min-h-0">
                <StagedEditSlot />
            </div>
        </aside>
    );
};

export default AgentRail;
