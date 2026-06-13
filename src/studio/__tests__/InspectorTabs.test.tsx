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

const RESERVED: readonly TabId[] = ['joints', 'export', 'sections', 'cut', 'animation', 'render'];

describe('InspectorTabs', () => {
    it('renders visible tabs as enabled and reserved tabs as aria-disabled', () => {
        const onSelectTab = vi.fn();
        render(
            <InspectorTabs
                tabs={['scene', 'code']}
                activeTab="scene"
                onSelectTab={onSelectTab}
            />,
        );

        const sceneBtn = screen.getByTestId('inspector-tab-scene') as HTMLButtonElement;
        const codeBtn = screen.getByTestId('inspector-tab-code') as HTMLButtonElement;
        expect(sceneBtn.getAttribute('aria-disabled')).toBeNull();
        expect(codeBtn.getAttribute('aria-disabled')).toBeNull();
        expect(sceneBtn.disabled).toBe(false);
        expect(codeBtn.disabled).toBe(false);

        for (const id of RESERVED) {
            const btn = screen.getByTestId(`inspector-tab-${id}`) as HTMLButtonElement;
            expect(btn.getAttribute('aria-disabled')).toBe('true');
            expect(btn.disabled).toBe(true);
        }
    });

    it('clicking a visible tab calls onSelectTab(id); reserved tab clicks do not', () => {
        const onSelectTab = vi.fn();
        render(
            <InspectorTabs
                tabs={['scene', 'code']}
                activeTab="scene"
                onSelectTab={onSelectTab}
            />,
        );

        fireEvent.click(screen.getByTestId('inspector-tab-code'));
        expect(onSelectTab).toHaveBeenCalledTimes(1);
        expect(onSelectTab).toHaveBeenLastCalledWith('code');

        for (const id of RESERVED) {
            fireEvent.click(screen.getByTestId(`inspector-tab-${id}`));
        }
        expect(onSelectTab).toHaveBeenCalledTimes(1);
    });

    it('active tab is visually distinct via data-active and aria-selected', () => {
        const onSelectTab = vi.fn();
        render(
            <InspectorTabs
                tabs={['scene', 'code']}
                activeTab="code"
                onSelectTab={onSelectTab}
            />,
        );

        const codeBtn = screen.getByTestId('inspector-tab-code');
        const sceneBtn = screen.getByTestId('inspector-tab-scene');

        expect(codeBtn.getAttribute('data-active')).toBe('true');
        expect(codeBtn.getAttribute('aria-selected')).toBe('true');
        expect(sceneBtn.getAttribute('data-active')).toBe('false');
        expect(sceneBtn.getAttribute('aria-selected')).toBe('false');
    });

    it('reserved tab title surfaces the enabling hint', () => {
        render(
            <InspectorTabs
                tabs={['scene', 'code']}
                activeTab="scene"
                onSelectTab={vi.fn()}
            />,
        );
        const jointsBtn = screen.getByTestId('inspector-tab-joints');
        expect(jointsBtn.getAttribute('title')).toMatch(/joints/i);
    });
});
