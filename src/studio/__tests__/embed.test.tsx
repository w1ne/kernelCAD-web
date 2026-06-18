// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Phase 1 embed-mode smoke tests. Covers the new public surface for hosts
// like proto.cat: backend-URL routing, controlled-mode source string,
// brush-report short-circuit, and Toolbar gating. We deliberately avoid
// mounting the full <StudioApp/> — it would drag in three.js, the kernel
// worker, and the WorkbenchProvider tree — and instead exercise each
// changed seam in isolation.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { StudioConfigProvider } from '../config/StudioConfigContext';
import { getEmbedConfig, setEmbedConfig } from '../config/embedConfigRef';
import type { BrushReport, StudioConfig } from '../config/types';

// Supabase is read by `apiCall()`. Stub it the same way scriptSource.test.ts
// does so the "unsigned-in" branch is exercised consistently.
vi.mock('../../funnel/lib/supabaseClient', () => ({
    getSupabase: () => ({
        auth: { getSession: async () => ({ data: { session: null } }) },
    }),
}));

afterEach(() => {
    cleanup();
    setEmbedConfig(null);
    // Tests in this file may install fake timers (CodeProvider debounce) and
    // spy on globals like `fetch`. Restore EVERYTHING so we never leak state
    // into a sibling test file that vitest runs in the same worker/shard —
    // e.g. GeometryContext.test.tsx asserts on a fresh `fetch` and a clean
    // `window`. `vi.unstubAllGlobals()` undoes any `vi.stubGlobal`,
    // `vi.restoreAllMocks()` undoes any `vi.spyOn`, and `vi.useRealTimers()`
    // guards against a fake-timer leak if a test throws before restoring.
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('StudioConfigProvider', () => {
    it('writes the config into the module-level embedConfigRef on mount', () => {
        const config: StudioConfig = { backendUrl: 'https://kc.protocat.local' };
        render(
            <StudioConfigProvider value={config}>
                <div />
            </StudioConfigProvider>,
        );
        expect(getEmbedConfig()).toEqual(config);
    });

    it('clears the module-level ref on unmount', () => {
        const config: StudioConfig = { backendUrl: 'https://kc.protocat.local' };
        const { unmount } = render(
            <StudioConfigProvider value={config}>
                <div />
            </StudioConfigProvider>,
        );
        expect(getEmbedConfig()).toEqual(config);
        unmount();
        expect(getEmbedConfig()).toBeNull();
    });
});

describe('apiCall() respects embed backendUrl', () => {
    beforeEach(() => {
        setEmbedConfig(null);
    });

    it('returns base="" when no embed config and no session (unchanged default)', async () => {
        const { apiCall } = await import('../api/apiBase');
        const { base, headers } = await apiCall();
        expect(base).toBe('');
        expect(headers).toEqual({});
    });

    it('returns embed.backendUrl as base when set, even without a session', async () => {
        setEmbedConfig({ backendUrl: 'https://kc.protocat.local' });
        const { apiCall } = await import('../api/apiBase');
        const { base } = await apiCall();
        expect(base).toBe('https://kc.protocat.local');
    });
});

describe('CodeProvider controlled mode', () => {
    it('fires debounced onCodeChange when setCode is called', async () => {
        vi.useFakeTimers();
        const onCodeChange = vi.fn();
        const { CodeProvider, useCode } = await import('../context/CodeContext');

        // Render a child that exposes setCode as a button click — keeps the
        // hook value local to the component (eslint react-hooks/globals).
        function EditButton() {
            const { setCode, hasControlledCode } = useCode();
            return (
                <>
                    <span data-testid="controlled-flag">{String(hasControlledCode)}</span>
                    <button type="button" data-testid="do-edit" onClick={() => setCode('// edited')}>
                        edit
                    </button>
                </>
            );
        }

        const { getByTestId } = render(
            <CodeProvider initialCode="// start" controlledCode="// start" onCodeChange={onCodeChange}>
                <EditButton />
            </CodeProvider>,
        );

        expect(getByTestId('controlled-flag').textContent).toBe('true');
        act(() => {
            getByTestId('do-edit').click();
        });
        expect(onCodeChange).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(onCodeChange).toHaveBeenCalledTimes(1);
        expect(onCodeChange).toHaveBeenCalledWith('// edited');
        vi.useRealTimers();
    });

    it('mirrors external controlledCode changes into local state', async () => {
        const { CodeProvider, useCode } = await import('../context/CodeContext');

        function CodeView() {
            const { code } = useCode();
            return <span data-testid="code">{code}</span>;
        }

        const { getByTestId, rerender } = render(
            <CodeProvider initialCode="// v1" controlledCode="// v1">
                <CodeView />
            </CodeProvider>,
        );
        expect(getByTestId('code').textContent).toBe('// v1');

        rerender(
            <CodeProvider initialCode="// v1" controlledCode="// v2 (agent produced)">
                <CodeView />
            </CodeProvider>,
        );
        expect(getByTestId('code').textContent).toBe('// v2 (agent produced)');
    });

    it('hasControlledCode is false in uncontrolled (standalone) mode', async () => {
        const { CodeProvider, useCode } = await import('../context/CodeContext');

        function Flag() {
            const { hasControlledCode } = useCode();
            return <span data-testid="flag">{String(hasControlledCode)}</span>;
        }

        const { getByTestId } = render(
            <CodeProvider initialCode="// start">
                <Flag />
            </CodeProvider>,
        );
        expect(getByTestId('flag').textContent).toBe('false');
    });
});

describe('onBrushReport short-circuit', () => {
    it('embed config carries onBrushReport through the module ref so MarkingOverlay can read it on unmount', () => {
        const onBrushReport = vi.fn();
        setEmbedConfig({ onBrushReport });
        const cfg = getEmbedConfig();
        expect(cfg?.onBrushReport).toBe(onBrushReport);

        // Simulate what MarkingOverlay does in `persistMark`: read embed ref,
        // call the callback if set, return without HTTP.
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('{}', { status: 200 }),
        );
        const report: BrushReport = {
            screenshot: 'data:image/png;base64,AAA',
            mask: 'data:image/png;base64,BBB',
            meta: {
                ts: '2026-01-01T00:00:00Z',
                ua: 'test',
                screenshotMissing: false,
                struckParts: [],
                raycastDebug: null,
            },
        };
        const embed = getEmbedConfig();
        if (embed?.onBrushReport) {
            embed.onBrushReport(report);
        }
        expect(onBrushReport).toHaveBeenCalledTimes(1);
        expect(onBrushReport).toHaveBeenCalledWith(report);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('Toolbar enableAgentRail gating', () => {
    it('renders the Agent toggle when enableAgentRail is true (default)', async () => {
        const { Toolbar } = await import('../Toolbar');
        const { queryByLabelText } = render(
            <Toolbar
                isModified={false}
                onValidate={() => {}}
                onRun={() => {}}
                agentRailOpen={false}
                onToggleAgentRail={() => {}}
                referenceImagesPresent={false}
                referenceImagesVisible={false}
                onToggleReferenceImages={() => {}}
                markingMode={false}
                onToggleMarkingMode={() => {}}
                sectionMode={false}
                onToggleSectionMode={() => {}}
                inspectorOpen={false}
                onToggleInspector={() => {}}
            />,
        );
        expect(queryByLabelText(/agent rail/i)).not.toBeNull();
    });

    it('hides the Agent toggle when enableAgentRail is false', async () => {
        const { Toolbar } = await import('../Toolbar');
        const { queryByLabelText } = render(
            <Toolbar
                isModified={false}
                onValidate={() => {}}
                onRun={() => {}}
                agentRailOpen={false}
                onToggleAgentRail={() => {}}
                enableAgentRail={false}
                referenceImagesPresent={false}
                referenceImagesVisible={false}
                onToggleReferenceImages={() => {}}
                markingMode={false}
                onToggleMarkingMode={() => {}}
                sectionMode={false}
                onToggleSectionMode={() => {}}
                inspectorOpen={false}
                onToggleInspector={() => {}}
            />,
        );
        expect(queryByLabelText(/agent rail/i)).toBeNull();
    });
});
