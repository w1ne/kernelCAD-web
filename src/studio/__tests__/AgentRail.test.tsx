// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { AgentRail } from '../AgentRail';
import { shellStore } from '../store/useShellStore';

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

    it('renders open at 240px and shows staged-edit + activity panes when toggled on', () => {
        shellStore.setAgentRailOpen(true);
        const { getByLabelText, getByText } = render(<AgentRail />);
        const rail = getByLabelText('Agent rail');
        expect(rail.getAttribute('data-open')).toBe('true');
        expect((rail as HTMLElement).style.width).toBe('240px');
        expect(getByText(/Staged edits/i)).toBeDefined();
        expect(getByText(/Agent offline · MCP not connected/i)).toBeDefined();
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
