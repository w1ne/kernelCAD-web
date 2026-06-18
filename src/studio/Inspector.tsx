// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { TabId } from './types';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useShellStore } from './store/useShellStore';
import { getVisibleTabs } from './logic/adaptiveTabs';
import { InspectorTabs } from './InspectorTabs';

interface InspectorProps {
    readonly tabSlots: Partial<Record<TabId, ReactNode>>;
}

export function Inspector({ tabSlots }: InspectorProps) {
    const result = useRecomputeResult();
    const { inspectorOpen } = useShellStore();
    const visibleTabs = getVisibleTabs(result);

    const [activeTab, setActiveTab] = useState<TabId>('scene');

    // Derive the effective tab in render rather than syncing via useEffect —
    // setState-in-effect causes cascading renders and is lint-blocked
    // (react-hooks/set-state-in-effect). If the requested activeTab isn't
    // in the visible set, we render the scene fallback; the next user
    // click on a real tab updates activeTab cleanly.
    const effectiveTab: TabId = visibleTabs.includes(activeTab) ? activeTab : 'scene';

    return (
        // Width collapses to 0 when hidden (mirrors AgentRail) so the
        // viewport reclaims the space without unmounting tab state.
        <div
            className="flex flex-col shrink-0 overflow-hidden bg-[#111] border-l border-[#333] text-gray-300"
            style={{ width: inspectorOpen ? 290 : 0 }}
            aria-hidden={!inspectorOpen}
            data-open={inspectorOpen}
            data-testid="inspector"
        >
            <InspectorTabs
                tabs={visibleTabs}
                activeTab={effectiveTab}
                onSelectTab={setActiveTab}
            />
            <div className="flex-1 overflow-auto" data-testid="inspector-body">
                {tabSlots[effectiveTab] ?? null}
            </div>
        </div>
    );
}
