// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../funnel/hooks/useSession', () => ({
    useOptionalSession: () => ({ session: { user: { email: 'a@b.c' } }, loading: false }),
}));
vi.mock('../../funnel/lib/apiClient', () => ({ saveProject: vi.fn() }));

/** Force the narrow-viewport branch (`(max-width: 767px)` matches). */
function setNarrow(narrow: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
            matches: narrow,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
        }),
    });
}

function renderToolbar() {
    return render(
        <Toolbar
            isModified={false}
            onValidate={vi.fn()}
            onRun={vi.fn()}
            agentRailOpen={false}
            onToggleAgentRail={vi.fn()}
            referenceImagesPresent={false}
            referenceImagesVisible
            onToggleReferenceImages={vi.fn()}
            markingMode={false}
            onToggleMarkingMode={vi.fn()}
            sectionMode={false}
            onToggleSectionMode={vi.fn()}
            inspectorOpen
            onToggleInspector={vi.fn()}
            code="box(10,10,10)"
        />,
    );
}

afterEach(() => {
    cleanup();
    setNarrow(false);
});

beforeEach(() => {
    setNarrow(true);
});

describe('Toolbar on a narrow viewport', () => {
    it('keeps Validate and Run on the bar', () => {
        renderToolbar();
        expect(screen.getByLabelText('Run')).toBeDefined();
        expect(screen.getByLabelText('Validate')).toBeDefined();
    });

    it('collapses the secondary controls into the overflow menu', () => {
        renderToolbar();
        expect(screen.queryByTestId('toolbar-publish')).toBeNull();
        expect(screen.queryByTestId('toolbar-mark')).toBeNull();
        expect(screen.queryByTestId('toolbar-section')).toBeNull();
        expect(screen.queryByTestId('toolbar-inspector')).toBeNull();
        expect(screen.queryByTestId('toolbar-my-designs')).toBeNull();

        fireEvent.click(screen.getByTestId('toolbar-overflow'));

        expect(screen.getByTestId('toolbar-publish')).toBeDefined();
        expect(screen.getByTestId('toolbar-mark')).toBeDefined();
        expect(screen.getByTestId('toolbar-section')).toBeDefined();
        expect(screen.getByTestId('toolbar-inspector')).toBeDefined();
        expect(screen.getByTestId('toolbar-my-designs')).toBeDefined();
    });

    it('closes the overflow menu on Escape', () => {
        renderToolbar();
        fireEvent.click(screen.getByTestId('toolbar-overflow'));
        expect(screen.getByTestId('toolbar-overflow-panel')).toBeDefined();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByTestId('toolbar-overflow-panel')).toBeNull();
    });

    it('keeps every control on the bar on a wide viewport', () => {
        setNarrow(false);
        renderToolbar();
        expect(screen.queryByTestId('toolbar-overflow')).toBeNull();
        expect(screen.getByTestId('toolbar-publish')).toBeDefined();
        expect(screen.getByTestId('toolbar-inspector')).toBeDefined();
    });
});
