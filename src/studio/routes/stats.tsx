// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// /stats — the owner's product dashboard. Signed-in only; the server decides
// who is an admin (GET /api/v1/admin/stats answers 403 to everyone else, and
// the page then shows "Not authorised"). One request per window.
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../../funnel/hooks/useSession';
import { ApiError, fetchAdminStats } from '../../funnel/lib/apiClient';
import { StatsDashboard } from '../stats/StatsDashboard';
import { STATS_CSS } from '../stats/palette';
import { STATS_WINDOWS, type AdminStats, type StatsWindow } from '../stats/types';

export const Route = createFileRoute('/stats')({
  component: StatsPage,
});

const WINDOW_LABELS: Record<StatsWindow, string> = { '7d': '7 days', '28d': '28 days', '90d': '90 days' };

function isStatsWindow(v: string | null): v is StatsWindow {
  return v !== null && (STATS_WINDOWS as readonly string[]).includes(v);
}

/** Initial window from `?window=`, so a view can be linked to. */
function initialWindow(): StatsWindow {
  if (typeof window === 'undefined') return '28d';
  const v = new URLSearchParams(window.location.search).get('window');
  return isStatsWindow(v) ? v : '28d';
}

function syncWindowToUrl(w: StatsWindow): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (w === '28d') url.searchParams.delete('window');
  else url.searchParams.set('window', w);
  window.history.replaceState(window.history.state, '', url.toString());
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; stats: AdminStats };

function Shell({ children, controls }: { children: ReactNode; controls?: ReactNode }): ReactNode {
  return (
    <div className="kc-stats">
      <style>{STATS_CSS}</style>
      <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1120, padding: '16px 16px 48px' }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">kernelCAD stats</h1>
          {controls}
        </header>
        {children}
      </div>
    </div>
  );
}

function StatsPage(): ReactNode {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [win, setWin] = useState<StatsWindow>(initialWindow);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!loading && !session) navigate({ to: '/signin', search: { next: '/stats' } });
  }, [loading, session, navigate]);

  const load = useCallback((w: StatsWindow) => {
    const id = ++seq.current;
    setRefreshing(true);
    fetchAdminStats(w)
      .then(stats => { if (id === seq.current) setState({ kind: 'ready', stats }); })
      .catch((e: unknown) => {
        if (id !== seq.current) return;
        if (e instanceof ApiError && e.status === 403) setState({ kind: 'forbidden' });
        else setState({ kind: 'error', message: e instanceof ApiError ? `HTTP ${e.status}` : String(e) });
      })
      .finally(() => { if (id === seq.current) setRefreshing(false); });
  }, []);

  const hasSession = Boolean(session);
  useEffect(() => {
    if (hasSession) load(win);
  }, [hasSession, win, load]);

  if (loading || !session) {
    return <Shell><p style={{ color: 'var(--kcs-muted)' }}>Loading…</p></Shell>;
  }
  if (state.kind === 'forbidden') {
    return (
      <Shell>
        <div className="kcs-card" data-testid="stats-forbidden">
          <h2 className="text-base font-semibold">Not authorised</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--kcs-text-2)' }}>
            This page is for kernelCAD admins. <a href="/me" style={{ textDecoration: 'underline' }}>Back to your projects</a>.
          </p>
        </div>
      </Shell>
    );
  }

  const controls = (
    <div role="group" aria-label="Window" className="flex gap-2">
      {STATS_WINDOWS.map(w => (
        <button key={w} type="button" className="kcs-tab" aria-pressed={w === win}
          onClick={() => { if (w !== win) { setWin(w); syncWindowToUrl(w); } }}>
          {WINDOW_LABELS[w]}
        </button>
      ))}
    </div>
  );

  return (
    <Shell controls={controls}>
      {state.kind === 'loading' && <p style={{ color: 'var(--kcs-muted)' }}>Loading stats…</p>}
      {state.kind === 'error' && (
        <div className="kcs-card" role="alert" data-testid="stats-error">
          <p className="text-sm" style={{ color: 'var(--kcs-critical-text)' }}>Could not load stats ({state.message}).</p>
          <button type="button" className="kcs-tab mt-2" onClick={() => load(win)}>Retry</button>
        </div>
      )}
      {state.kind === 'ready' && (
        // Refetch keeps the frame: the previous render stays, dimmed.
        <div aria-busy={refreshing} style={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 120ms' }}>
          <StatsDashboard stats={state.stats} />
        </div>
      )}
    </Shell>
  );
}
