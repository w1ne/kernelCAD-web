// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { WorkbenchProvider } from '../context/WorkbenchContext';

// Mock clipboard
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: mockWriteText
    },
    writable: true,
    configurable: true
});

// Mock Geometry Engine
vi.mock('../lib/geometryEngine', () => {
    return {
        defaultCode: 'return [];',
        GeometryEngine: {
            getInstance: () => ({
                initialize: vi.fn().mockResolvedValue(true),
                executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
            })
        }
    };
});

// Component that throws error
const Torpedo = () => {
    throw new Error("Boom!");
};

// Test wrapper
const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <WorkbenchProvider>
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    </WorkbenchProvider>
);

describe('ErrorBoundary', () => {
    // Suppress console.error for expected errors
    const consoleError = console.error;
    beforeAll(() => {
        console.error = vi.fn();
    });
    afterAll(() => {
        console.error = consoleError;
    });
    afterEach(() => {
        cleanup();
        mockWriteText.mockClear();
    });

    it('should render children normally', () => {
        render(
            <Wrapper>
                <div>Safe Content</div>
            </Wrapper>
        );
        expect(screen.getByText('Safe Content')).toBeDefined();
    });

    it('should catch errors and show rescue UI', () => {
        render(
            <Wrapper>
                <Torpedo />
            </Wrapper>
        );

        expect(screen.getByText('Application Crashed')).toBeDefined();
        expect(screen.getByText('Code Rescue')).toBeDefined();
    });

    it('should allow copying code', async () => {
        // We need to set code state before crashing.
        // Since Torpedo crashes immediately, we might not set code in time if we do it inside.
        // But ErrorFallback reads from Provider. 
        // Let's rely on provider default code or pre-set it.

        render(
            <WorkbenchProvider initialCode="const robust = true;">
                <ErrorBoundary>
                    <Torpedo />
                </ErrorBoundary>
            </WorkbenchProvider>
        );

        const copyBtn = screen.getByText('Copy Code');
        fireEvent.click(copyBtn);
        expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('robust'));
    });
});
