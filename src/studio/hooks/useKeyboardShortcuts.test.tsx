// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function TestHarness({
    onDelete,
    allowDeleteInTypingTarget
}: {
    onDelete: (e: KeyboardEvent) => void;
    allowDeleteInTypingTarget: boolean;
}) {
    useKeyboardShortcuts(
        {
            delete: onDelete,
        },
        {
            shouldAllowInTypingTarget: ({ key }) => allowDeleteInTypingTarget && key === 'delete'
        }
    );

    return <textarea data-testid="typing-target" />;
}

describe('useKeyboardShortcuts', () => {
    afterEach(() => {
        cleanup();
    });

    it('does not trigger Delete shortcut while typing target is focused by default', () => {
        const onDelete = vi.fn();
        const { getByTestId } = render(<TestHarness onDelete={onDelete} allowDeleteInTypingTarget={false} />);
        const textarea = getByTestId('typing-target') as HTMLTextAreaElement;
        textarea.focus();

        const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
        window.dispatchEvent(event);

        expect(onDelete).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('triggers and prevents default for Delete when typing-target override is enabled', () => {
        const onDelete = vi.fn();
        const { getByTestId } = render(<TestHarness onDelete={onDelete} allowDeleteInTypingTarget={true} />);
        const textarea = getByTestId('typing-target') as HTMLTextAreaElement;
        textarea.focus();

        const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
        window.dispatchEvent(event);

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
    });
});
