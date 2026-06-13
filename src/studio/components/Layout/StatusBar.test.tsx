// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar';

afterEach(() => cleanup());

describe('StatusBar', () => {
    it('renders ready state with geometry and diagnostics summary', () => {
        render(
            <StatusBar
                isComputing={false}
                error={null}
                geometryCount={3}
                selectedCount={1}
                viewMode3D="shadedWithEdges"
                layoutMode="split"
                activeCommandLabel={null}
            />
        );

        expect(screen.getByText('Ready')).toBeDefined();
        expect(screen.getByText('3 bodies')).toBeDefined();
        expect(screen.getByText('1 selected')).toBeDefined();
        expect(screen.getByText('No diagnostics')).toBeDefined();
        const liveRegion = screen.getByRole('status');
        expect(liveRegion.getAttribute('aria-live')).toBe('polite');
        expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
    });

    it('renders computing state', () => {
        render(
            <StatusBar
                isComputing={true}
                error={null}
                geometryCount={0}
                selectedCount={0}
                viewMode3D="wireframe"
                layoutMode="viewport"
                activeCommandLabel="Extrude"
            />
        );

        expect(screen.getByText('Computing...')).toBeDefined();
        expect(screen.getByText('Extrude')).toBeDefined();
        expect(screen.getByText('Wireframe')).toBeDefined();
    });

    it('renders last recompute duration when available', () => {
        render(
            <StatusBar
                isComputing={false}
                error={null}
                geometryCount={2}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="split"
                activeCommandLabel={null}
                recomputeMs={874}
            />
        );

        expect(screen.getByText('Last compute 874 ms')).toBeDefined();
    });

    it('renders error state with compact message', () => {
        render(
            <StatusBar
                isComputing={false}
                error={'OpenCascade Error (Code: 103)'}
                geometryCount={0}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="code"
                activeCommandLabel={null}
            />
        );

        expect(screen.getByText('Error')).toBeDefined();
        expect(screen.getByText(/OpenCascade Error/)).toBeDefined();
    });

    it('renders only the first line of multi-line errors', () => {
        render(
            <StatusBar
                isComputing={false}
                error={'OpenCascade Error (Code: 103)\nStack trace line'}
                geometryCount={0}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="code"
                activeCommandLabel={null}
            />
        );

        expect(screen.getByText('OpenCascade Error (Code: 103)')).toBeDefined();
        expect(screen.queryByText('Stack trace line')).toBeNull();
    });

    it('renders interferences count when prop is passed', () => {
        render(
            <StatusBar
                isComputing={false}
                error={null}
                geometryCount={2}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="split"
                activeCommandLabel={null}
                interferences={3}
            />
        );

        expect(screen.getByText('interferences: 3')).toBeDefined();
    });

    it('omits interferences when prop is undefined', () => {
        render(
            <StatusBar
                isComputing={false}
                error={null}
                geometryCount={2}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="split"
                activeCommandLabel={null}
            />
        );

        expect(screen.queryByTestId('status-interferences')).toBeNull();
    });

    it('truncates long first-line errors', () => {
        const firstLine = `OpenCascade Error ${'x'.repeat(100)}`;
        const expected = `${firstLine.slice(0, 93)}...`;

        render(
            <StatusBar
                isComputing={false}
                error={firstLine}
                geometryCount={0}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="code"
                activeCommandLabel={null}
            />
        );

        expect(screen.getByText(expected)).toBeDefined();
        expect(screen.queryByText(firstLine)).toBeNull();
    });
});
