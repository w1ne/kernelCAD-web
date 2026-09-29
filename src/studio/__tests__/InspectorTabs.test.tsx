// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InspectorTabs } from '../InspectorTabs';
import type { TabId } from '../types';

afterEach(() => {
    cleanup();
});

const RESERVED: readonly TabId[] = ['sections', 'cut', 'render'];

describe('InspectorTabs', () => {
    it('renders only the tabs it is given; reserved and unavailable tabs are not in the DOM', () => {
        render(
            <InspectorTabs tabs={['code', 'validity']} activeTab="code" onSelectTab={vi.fn()} width={560} />,
        );

        expect(screen.getAllByRole('tab')).toHaveLength(2);
        for (const id of [...RESERVED, 'joints', 'animation', 'export', 'params'] as TabId[]) {
            expect(screen.queryByTestId(`inspector-tab-${id}`)).toBeNull();
        }
        // No tab is ever rendered disabled.
        for (const tab of screen.getAllByRole('tab')) {
            expect(tab.hasAttribute('disabled')).toBe(false);
            expect(tab.getAttribute('aria-disabled')).toBeNull();
        }
    });

    it('labels the validity tab "Checks" and shows its count', () => {
        render(
            <InspectorTabs
                tabs={['code', 'validity']}
                activeTab="code"
                onSelectTab={vi.fn()}
                counts={{ validity: 3 }}
                width={560}
            />,
        );

        expect(screen.getByTestId('inspector-tab-validity').textContent).toBe('Checks3');
        expect(screen.getByRole('tablist', { name: 'Inspector' })).toBeTruthy();
    });

    it('clicking a tab calls onSelectTab(id)', () => {
        const onSelectTab = vi.fn();
        render(
            <InspectorTabs tabs={['code', 'params', 'validity']} activeTab="code" onSelectTab={onSelectTab} width={560} />,
        );

        fireEvent.click(screen.getByTestId('inspector-tab-validity'));
        expect(onSelectTab).toHaveBeenCalledWith('validity');
    });

    it('the active tab is aria-selected and the only one in the tab order', () => {
        render(
            <InspectorTabs tabs={['code', 'params', 'validity']} activeTab="params" onSelectTab={vi.fn()} width={560} />,
        );

        const params = screen.getByTestId('inspector-tab-params');
        const code = screen.getByTestId('inspector-tab-code');
        expect(params.getAttribute('aria-selected')).toBe('true');
        expect(params.tabIndex).toBe(0);
        expect(code.getAttribute('aria-selected')).toBe('false');
        expect(code.tabIndex).toBe(-1);
    });

    it('arrow keys move the selection along the tab list', () => {
        const onSelectTab = vi.fn();
        render(
            <InspectorTabs tabs={['code', 'params', 'validity']} activeTab="code" onSelectTab={onSelectTab} width={560} />,
        );

        fireEvent.keyDown(screen.getByTestId('inspector-tab-code'), { key: 'ArrowRight' });
        expect(onSelectTab).toHaveBeenLastCalledWith('params');
        fireEvent.keyDown(screen.getByTestId('inspector-tab-code'), { key: 'ArrowLeft' });
        expect(onSelectTab).toHaveBeenLastCalledWith('validity');
    });

    it('tabs that do not fit the width go to a "More" menu', () => {
        render(
            <InspectorTabs
                tabs={['code', 'params', 'validity', 'joints', 'animation', 'export', 'scene']}
                activeTab="code"
                onSelectTab={vi.fn()}
                width={340}
            />,
        );

        expect(screen.getByTestId('inspector-tab-code')).toBeTruthy();
        expect(screen.getByTestId('inspector-tab-params')).toBeTruthy();
        expect(screen.getByTestId('inspector-tab-validity')).toBeTruthy();
        expect(screen.queryByTestId('inspector-tab-scene')).toBeNull();
        expect(screen.getByRole('button', { name: /more/i })).toBeTruthy();
    });
});
