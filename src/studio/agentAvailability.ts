// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * Built-in hosted generation is expensive and still maturing. Keep it behind an
 * explicit opt-in flag so live Studio defaults to MCP-first operation.
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
