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
    it('moves the instrument clusters into the overflow menu', () => {
        renderHeader();
        expect(screen.queryByTestId('view-3d-toggle')).toBeNull();
        expect(screen.queryByTestId('viewport-background-toggle')).toBeNull();
        expect(screen.queryByTestId('viewport-grid-toggle')).toBeNull();
        expect(screen.queryByTitle('Export STEP')).toBeNull();

        fireEvent.click(screen.getByTestId('header-overflow'));

        expect(screen.getByTestId('view-3d-toggle')).toBeDefined();
        expect(screen.getByTestId('viewport-background-toggle')).toBeDefined();
        expect(screen.getByTestId('viewport-grid-toggle')).toBeDefined();
        expect(screen.getByTitle('Export STEP')).toBeDefined();
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

    it('keeps the instruments inline on a wide viewport', () => {
        setNarrow(false);
        renderHeader();
        expect(screen.queryByTestId('header-overflow')).toBeNull();
        expect(screen.getByTestId('view-3d-toggle')).toBeDefined();
        expect(screen.getByTitle('Export STEP')).toBeDefined();
    });
});
