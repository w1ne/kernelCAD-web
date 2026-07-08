/**
 * The built-in Studio agent UI only makes sense on the hosted build, where a
 * generation backend is configured. Local Studio is driven by the developer's
 * external agent through MCP, so the in-app rail should stay out of the shell.
 */
export function inAppAgentEnabled(): boolean {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
            return false;
        }
    }
    if (import.meta.env?.VITE_ENABLE_IN_APP_AGENT !== 'true') {
        return false;
    }
    const base = import.meta.env?.VITE_API_BASE_URL;
    return typeof base === 'string' && base.length > 0;
}
