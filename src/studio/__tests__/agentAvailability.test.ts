/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalLocation = window.location;

function setHost(hostname: string) {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, hostname },
    });
}

afterEach(() => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    });
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe('inAppAgentEnabled', () => {
    it('is disabled on localhost even when an API backend is configured', async () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
        vi.stubEnv('VITE_ENABLE_IN_APP_AGENT', 'true');
        setHost('localhost');

        const { inAppAgentEnabled } = await import('../agentAvailability');

        expect(inAppAgentEnabled()).toBe(false);
    });

    it('is disabled on hosted origins by default even when an API backend is configured', async () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
        setHost('app.kernelcad.com');

        const { inAppAgentEnabled } = await import('../agentAvailability');

        expect(inAppAgentEnabled()).toBe(false);
    });

    it('is enabled on hosted origins only when the feature flag and API backend are configured', async () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
        vi.stubEnv('VITE_ENABLE_IN_APP_AGENT', 'true');
        setHost('app.kernelcad.com');

        const { inAppAgentEnabled } = await import('../agentAvailability');

        expect(inAppAgentEnabled()).toBe(true);
    });
});
