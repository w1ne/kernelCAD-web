// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as RegistryHook from '../../hooks/useCommandRegistry';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick, ...props }: any) => (
            <div className={className} onClick={onClick} {...props}>
                {children}
            </div>
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ResizeObserver which is used by cmdk usually
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.Element.prototype.scrollIntoView = vi.fn();

// Mock the hook
const mockRegisterCommand = vi.fn();
const mockCommands = [
    { id: 'cmd1', label: 'Test Command 1', action: vi.fn(), section: 'General' },
    { id: 'cmd2', label: 'Modeling Action', action: vi.fn(), section: 'Modeling' }
];

vi.spyOn(RegistryHook, 'useCommandRegistry').mockReturnValue({
    commands: mockCommands as any,
    registerCommand: mockRegisterCommand
});

describe('CommandPalette', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should be hidden by default', () => {
        render(<CommandPalette />);
        expect(screen.queryByPlaceholderText('Type a command or search...')).toBeNull();
    });

    it('should open when Cmd+K is pressed', async () => {
        render(<CommandPalette />);

        fireEvent.keyDown(document, { key: 'k', metaKey: true });

        expect(await screen.findByPlaceholderText('Type a command or search...')).toBeDefined();
    });

    it('should display registered commands', async () => {
        render(<CommandPalette />);
        fireEvent.keyDown(document, { key: 'k', metaKey: true });

        expect(await screen.findByText('Test Command 1')).toBeDefined();
        expect(screen.getByText('Modeling Action')).toBeDefined();
    });

    it('should execute command action on click', async () => {
        render(<CommandPalette />);
        fireEvent.keyDown(document, { key: 'k', metaKey: true });

        const cmdItem = await screen.findByText('Test Command 1');
        fireEvent.click(cmdItem);

        expect(mockCommands[0].action).toHaveBeenCalled();
    });
});
