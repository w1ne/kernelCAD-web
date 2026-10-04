// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { WorkbenchProvider } from '../../context/WorkbenchContext';
import { StudioChromeProvider } from '../../context/StudioChromeContext';

vi.mock('../../../shared/worker/geometryEngine', async () => {
    const actual = await vi.importActual('../../../shared/worker/geometryEngine');
    const mockInstance = {
        initialize: vi.fn().mockResolvedValue(true),
        executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
    };
    return {
        ...actual,
        exportSTEP: vi.fn().mockResolvedValue(new Blob(['mock data'])),
        exportSTL: vi.fn().mockResolvedValue(new Blob(['mock data'])),
        init: vi.fn().mockResolvedValue(true),
        GeometryEngine: { getInstance: () => mockInstance },
    };
});

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

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

function renderHeader(headerLeft?: React.ReactNode) {
    return render(
        <WorkbenchProvider>
            <StudioChromeProvider value={{ headerLeft }}>
                <Header />
            </StudioChromeProvider>
        </WorkbenchProvider>,
    );
}

beforeEach(() => setNarrow(true));
afterEach(() => {
    cleanup();
    setNarrow(false);
});

describe('Header on a narrow viewport', () => {
    it('folds the file and panel controls into one overflow menu', () => {
        renderHeader();
        expect(screen.queryByTitle('Export STEP')).toBeNull();
        expect(screen.queryByTestId('toolbar-publish')).toBeNull();
        expect(screen.queryByTestId('toolbar-inspector')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();

        fireEvent.click(screen.getByTestId('header-overflow'));

        for (const format of ['STL', 'STEP', 'DXF', '3MF', 'GLB']) {
            expect(screen.getByTitle(`Export ${format}`)).toBeDefined();
        }
        expect(screen.getByTestId('toolbar-publish')).toBeDefined();
        expect(screen.getByTestId('toolbar-inspector')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDefined();
    });

    it('closes the overflow menu on Escape', () => {
        renderHeader();
        fireEvent.click(screen.getByTestId('header-overflow'));
        expect(screen.getByTestId('header-overflow-panel')).toBeDefined();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByTestId('header-overflow-panel')).toBeNull();
    });

    it('keeps the account slot pinned on the bar', () => {
        renderHeader();
        expect(screen.getByTestId('account-slot')).toBeDefined();
    });

    it('drops the Studio project name only when the route supplies its own title', () => {
        renderHeader();
        expect(screen.getByText('Untitled Project')).toBeDefined();
        cleanup();

        renderHeader(<span>My Bracket</span>);
        expect(screen.queryByText('Untitled Project')).toBeNull();
        expect(screen.getByText('My Bracket')).toBeDefined();
    });

    it('keeps Share, the Export split button and the inspector toggle inline on a wide viewport', () => {
        setNarrow(false);
        renderHeader();
        expect(screen.queryByTestId('header-overflow')).toBeNull();
        expect(screen.getByTestId('toolbar-publish')).toBeDefined();
        expect(screen.getByTestId('header-export')).toBeDefined();
        expect(screen.getByTestId('toolbar-inspector')).toBeDefined();
    });
});
