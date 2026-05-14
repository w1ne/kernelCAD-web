// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StagedEditSlot } from '../StagedEditSlot';

afterEach(() => {
    cleanup();
});

describe('StagedEditSlot', () => {
    it('renders v1 placeholder copy when no staged edits', () => {
        const { getByText } = render(<StagedEditSlot />);
        expect(getByText(/Auto-apply mode · toggle off to enable review/i)).toBeDefined();
    });

    it('renders the disabled toggle button', () => {
        const { getByRole } = render(<StagedEditSlot />);
        const button = getByRole('button', { name: /review edits/i }) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('accepts the Slice 1.5 contract props without error', () => {
        const noop = () => {};
        const { getByText } = render(
            <StagedEditSlot stagedEdits={[]} onApprove={noop} onReject={noop} />,
        );
        expect(getByText(/Auto-apply mode/i)).toBeDefined();
    });
});
