// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useState } from 'react';
import { useShellStore } from './store/useShellStore';
import { ValidityDeltaHeader } from './ValidityDeltaHeader';
import { DiagnosticRow } from './DiagnosticRow';

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

export default BottomDrawer;
