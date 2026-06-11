// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
    it('does NOT mint a token on mount (waits for explicit Generate click)', () => {
        createMcpToken.mockResolvedValue({ token: 'kc_ready_token', tokenPrefix: 'kc_ready_' });
        const { getByRole } = render(<AgentActivityLog />);
        expect(createMcpToken).not.toHaveBeenCalled();
        // Connector card prompts for explicit Generate click rather than running on mount.
        expect(getByRole('button', { name: /generate a cloud mcp token/i })).toBeDefined();
    });

    it('mints a token on Generate click and reveals the commands with the token inline', async () => {
        createMcpToken.mockResolvedValue({ token: 'kc_ready_token', tokenPrefix: 'kc_ready_' });
        const { getByText, getByRole } = render(<AgentActivityLog />);

        fireEvent.click(getByRole('button', { name: /generate a cloud mcp token/i }));

        await waitFor(() => {
            expect(getByText(/Token ready/i)).toBeDefined();
        });
        expect(createMcpToken).toHaveBeenCalledTimes(1);
        expect(getByText(/claude mcp add kernelcad -- npx -y kernelcad mcp --cloud --token kc_ready_token/i)).toBeDefined();
        expect(getByText(/codex mcp add kernelcad -- npx -y kernelcad mcp --cloud --token kc_ready_token/i)).toBeDefined();
        expect(getByText(/Studio Agent Mode/i)).toBeDefined();
        expect(getByText(/^cloud$/i)).toBeDefined();
    });

    it('keeps copy buttons disabled until a token exists', () => {
        createMcpToken.mockResolvedValue({ token: 'kc_ready_token', tokenPrefix: 'kc_ready_' });
        const { getByRole } = render(<AgentActivityLog />);
        const copyClaude = getByRole('button', { name: /copy claude/i }) as HTMLButtonElement;
        const copyCodex = getByRole('button', { name: /copy codex/i }) as HTMLButtonElement;
        expect(copyClaude.disabled).toBe(true);
        expect(copyCodex.disabled).toBe(true);
    });

    it('copies the selected connect command with the minted token', async () => {
        createMcpToken.mockResolvedValue({ token: 'kc_ready_token', tokenPrefix: 'kc_ready_' });
        const writeText = vi.fn();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        const { getByRole, getByText } = render(<AgentActivityLog />);

        fireEvent.click(getByRole('button', { name: /generate a cloud mcp token/i }));
        await waitFor(() => {
            expect(getByText(/Token ready/i)).toBeDefined();
        });

        fireEvent.click(getByRole('button', { name: /copy claude/i }));

        expect(writeText).toHaveBeenCalledWith('claude mcp add kernelcad -- npx -y kernelcad mcp --cloud --token kc_ready_token');
    });

    it('shows sign-in guidance when token creation is unauthorized', async () => {
        createMcpToken.mockRejectedValue(new Error('{"error":"missing_token"}'));
        const { getByText, getByRole } = render(<AgentActivityLog />);
        fireEvent.click(getByRole('button', { name: /generate a cloud mcp token/i }));
        await waitFor(() => {
            expect(getByText(/Sign in to mint a cloud MCP token/i)).toBeDefined();
        });
    });

    it('issues a fresh token on Generate re-click; aria-label flips to "new"', async () => {
        createMcpToken
            .mockResolvedValueOnce({ token: 'kc_first', tokenPrefix: 'kc_first' })
            .mockResolvedValueOnce({ token: 'kc_second', tokenPrefix: 'kc_second' });

        const { getByRole, getByText } = render(<AgentActivityLog />);
        fireEvent.click(getByRole('button', { name: /generate a cloud mcp token/i }));
        await waitFor(() => {
            expect(getByText(/claude mcp add kernelcad .* --token kc_first/i)).toBeDefined();
        });

        const secondClickButton = getByRole('button', { name: /generate a new cloud mcp token/i });
        fireEvent.click(secondClickButton);
        await waitFor(() => {
            expect(getByText(/claude mcp add kernelcad .* --token kc_second/i)).toBeDefined();
        });
        expect(createMcpToken).toHaveBeenCalledTimes(2);
    });
});
