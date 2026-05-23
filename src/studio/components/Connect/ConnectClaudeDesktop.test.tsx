// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ConnectClaudeDesktop } from './ConnectClaudeDesktop';

const { createMcpToken } = vi.hoisted(() => ({
    createMcpToken: vi.fn(),
}));
vi.mock('../../../funnel/lib/apiClient', () => ({
    createMcpToken,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ConnectClaudeDesktop', () => {
    it('renders snippet with <TOKEN> placeholder before token is generated', () => {
        const { getByTestId } = render(<ConnectClaudeDesktop userEmail="user@example.com" />);
        const snippet = getByTestId('connect-snippet').textContent ?? '';
        expect(snippet).toContain('"kernelcad"');
        expect(snippet).toContain('<TOKEN>');
        // Copy button is disabled until a token is minted.
        expect(getByTestId('connect-copy-button').hasAttribute('disabled')).toBe(true);
    });

    it('mints a token only when the generate button is clicked', async () => {
        createMcpToken.mockResolvedValue({ token: 'kc_live_secret_value', tokenPrefix: 'kc_live' });
        const { getByTestId } = render(<ConnectClaudeDesktop userEmail="user@example.com" />);

        // The token API has NOT been called on mount — this is the difference
        // from AgentActivityLog (which auto-fetches). We only mint on user
        // intent.
        expect(createMcpToken).not.toHaveBeenCalled();

        fireEvent.click(getByTestId('connect-generate-button'));

        await waitFor(() => {
            expect(createMcpToken).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            const snippet = getByTestId('connect-snippet').textContent ?? '';
            expect(snippet).toContain('kc_live_secret_value');
        });
        // Prefix is rendered as confirmation.
        expect(getByTestId('connect-token-prefix').textContent).toContain('kc_live');
    });

    it('copies the snippet (with token) to the clipboard', async () => {
        createMcpToken.mockResolvedValue({ token: 'kc_clip_token', tokenPrefix: 'kc_clip' });
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        const { getByTestId } = render(<ConnectClaudeDesktop userEmail="user@example.com" />);
        fireEvent.click(getByTestId('connect-generate-button'));
        await waitFor(() => {
            expect((getByTestId('connect-snippet').textContent ?? '')).toContain('kc_clip_token');
        });
        fireEvent.click(getByTestId('connect-copy-button'));
        await waitFor(() => {
            expect(writeText).toHaveBeenCalledTimes(1);
        });
        const written = String(writeText.mock.calls[0][0]);
        expect(written).toContain('kc_clip_token');
        expect(written).toContain('"mcpServers"');
        expect(written).toContain('"kernelcad"');
    });

    it('switches the platform-specific config path via tabs', () => {
        const { getByTestId } = render(<ConnectClaudeDesktop userEmail="user@example.com" />);
        // Default: macOS
        expect(getByTestId('connect-config-path').textContent).toContain('Library/Application Support/Claude');

        fireEvent.click(getByTestId('connect-platform-windows'));
        expect(getByTestId('connect-config-path').textContent).toContain('%APPDATA%');

        fireEvent.click(getByTestId('connect-platform-linux'));
        expect(getByTestId('connect-config-path').textContent).toContain('.config/Claude');
    });

    it('shows an error if token minting fails', async () => {
        createMcpToken.mockRejectedValue(new Error('unauthorized'));
        const { getByTestId } = render(<ConnectClaudeDesktop userEmail="user@example.com" />);
        fireEvent.click(getByTestId('connect-generate-button'));
        await waitFor(() => {
            expect(getByTestId('connect-error').textContent).toContain('unauthorized');
        });
        // No token rendered.
        const snippet = getByTestId('connect-snippet').textContent ?? '';
        expect(snippet).toContain('<TOKEN>');
    });

    it('renders three numbered steps', () => {
        const { container } = render(<ConnectClaudeDesktop userEmail="user@example.com" />);
        const steps = container.querySelectorAll('ol > li');
        expect(steps.length).toBe(3);
    });
});
