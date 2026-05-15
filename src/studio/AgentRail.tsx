import React from 'react';
import { useShellStore } from './store/useShellStore';
import { StagedEditSlot } from './StagedEditSlot';
import { AgentActivityLog } from './AgentActivityLog';

/**
 * Right-side rail. Width animates between 0 and 240px based on
 * `agentRailOpen` in the shell store. Two stacked panes: staged-edit slot
 * on top, agent activity log below.
 */
export const AgentRail: React.FC = () => {
    const { agentRailOpen } = useShellStore();

    return (
        <aside
            aria-label="Agent rail"
            aria-hidden={!agentRailOpen}
            data-open={agentRailOpen}
            style={{ width: agentRailOpen ? 240 : 0 }}
            className="h-full flex-shrink-0 overflow-hidden bg-[#1a1a1a] border-l border-[#2d2d2d] text-gray-200 text-xs flex flex-col"
        >
            <div className="flex-shrink-0 border-b border-[#2d2d2d]">
                <StagedEditSlot />
            </div>
            <div className="flex-1 min-h-0">
                <AgentActivityLog />
            </div>
        </aside>
    );
};

export default AgentRail;
