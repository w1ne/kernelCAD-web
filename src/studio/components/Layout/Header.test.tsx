// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { WorkbenchProvider } from '../../context/WorkbenchContext';
import * as geometryEngine from '../../../shared/worker/geometryEngine';

// Mock Geometry Engine exports
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
        GeometryEngine: {
            getInstance: () => mockInstance
        }
    };
});

afterEach(() => {
    cleanup();
});

describe('Header', () => {
    it('should render project name', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );
        // Default project name from ProjectContext
        expect(screen.getByText('Untitled Project')).toBeDefined();
    });

    it('should show view modes correctly', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        // Verify mode toggle buttons exist
        expect(screen.getByTitle('Code Mode')).toBeDefined();
        expect(screen.getByTitle('Design Mode')).toBeDefined();
    });

    it('should trigger export', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        const exportBtn = screen.getByTitle('Export STEP');
        fireEvent.click(exportBtn);

        expect(geometryEngine.exportSTEP).toHaveBeenCalled();
    });

    it('should switch between shading modes', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        // Default is usually shadedWithEdges (from WorkbenchContext)
        const boxBtn = screen.getByTitle('Shaded with Edges');
        const wireframeBtn = screen.getByTitle('Wireframe');
        const shadedBtn = screen.getByTitle('Shaded');

        // Initial check for shadedWithEdges active style (bg-[#444])
        expect(boxBtn.className).toContain('bg-[#444]');

        // Click wireframe
        fireEvent.click(wireframeBtn);
        expect(wireframeBtn.className).toContain('bg-[#444]');
        expect(boxBtn.className).not.toContain('bg-[#444]');

        // Click shaded
        fireEvent.click(shadedBtn);
        expect(shadedBtn.className).toContain('bg-[#444]');
        expect(wireframeBtn.className).not.toContain('bg-[#444]');
    });
});
