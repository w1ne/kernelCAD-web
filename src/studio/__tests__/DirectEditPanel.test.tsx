// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { shellStore } from '../store/shellStore';
import { CommandManager } from '../../authoring/commands/CommandManager';
import { StudioChromeProvider } from '../context/StudioChromeContext';

const workbench = {
    code: 'return box(1);',
    selectedItemIds: [] as string[],
    hasControlledCode: false,
    commandManager: new CommandManager(() => ({ code: '', setCode: vi.fn() })),
};

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => workbench,
}));

import { DirectEditPanel } from '../components/viewer/overlays/DirectEditPanel';

beforeEach(() => {
    shellStore.reset();
    workbench.selectedItemIds = [];
});

afterEach(() => {
    cleanup();
    shellStore.reset();
});

describe('DirectEditPanel', () => {
    it('is empty with nothing selected and nothing staged', () => {
        const { queryByTestId } = render(<DirectEditPanel />);
        expect(queryByTestId('direct-edit-panel')).toBeNull();
    });

    it('shows the auto-apply toggle while a body is selected', () => {
        workbench.selectedItemIds = ['base'];
        const { getByTestId, queryByTestId } = render(<DirectEditPanel />);
        expect(getByTestId('staged-edit-auto-apply')).toBeDefined();
        expect(queryByTestId('staged-edit-approve')).toBeNull();
    });

    it('opens the review card for a staged edit', () => {
        const { getByTestId } = render(<DirectEditPanel />);
        act(() => shellStore.proposeStagedEdit({
            id: 'e1', intent: 'move', fromCode: 'return box(1);', toCode: 'return box(2);',
            reviewReason: 'Not auto-applied: validity drops (interferences 0 → 1). Review the edit.',
        }));
        expect(getByTestId('staged-edit-approve')).toBeDefined();
        expect(getByTestId('staged-edit-review-reason').textContent).toContain('validity drops');
    });

    it('hides the toggle in a read-only viewer', () => {
        workbench.selectedItemIds = ['base'];
        const { queryByTestId } = render(
            <StudioChromeProvider value={{ viewerMode: true }}>
                <DirectEditPanel />
            </StudioChromeProvider>,
        );
        expect(queryByTestId('direct-edit-panel')).toBeNull();
    });
});
