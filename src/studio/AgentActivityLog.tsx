import React from 'react';

/**
 * Subscribes to the agent event stream when one exists. The current
 * `AgentAPI` is a synchronous command dispatcher with no event emitter,
 * so v1 renders the offline/empty state. Slice 1.5 lights this up when
 * the MCP event channel ships.
 */
export const AgentActivityLog: React.FC = () => {
    return (
        <div className="h-full p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">
                Agent activity
            </div>
            <div className="text-xs text-gray-500 italic">
                Agent offline · MCP not connected
            </div>
            <div className="text-[11px] text-gray-600 leading-snug">
                Agent activity will appear here when MCP connects.
            </div>
        </div>
    );
};

export default AgentActivityLog;
