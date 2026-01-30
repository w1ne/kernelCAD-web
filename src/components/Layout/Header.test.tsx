// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { WorkbenchProvider } from '../../context/WorkbenchContext';
import * as geometryEngine from '../../lib/geometryEngine';

// Mock Geometry Engine exports
vi.mock('../../lib/geometryEngine', async () => {
    const actual = await vi.importActual('../../lib/geometryEngine');
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
    it('should render title', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );
        expect(screen.getByText('script.js')).toBeDefined();
    });

    it('should show Design title in gui mode', () => {
        // We can't easily set state inside provider without a helper, 
        // but the toggle button should switch it.
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        const guiBtn = screen.getByTitle('Design Mode');
        fireEvent.click(guiBtn);
        expect(screen.getByText('Design')).toBeDefined();
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
});
