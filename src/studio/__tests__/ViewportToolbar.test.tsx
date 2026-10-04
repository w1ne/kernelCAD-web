// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ViewportToolbar, type ViewportDisplay } from '../ViewportToolbar';
import { viewTargetRequests } from '../hooks/studioNavigation';

afterEach(() => cleanup());

function display(overrides: Partial<ViewportDisplay> = {}): ViewportDisplay {
    return {
        viewMode3D: 'shadedWithEdges',
        setViewMode3D: vi.fn(),
        background: 'dark',
        setBackground: vi.fn(),
        gridVisible: true,
        setGridVisible: vi.fn(),
        ...overrides,
    };
}

function renderToolbar(overrides: Partial<Parameters<typeof ViewportToolbar>[0]> = {}) {
    const props = {
        onRun: vi.fn(),
        onValidate: vi.fn(),
        markingMode: false,
        onToggleMarkingMode: vi.fn(),
        sectionMode: false,
        onToggleSectionMode: vi.fn(),
        referenceImagesPresent: false,
        referenceImagesVisible: true,
        onToggleReferenceImages: vi.fn(),
        display: display(),
        ...overrides,
    };
    render(<ViewportToolbar {...props} />);
    return props;
}

describe('ViewportToolbar', () => {
    it('is one floating toolbar over the viewport', () => {
        renderToolbar();
        const bar = screen.getByRole('toolbar', { name: 'Model tools' });
        expect(bar.getAttribute('data-testid')).toBe('studio-toolbar');
        expect(bar.className).toContain('absolute');
    });

    it('runs and validates', () => {
        const props = renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
        expect(props.onRun).toHaveBeenCalledTimes(1);
        expect(props.onValidate).toHaveBeenCalledTimes(1);
    });

    it('makes Run the primary action only when the last run failed', () => {
        renderToolbar();
        expect(screen.getByRole('button', { name: 'Run' }).textContent).toBe('');
        cleanup();
        renderToolbar({ runNeeded: true });
        const run = screen.getByRole('button', { name: 'Run' });
        expect(run.getAttribute('data-variant')).toBe('primary');
        expect(run.textContent).toContain('Run');
    });

    it('runs on Mod+Enter', () => {
        const props = renderToolbar();
        fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
        expect(props.onRun).toHaveBeenCalledTimes(1);
    });

    it('names the review brush "Mark for agent", not "Brush"', () => {
        const props = renderToolbar();
        const mark = screen.getByTestId('toolbar-mark');
        expect(mark.getAttribute('aria-label')).toBe('Mark for agent');
        expect(mark.getAttribute('aria-pressed')).toBe('false');
        expect(screen.queryByText('Brush')).toBeNull();
        fireEvent.click(mark);
        expect(props.onToggleMarkingMode).toHaveBeenCalledTimes(1);
    });

    it('offers to save the mark while marking', () => {
        renderToolbar({ markingMode: true });
        const mark = screen.getByTestId('toolbar-mark');
        expect(mark.getAttribute('aria-label')).toBe('Save mark for agent');
        expect(mark.getAttribute('aria-pressed')).toBe('true');
    });

    it('toggles the section view', () => {
        const props = renderToolbar({ sectionMode: true });
        const section = screen.getByTestId('toolbar-section');
        expect(section.getAttribute('aria-label')).toBe('Exit section view');
        fireEvent.click(section);
        expect(props.onToggleSectionMode).toHaveBeenCalledTimes(1);
    });

    it('fits the model through the view-target channel', () => {
        const seen: string[] = [];
        const off = viewTargetRequests.subscribe((t) => seen.push(t));
        renderToolbar();
        fireEvent.click(screen.getByTestId('toolbar-fit'));
        off();
        expect(seen).toEqual(['fit']);
    });

    it('shows the reference-image toggle only when the scene has one', () => {
        renderToolbar();
        expect(screen.queryByRole('button', { name: /reference images/i })).toBeNull();
        cleanup();
        const props = renderToolbar({ referenceImagesPresent: true, referenceImagesVisible: false });
        const btn = screen.getByRole('button', { name: 'Show reference images' });
        expect(btn.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(btn);
        expect(props.onToggleReferenceImages).toHaveBeenCalledTimes(1);
    });

    it('shows the HDRI toggle only when the scene declares an environment', () => {
        renderToolbar();
        expect(screen.queryByTestId('toolbar-render-environment')).toBeNull();
        cleanup();
        const onToggle = vi.fn();
        renderToolbar({ renderEnvironmentPresent: true, renderEnvironmentPresetLabel: 'studio', onToggleRenderEnvironment: onToggle });
        const env = screen.getByTestId('toolbar-render-environment');
        expect(env.textContent).toBe('Env: studio');
        fireEvent.click(env);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('keeps the display, background and grid controls in View options', () => {
        const d = display();
        renderToolbar({ display: d });
        fireEvent.click(screen.getByTestId('toolbar-view-options'));
        const menu = screen.getByRole('menu', { name: 'View options' });
        fireEvent.click(within(menu).getByRole('menuitem', { name: 'Wireframe' }));
        expect(d.setViewMode3D).toHaveBeenCalledWith('wireframe');

        fireEvent.click(screen.getByTestId('toolbar-view-options'));
        fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Light background' }));
        expect(d.setBackground).toHaveBeenCalledWith('light');

        fireEvent.click(screen.getByTestId('toolbar-view-options'));
        fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Hide ground grid' }));
        expect(d.setGridVisible).toHaveBeenCalledWith(false);
    });
});

describe('View options menu', () => {
    it('lists the camera presets, the three display modes, the three backgrounds and the grid', () => {
        renderToolbar({ display: display({ gridVisible: false }) });
        fireEvent.click(screen.getByTestId('toolbar-view-options'));
        const labels = within(screen.getByRole('menu')).getAllByRole('menuitem').map((m) => m.textContent);
        expect(labels).toEqual([
            'Top view (XY)', 'Front view (XZ)', 'Right view (YZ)',
            'Shaded with edges', 'Shaded', 'Wireframe',
            'Dark background', 'Light background', 'Checkered background',
            'Show ground grid',
        ]);
    });
});
