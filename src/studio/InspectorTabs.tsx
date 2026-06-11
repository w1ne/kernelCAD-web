// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { TabId } from './types';

interface InspectorTabsProps {
    readonly tabs: readonly TabId[];
    readonly activeTab: TabId;
    readonly onSelectTab: (id: TabId) => void;
}

const ALL_TABS: readonly TabId[] = [
    'scene',
    'code',
    'params',
    'validity',
    'joints',
    'export',
    'sections',
    'cut',
    'animation',
    'render',
];

const TAB_LABEL: Record<TabId, string> = {
    scene: 'Scene',
    code: 'Code',
    params: 'Params',
    validity: 'Validity',
    joints: 'Joints',
    export: 'Export',
    sections: 'Sections',
    cut: 'Cut',
    animation: 'Animation',
    render: 'Render',
};

const RESERVED_HINT: Record<TabId, string> = {
    scene: '',
    code: '',
    params: 'Declare a param(...) in the script to enable Params',
    validity: 'Call validateAssembly() in the script to enable Validity',
    joints: 'Add jointsView() to enable Joints',
    export: 'Add exportSpec() to enable Export',
    sections: 'Add sectionView() to enable Sections',
    cut: 'Add cutView() to enable Cut',
    animation: 'Add animationView() to enable Animation',
    render: 'Add renderView() to enable Render',
};

export function InspectorTabs({ tabs, activeTab, onSelectTab }: InspectorTabsProps) {
    const visibleSet = new Set<TabId>(tabs);

    return (
        <div
            className="flex flex-wrap gap-1 px-2 py-1 bg-[#111] border-b border-[#333]"
            role="tablist"
            data-testid="inspector-tabs"
        >
            {ALL_TABS.map((id) => {
                const isVisible = visibleSet.has(id);
                const isActive = isVisible && id === activeTab;
                const baseClasses =
                    'px-2 py-1 text-xs rounded transition-colors border';
                const stateClasses = isActive
                    ? 'bg-[#222] text-white border-blue-500'
                    : isVisible
                        ? 'bg-transparent text-gray-300 border-transparent hover:bg-[#222] hover:text-white'
                        : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed';

                return (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        data-testid={`inspector-tab-${id}`}
                        data-active={isActive ? 'true' : 'false'}
                        aria-selected={isActive}
                        aria-disabled={isVisible ? undefined : true}
                        disabled={!isVisible}
                        title={isVisible ? TAB_LABEL[id] : RESERVED_HINT[id]}
                        onClick={() => {
                            if (isVisible) onSelectTab(id);
                        }}
                        className={`${baseClasses} ${stateClasses}`}
                    >
                        {TAB_LABEL[id]}
                    </button>
                );
            })}
        </div>
    );
}
