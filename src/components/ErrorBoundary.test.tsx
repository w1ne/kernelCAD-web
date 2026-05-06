// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const useWorkbench = vi.fn(() => ({ code: 'return [];' }));

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => useWorkbench(),
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: mockWriteText
    },
    writable: true,
    configurable: true
});

// Component that throws error
const Torpedo = () => {
    throw new Error("Boom!");
};

// Test wrapper
const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary>
        {children}
    </ErrorBoundary>
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
        useWorkbench.mockReturnValue({ code: 'return [];' });
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

    it('should allow copying code', () => {
        useWorkbench.mockReturnValue({ code: 'const robust = true;' });

        render(
            <Wrapper>
                <Torpedo />
            </Wrapper>
        );

        const copyBtn = screen.getByText('Copy Code');
        fireEvent.click(copyBtn);
        expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('robust'));
    });
});
