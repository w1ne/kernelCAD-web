// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AgentRail } from '../AgentRail';
import { shellStore } from '../store/useShellStore';

// AgentRail composes StagedEditSlot which (Slice 1.5+) reads useWorkbench.
// Mock the context so the rail can render in isolation.
vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ setCode: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    shellStore.reset();
    localStorage.clear();
});

describe('AgentRail', () => {
    it('renders collapsed (width 0) when agentRailOpen is false', () => {
        const { getByLabelText } = render(<AgentRail />);
        const rail = getByLabelText('Agent rail');
        expect(rail.getAttribute('data-open')).toBe('false');
        expect((rail as HTMLElement).style.width).toBe('0px');
    });

    it('renders open at 360px with only the in-Studio agent surface', () => {
        shellStore.setAgentRailOpen(true);
        const { getByLabelText, queryByText } = render(<AgentRail />);
        const rail = getByLabelText('Agent rail');
        expect(rail.getAttribute('data-open')).toBe('true');
        expect((rail as HTMLElement).style.width).toBe('360px');
        expect(queryByText(/Cloud MCP connector/i)).toBeNull();
        // The stale "Cloud MCP connector" + "coming later" cards were removed; the
        // in-Studio agent is live and external-agent onboarding lives on /connect.
        expect(queryByText(/Cloud MCP connector/i)).toBeNull();
        expect(queryByText(/Coming later/i)).toBeNull();
    });

    it('reacts to store toggles after mount', () => {
        const { getByLabelText, rerender } = render(<AgentRail />);
        const rail = getByLabelText('Agent rail');
        expect(rail.getAttribute('data-open')).toBe('false');
        shellStore.setAgentRailOpen(true);
        rerender(<AgentRail />);
        expect(getByLabelText('Agent rail').getAttribute('data-open')).toBe('true');
    });

    it('resizes from its right edge with the keyboard and keeps the width', () => {
        shellStore.setAgentRailOpen(true);
        const { getByLabelText, getByRole, unmount } = render(<AgentRail />);
        const handle = getByRole('separator', { name: 'Resize agent pane' });
        expect(handle.getAttribute('aria-valuenow')).toBe('360');
        fireEvent.keyDown(handle, { key: 'ArrowRight' });
        expect((getByLabelText('Agent rail') as HTMLElement).style.width).toBe('376px');
        fireEvent.keyDown(handle, { key: 'End' });
        expect((getByLabelText('Agent rail') as HTMLElement).style.width).toBe('560px');
        unmount();
        // The width survives a remount (per browser).
        const again = render(<AgentRail />);
        expect((again.getByLabelText('Agent rail') as HTMLElement).style.width).toBe('560px');
        fireEvent.doubleClick(again.getByRole('separator', { name: 'Resize agent pane' }));
        expect((again.getByLabelText('Agent rail') as HTMLElement).style.width).toBe('360px');
    });

    it('drags its right edge to resize', () => {
        shellStore.setAgentRailOpen(true);
        const { getByLabelText, getByRole } = render(<AgentRail />);
        const handle = getByRole('separator', { name: 'Resize agent pane' });
        fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 440, pointerId: 1 });
        fireEvent.pointerUp(handle, { pointerId: 1 });
        expect((getByLabelText('Agent rail') as HTMLElement).style.width).toBe('400px');
    });
});
