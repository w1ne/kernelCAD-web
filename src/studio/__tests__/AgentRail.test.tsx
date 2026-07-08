// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
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
});

describe('AgentRail', () => {
    it('renders collapsed (width 0) when agentRailOpen is false', () => {
        const { getByLabelText } = render(<AgentRail />);
        const rail = getByLabelText('Agent rail');
        expect(rail.getAttribute('data-open')).toBe('false');
        expect((rail as HTMLElement).style.width).toBe('0px');
    });

    it('renders open at 240px and shows the staged-edit pane when toggled on', () => {
        shellStore.setAgentRailOpen(true);
        const { getByLabelText, getByText, queryByText } = render(<AgentRail />);
        const rail = getByLabelText('Agent rail');
        expect(rail.getAttribute('data-open')).toBe('true');
        expect((rail as HTMLElement).style.width).toBe('240px');
        expect(getByText(/Staged edits/i)).toBeDefined();
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
});
