// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AgentActivityLog } from '../AgentActivityLog';

const { createMcpToken } = vi.hoisted(() => ({
    createMcpToken: vi.fn(),
}));
vi.mock('../../funnel/lib/apiClient', () => ({
    createMcpToken,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AgentActivityLog', () => {
    it('renders cloud MCP connector commands for common clients', async () => {
        createMcpToken.mockResolvedValue({ token: 'kc_ready_token', tokenPrefix: 'kc_ready_' });
        const { getByText } = render(<AgentActivityLog />);
        expect(getByText(/Cloud MCP connector/i)).toBeDefined();
        expect(getByText(/One-line MCP install with token auth, local tooling, and hosted kernel/i)).toBeDefined();
        await waitFor(() => {
            expect(getByText(/claude mcp add kernelcad -- npx -y kernelcad mcp --cloud --token kc_ready_token/i)).toBeDefined();
        });
        expect(getByText(/codex mcp add kernelcad -- npx -y kernelcad mcp --cloud --token kc_ready_token/i)).toBeDefined();
        expect(getByText(/Studio Agent Mode/i)).toBeDefined();
        expect(getByText(/^cloud$/i)).toBeDefined();
    });

    it('copies the selected connect command with the minted token', async () => {
        createMcpToken.mockResolvedValue({ token: 'kc_ready_token', tokenPrefix: 'kc_ready_' });
        const writeText = vi.fn();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        const { getByRole, getByText } = render(<AgentActivityLog />);
        await waitFor(() => {
            expect(getByText(/Token ready/i)).toBeDefined();
        });

        fireEvent.click(getByRole('button', { name: /copy claude/i }));

        expect(writeText).toHaveBeenCalledWith('claude mcp add kernelcad -- npx -y kernelcad mcp --cloud --token kc_ready_token');
    });

    it('shows sign-in guidance when token creation is unauthorized', async () => {
        createMcpToken.mockRejectedValue(new Error('{"error":"missing_token"}'));
        const { getByText } = render(<AgentActivityLog />);
        await waitFor(() => {
            expect(getByText(/Sign in to create a cloud MCP token automatically/i)).toBeDefined();
        });
    });
});
