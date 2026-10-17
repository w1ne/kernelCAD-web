// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { Tabs, type TabItem } from '../ui';
import type { TabId } from './types';
import { INSPECTOR_TABS_ID, INSPECTOR_TAB_LABEL } from './logic/adaptiveTabs';

interface InspectorTabsProps {
    /** Available tabs in display order. Unavailable tabs are not passed. */
    readonly tabs: readonly TabId[];
    readonly activeTab: TabId;
    readonly onSelectTab: (id: TabId) => void;
    /** Count pills after a label ("Checks 2"). */
    readonly counts?: Partial<Record<TabId, number>>;
    /** Kept so callers can pass the column width. The row shows every view. */
    readonly width?: number;
}

/**
 * The inspector tab strip: underline tabs with arrow-key navigation, only
 * the tabs the model has content for. They stay in one row; a narrow column
 * scrolls the row instead of folding views into More.
 */
export function InspectorTabs({ tabs, activeTab, onSelectTab, counts }: InspectorTabsProps): JSX.Element {
    const items: TabItem[] = tabs.map((id) => ({
        id,
        label: INSPECTOR_TAB_LABEL[id] ?? id,
        count: counts?.[id],
        testId: `inspector-tab-${id}`,
    }));

    return (
        <div className="shrink-0 px-1 pt-1" data-testid="inspector-tabs">
            <Tabs
                id={INSPECTOR_TABS_ID}
                label="Inspector"
                items={items}
                value={activeTab}
                onChange={(id) => onSelectTab(id as TabId)}
            />
        </div>
    );
}
