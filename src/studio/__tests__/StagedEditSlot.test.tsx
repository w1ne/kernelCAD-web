// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { StagedEditSlot } from '../StagedEditSlot';
import { shellStore } from '../store/shellStore';

const setCodeMock = vi.fn();

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ setCode: setCodeMock }),
}));

beforeEach(() => {
    shellStore.reset();
    setCodeMock.mockReset();
});

afterEach(() => {
    cleanup();
});

describe('StagedEditSlot', () => {
    it('renders the auto-apply placeholder when no staged edit', () => {
        const { getByText, getByRole } = render(<StagedEditSlot />);
        expect(getByText(/Auto-apply mode · toggle off to enable review/i)).toBeDefined();
        const button = getByRole('button', { name: /review edits/i }) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('renders intent + diff + approve/reject when stagedEdit is populated', () => {
        shellStore.proposeStagedEdit({
            id: 'e1',
            intent: 'Wire output-horn to gripper-coupling.',
            fromCode: 'const a = box(10, 10, 10);\nreturn a;',
            toCode: 'const a = box(10, 10, 10);\nconst b = a.fillet(2);\nreturn b;',
        });
        const { getByTestId } = render(<StagedEditSlot />);
        expect(getByTestId('staged-edit-intent').textContent).toContain('output-horn');
        expect(getByTestId('staged-edit-diff')).toBeDefined();
        expect(getByTestId('staged-edit-approve')).toBeDefined();
        expect(getByTestId('staged-edit-reject')).toBeDefined();
    });

    it('Approve calls workbench.setCode(toCode) and clears the slot', () => {
        const toCode = 'const a = box(10);\nreturn a;';
        shellStore.proposeStagedEdit({
            id: 'e2',
            intent: 'demo',
            fromCode: 'return box(10);',
            toCode,
        });
        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));
        expect(setCodeMock).toHaveBeenCalledTimes(1);
        expect(setCodeMock).toHaveBeenCalledWith(toCode);
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
    });

    it('Reject leaves the script unchanged and clears the slot', () => {
        shellStore.proposeStagedEdit({
            id: 'e3',
            intent: 'demo',
            fromCode: 'from',
            toCode: 'to',
        });
        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-reject'));
        expect(setCodeMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
    });

    it('source label renders when provided', () => {
        shellStore.proposeStagedEdit({
            id: 'e4',
            intent: 'demo',
            fromCode: 'a',
            toCode: 'b',
            source: { kind: 'agent', label: 'set_param_value(Wall, 12)' },
        });
        const { getByText } = render(<StagedEditSlot />);
        expect(getByText(/agent.*set_param_value/i)).toBeDefined();
    });
});
