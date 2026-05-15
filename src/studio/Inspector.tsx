import { useState } from 'react';
import type { ReactNode } from 'react';
import type { TabId } from './types';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { getVisibleTabs } from './logic/adaptiveTabs';
import { InspectorTabs } from './InspectorTabs';

interface InspectorProps {
    readonly tabSlots: Partial<Record<TabId, ReactNode>>;
}

export function Inspector({ tabSlots }: InspectorProps) {
    const result = useRecomputeResult();
    const visibleTabs = getVisibleTabs(result);

    const [activeTab, setActiveTab] = useState<TabId>('scene');

    // Derive the effective tab in render rather than syncing via useEffect —
    // setState-in-effect causes cascading renders and is lint-blocked
    // (react-hooks/set-state-in-effect). If the requested activeTab isn't
    // in the visible set, we render the scene fallback; the next user
    // click on a real tab updates activeTab cleanly.
    const effectiveTab: TabId = visibleTabs.includes(activeTab) ? activeTab : 'scene';

    return (
        <div
            className="flex flex-col bg-[#111] border-l border-[#333] text-gray-300"
            style={{ width: 290 }}
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
