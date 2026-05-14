// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { AgentActivityLog } from '../AgentActivityLog';

afterEach(() => {
    cleanup();
});

describe('AgentActivityLog', () => {
    it('renders the v1 offline state', () => {
        const { getByText } = render(<AgentActivityLog />);
        expect(getByText(/Agent offline · MCP not connected/i)).toBeDefined();
    });

    it('shows the empty-state hint that activity will appear when MCP connects', () => {
        const { getByText } = render(<AgentActivityLog />);
        expect(getByText(/Agent activity will appear here when MCP connects/i)).toBeDefined();
    });
});
