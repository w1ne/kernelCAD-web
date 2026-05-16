// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { WorkbenchProvider, useWorkbench } from '../context/WorkbenchContext';
import { useEffect } from 'react';

// Mock Geometry Engine
vi.mock('../shared/worker/geometryEngine', () => {
    const mockInstance = {
        initialize: vi.fn().mockResolvedValue(true),
        executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
    };
    return {
        defaultCode: 'return [];',
        init: vi.fn().mockResolvedValue(true),
        executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
        exportSTEP: vi.fn(),
        exportSTL: vi.fn(),
        GeometryEngine: {
            getInstance: () => mockInstance
        }
    };
});

afterEach(() => {
    cleanup();
});

const TestComponent = () => {
    const { viewMode, setViewMode, code, setCode, isReady } = useWorkbench();

    useEffect(() => {
        if (isReady) {
            setCode('new code');
        }
    }, [isReady, setCode]);

    return (
        <div>
            <span data-testid="mode">{viewMode}</span>
            <span data-testid="code">{code}</span>
            <button data-testid="switch-btn" onClick={() => setViewMode('gui')}>Switch</button>
        </div>
    );
};

describe('WorkbenchContext', () => {
    it('should provide default values', async () => {
        render(
            <WorkbenchProvider>
                <TestComponent />
            </WorkbenchProvider>
        );
        expect(screen.getByTestId('mode').textContent).toBe('code');
    });

    it('should update state', async () => {
        render(
            <WorkbenchProvider>
                <TestComponent />
            </WorkbenchProvider>
        );

        const btn = screen.getByTestId('switch-btn');
        await act(async () => {
            btn.click();
        });

        expect(screen.getByTestId('mode').textContent).toBe('gui');
    });
});
