// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// /stats route: every panel renders from one payload, a non-admin sees
// "Not authorised" (403), the window tabs refetch, and empty / failed
// sections render as empty states or "unknown", never as zeros.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { NEWER_SECTIONS, adminStatsFixture } from './fixtures/adminStatsFixture';

const routerMock = vi.hoisted(() => ({
    navigate: vi.fn(),
    page: undefined as ComponentType | undefined,
}));

const mocks = vi.hoisted(() => ({
    useSession: vi.fn(),
    fetchAdminStats: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
    createFileRoute: () => (options: { component: ComponentType }) => {
        routerMock.page = options.component;
        return { options };
    },
    useNavigate: () => routerMock.navigate,
}));

vi.mock('../../funnel/hooks/useSession', () => ({ useSession: mocks.useSession }));

vi.mock('../../funnel/lib/apiClient', async () => {
    const actual = await vi.importActual<typeof import('../../funnel/lib/apiClient')>('../../funnel/lib/apiClient');
    return { ApiError: actual.ApiError, fetchAdminStats: mocks.fetchAdminStats };
});

vi.mock('../../funnel/lib/supabaseClient', () => ({ getSupabase: () => ({ auth: {} }) }));

import '../routes/stats';
import { ApiError } from '../../funnel/lib/apiClient';

function renderStatsPage() {
    const Page = routerMock.page;
    if (!Page) throw new Error('stats route did not register a component');
    return render(<Page />);
}

const signedIn = { session: { user: { email: 'owner@example.com' } }, loading: false };

beforeEach(() => {
    routerMock.navigate.mockClear();
    mocks.useSession.mockReset();
    mocks.fetchAdminStats.mockReset();
    window.history.replaceState(null, '', '/stats');
});

afterEach(() => {
    cleanup();
});

describe('/stats', () => {
    it('sends signed-out visitors to /signin and back', () => {
        mocks.useSession.mockReturnValue({ session: null, loading: false });
        renderStatsPage();
        expect(routerMock.navigate).toHaveBeenCalledWith({ to: '/signin', search: { next: '/stats' } });
        expect(mocks.fetchAdminStats).not.toHaveBeenCalled();
    });

    it('renders the KPI strip and every panel from one payload', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockResolvedValue(adminStatsFixture());
        renderStatsPage();

        await screen.findByTestId('panel-growth');
        expect(mocks.fetchAdminStats).toHaveBeenCalledTimes(1);
        expect(mocks.fetchAdminStats).toHaveBeenCalledWith('28d');

        const kpi = (k: string) => screen.getByTestId(`kpi-${k}`).textContent;
        expect(kpi('signups')).toContain('334');
        expect(kpi('active')).toContain('212');
        expect(kpi('connected')).toContain('386');
        expect(kpi('connected')).toContain('+71');
        expect(kpi('paying')).toContain('7');
        expect(kpi('gen')).toContain('70%');
        expect(kpi('mcp')).toContain('3.0%');
        expect(kpi('exports')).toContain('90%'); // 45 of 50
        expect(kpi('uptime')).toContain('99.65%');

        for (const id of ['growth', 'success', 'retention', 'money', 'health', 'read-failures']) {
            expect(screen.getByTestId(`panel-${id}`)).toBeDefined();
        }
        // Clients in fixed order; registration → granted is a muted secondary column.
        // Clients in fixed order, with the registration → grant conversion.
        const rows = screen.getAllByTestId('client-row');
        expect(rows.map(r => r.firstChild?.textContent)).toEqual(['Claude', 'ChatGPT', 'Claude Code', 'Other']);
        expect(rows[0]!.textContent).toContain('45 / 180'); // old registration → granted, muted

        expect(screen.getAllByTestId('failure-row')).toHaveLength(3);
        expect(screen.getAllByTestId('tool-row')).toHaveLength(3);
        // Failing tools: most errors first, error-free tools left out.
        expect(screen.getAllByTestId('failing-tool-row').map(r => r.firstChild?.textContent)).toEqual(['evaluate_script', 'export']);
        expect(screen.getAllByTestId('export-row')).toHaveLength(2);
        expect(screen.getByTestId('cohort-table').textContent).toContain('30%'); // 97 / 322
        expect(screen.getAllByTestId('uptime-row')).toHaveLength(1);
        expect(screen.getByText('0123456')).toBeDefined();
        expect(screen.getByText('Every read succeeded.')).toBeDefined();
        // Charts have an accessible name and a table view.
        expect(screen.getByRole('img', { name: 'Sign-ups per day' })).toBeDefined();
        expect(screen.getAllByText('Table').length).toBeGreaterThan(3);
    });

    it('renders the corrected (v2) metrics with a definition per tile and honest data windows', async () => {
        const base = adminStatsFixture();
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockResolvedValue(adminStatsFixture({
            definitions: { ...base.definitions, mcp_rejected: 'Model rejection rate: rejected / calls.', connected: 'Accounts with a live OAuth grant.' },
            mcp: {
                ...base.mcp!,
                version: 2,
                data_since: '2026-09-26',
                calls: 1100,
                refused: 100,
                errors: 20,
                rejected: 300,
                excluded: { monitor: 2000, probe: 40 },
                rejected_by_day: [0, 0, 0, 100, 100, 50, 50],
                tools: [{ tool: 'review_cad', calls: 100, rejected: 70, tool_errors: 2, exceptions: 1, refused: 0, p50_ms: 1, p95_ms: 2 }],
                diagnostics: [
                    { tool: 'review_cad', outcome: 'rejected', code: 'review.verdict', count: 70 },
                    { tool: 'diff_geometry', outcome: 'tool_error', code: 'cli.invalid-args', count: 3 },
                ],
            },
            exports_persisted: {
                studio_data_since: '2026-09-29',
                mcp_data_since: '2026-09-26',
                studio: {
                    formats: {
                        step: { total: 10, ok: 8, warning: 1, rejected: 0, failed: 1, aborted: 0 },
                        dxf: { total: 5, ok: 2, warning: 0, rejected: 3, failed: 0, aborted: 0 },
                    },
                    duration_ms: null,
                },
                mcp: { calls: 6, ok: 5, rejected: 0, errors: 1, refused: 0 },
            },
            generations: {
                ...base.generations!,
                instrumented_since: '2026-09-28',
                legacy_unrecorded: 4,
                failures: [{ status: 'timeout', reason: 'legacy', stage: 'legacy', count: 4 }],
            },
            health: {
                ...base.health,
                uptime: {
                    from: null, to: null, window_days: null, uptime_pct: null, passing_now: 7, total_now: 8,
                    last_run_at: '2026-09-29T09:55:00.000Z',
                    checks: [{ check: 'web_app', ok_now: false, latency_ms: 3000, uptime_pct: null, p50_ms: null, p95_ms: null }],
                    incidents: 0, blips: 0, deploys: 0,
                },
            },
        }));
        renderStatsPage();
        await screen.findByTestId('panel-growth');

        const kpi = (k: string) => screen.getByTestId(`kpi-${k}`).textContent;
        expect(kpi('mcp')).toContain('2.0%');
        expect(kpi('mcp')).toContain('since 2026-09-26');
        expect(screen.getByTestId('kpi-def-mcp').textContent).toMatch(/Refused calls, model rejections, the uptime monitor and probes are not counted/);
        expect(kpi('rejected')).toContain('30.0%');
        expect(kpi('exports')).toContain('89%'); // (9 + 2 + 5) / (16 + 1 + 1)
        expect(kpi('exports')).toContain('3 rejected');
        expect(kpi('exports')).toContain('Studio since 2026-09-29, MCP since 2026-09-26');
        expect(screen.getByTestId('kpi-def-connected').textContent).toBe('Accounts with a live OAuth grant.');
        expect(within(screen.getByTestId('panel-success')).getByText(/MCP tool calls include our own traffic\./)).toBeDefined();
        expect(kpi('uptime')).toContain('7/8');
        for (const k of ['signups', 'active', 'connected', 'paying', 'gen', 'mcp', 'rejected', 'exports', 'uptime']) {
            expect(screen.getByTestId(`kpi-def-${k}`).textContent!.length).toBeGreaterThan(10);
        }
        expect(screen.getByText('2,000 / 40')).toBeDefined();
        expect(screen.getAllByTestId('code-row').map(r => r.textContent)).toEqual(['review_cadreview.verdictrejected70', 'diff_geometrycli.invalid-argsfailed3']);
        expect(screen.getAllByTestId('export-row')).toHaveLength(3);
        expect(screen.getByText(/Reasons are recorded since 2026-09-28\. 4 older failed runs show “legacy”/)).toBeDefined();
        expect(screen.getByText('failing')).toBeDefined();
        expect(screen.getByText(/No uptime % yet/)).toBeDefined();
    });

    it('shows "Not authorised" on 403', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockRejectedValue(new ApiError('{"error":"forbidden"}', 403));
        renderStatsPage();
        expect(await screen.findByTestId('stats-forbidden')).toBeDefined();
        expect(screen.getByText('Not authorised')).toBeDefined();
        expect(screen.queryByTestId('panel-growth')).toBeNull();
    });

    it('shows a retryable error for other failures', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockRejectedValueOnce(new ApiError('boom', 502));
        mocks.fetchAdminStats.mockResolvedValueOnce(adminStatsFixture());
        renderStatsPage();
        expect((await screen.findByTestId('stats-error')).textContent).toContain('HTTP 502');
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        await screen.findByTestId('panel-growth');
    });

    it('switches windows with one request each and keeps the choice in the URL', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockImplementation(async (w: string) => adminStatsFixture({ window: w as '7d' }));
        renderStatsPage();
        await screen.findByTestId('panel-growth');

        const tab7 = screen.getByRole('button', { name: '7 days' });
        expect(tab7.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(tab7);
        await waitFor(() => expect(mocks.fetchAdminStats).toHaveBeenLastCalledWith('7d'));
        expect(tab7.getAttribute('aria-pressed')).toBe('true');
        expect(window.location.search).toBe('?window=7d');

        fireEvent.click(screen.getByRole('button', { name: '90 days' }));
        await waitFor(() => expect(mocks.fetchAdminStats).toHaveBeenLastCalledWith('90d'));
        expect(mocks.fetchAdminStats).toHaveBeenCalledTimes(3);
    });

    it('reads the initial window from ?window=', async () => {
        window.history.replaceState(null, '', '/stats?window=90d');
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockResolvedValue(adminStatsFixture());
        renderStatsPage();
        await screen.findByTestId('panel-growth');
        expect(mocks.fetchAdminStats).toHaveBeenCalledWith('90d');
    });

    it('renders empty states when nothing happened', async () => {
        const zeros = [0, 0, 0, 0, 0, 0, 0];
        const base = adminStatsFixture();
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockResolvedValue(adminStatsFixture({
            growth: { ...base.growth!, signups: zeros, by_client: [] },
            activity: { ...base.activity!, active_accounts: 0, active_by_day: zeros, projects_owned: zeros, projects_anonymous: zeros, revisions: zeros, cohorts: [] },
            generations: { ...base.generations!, total: 0, by_status: {}, by_day: {}, failures: [] },
            mcp: { ...base.mcp!, calls: 0, errors: 0, calls_by_day: zeros, errors_by_day: zeros, tools: [], clients: [], diagnostics: [] },
            exports: { ...base.exports, formats: {} },
            health: { ...base.health, uptime: null, uptime_configured: false },
        }));
        renderStatsPage();
        await screen.findByTestId('panel-growth');
        expect(screen.getAllByTestId('chart-empty').length).toBe(5);
        expect(screen.getByText('No OAuth clients or grants yet.')).toBeDefined();
        expect(screen.getByText('No failed runs in this window.')).toBeDefined();
        expect(screen.getByText('No tool errors in this window.')).toBeDefined();
        expect(screen.getByText('No exports since the server started.')).toBeDefined();
        expect(screen.getByText('No sign-ups in these cohorts.')).toBeDefined();
        expect(screen.getByTestId('kpi-gen').textContent).toContain('—');
        expect(screen.getByTestId('kpi-uptime').textContent).toContain('monitor not configured');
    });

    it('shows failed reads as unknown, never as zero, and lists them', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockResolvedValue(adminStatsFixture({
            mcp: null,
            money: null,
            health: { ...adminStatsFixture().health, uptime: null },
            read_failures: [
                { source: 'db', section: 'mcp', code: '42P01' },
                { source: 'db', section: 'money', code: '57014' },
                { source: 'uptime', section: 'health.uptime', code: 'timeout' },
            ],
        }));
        renderStatsPage();
        await screen.findByTestId('panel-growth');
        expect(screen.getByTestId('kpi-mcp').textContent).toContain('read failed');
        expect(screen.getByTestId('kpi-paying').textContent).toContain('read failed');
        expect(screen.getByTestId('kpi-uptime').textContent).toContain('read failed');
        expect(screen.getAllByTestId('read-failure-row')).toHaveLength(3);
        expect(screen.getByText(/3 reads failed/)).toBeDefined();
        expect(within(screen.getByTestId('panel-money')).getByText(/read failed/)).toBeDefined();
    });
});

describe('/stats newer sections', () => {
    it('renders the OAuth funnel, quota funnel, mesh tile and ever-connected', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchAdminStats.mockResolvedValue(adminStatsFixture(NEWER_SECTIONS));
        renderStatsPage();
        await screen.findByTestId('panel-growth');
        const row = screen.getByTestId('oauth-funnel-row');
        expect(row.textContent).toContain('300');
        expect(row.textContent).toContain('(400)');
        expect(screen.getByTestId('quota-funnel').textContent).toContain('Paid after checkout');
        const mesh = screen.getByTestId('mesh-tile');
        expect(mesh.textContent).toContain('97.0%');
        expect(mesh.textContent).toContain('mesh.timeout');
        expect(screen.getByTestId('mesh-spark')).toBeTruthy();
        expect(screen.getByTestId('kpi-connected').textContent).toContain('520 ever');
    });

    it('falls back to since-restart mesh counters and says not available when sections are null', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        const base = adminStatsFixture({ oauth_funnel: null, funnel: null, mesh: null });
        base.health = { ...base.health, mesh: { outcomes: { ok: 11, error: 1 }, cache: { hit: 3 }, success_rate: 11 / 12, served_rate: 11 / 12, duration_ms: { samples: 11, p50: 700, p95: 2000, max: 3000 } } };
        mocks.fetchAdminStats.mockResolvedValue(base);
        renderStatsPage();
        await screen.findByTestId('panel-growth');
        expect(screen.getByTestId('mesh-tile').textContent).toContain('Since the server last restarted');
        expect(screen.getByTestId('mesh-tile').textContent).toContain('91.7%');
        expect(screen.queryByTestId('quota-funnel')).toBeNull();
        expect(screen.getAllByText(/not available yet/).length).toBeGreaterThanOrEqual(2);
    });
});
