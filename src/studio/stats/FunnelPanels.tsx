// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// /stats pieces fed by the newer server sections: the per-client OAuth
// funnel, the quota -> checkout -> paid row and the Studio mesh tile. Each
// section may be null (read failed / migration not applied) or absent (older
// server) and then says "not available yet" instead of showing zeros.

import type { ReactNode } from 'react';
import { clientLabel, clientOrder, fmtInt, fmtMs, fmtPct, ratio } from './derive';
import { Meter } from './charts';
import { OAUTH_STEPS, type AdminStats, type Funnel, type OAuthFunnel } from './types';
import { Figure, Note, SubHead } from './ui';

function NotYet({ what }: { what: string }): ReactNode {
  return <Note>{what}: not available yet (older server or its migration is not applied).</Note>;
}

const STEP_LABEL: Record<(typeof OAUTH_STEPS)[number], string> = {
  auth_shown: 'Sign-in shown', login_completed: 'Logged in', consent: 'Consent', grant: 'Grant',
};

export function OAuthFunnelView({ funnel, definition }: { funnel: OAuthFunnel | null | undefined; definition?: string }): ReactNode {
  if (!funnel) return <div><SubHead>Authorize funnel by client</SubHead><NotYet what="OAuth funnel" /></div>;
  const rows = [...funnel.by_client].sort((a, b) => clientOrder(a.client) - clientOrder(b.client));
  const methods = Array.isArray(funnel.login_methods)
    ? funnel.login_methods.map(m => [m.method, m.count] as const)
    : Object.entries(funnel.login_methods ?? {});
  return (
    <div>
      <SubHead>Authorize funnel by client (people)</SubHead>
      {rows.length === 0 ? <Note>No authorize attempts in this window.</Note> : (
        <div className="kcs-scroll">
          <table data-testid="oauth-funnel">
            <thead>
              <tr>
                <th scope="col">Client</th>
                {OAUTH_STEPS.map(s => <th key={s} scope="col" className="kcs-r">{STEP_LABEL[s]}</th>)}
                <th scope="col">Shown → grant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const shown = c.steps.auth_shown?.people ?? 0;
                const granted = c.steps.grant?.people ?? 0;
                return (
                  <tr key={c.client} data-testid="oauth-funnel-row">
                    <td style={{ color: 'var(--kcs-text)' }}>{clientLabel(c.client)}</td>
                    {OAUTH_STEPS.map(s => (
                      <td key={s} className="kcs-r">
                        {fmtInt(c.steps[s]?.people ?? 0)}{' '}
                        <span style={{ color: 'var(--kcs-muted)' }}>({fmtInt(c.steps[s]?.attempts ?? 0)})</span>
                      </td>
                    ))}
                    <td><Meter value={ratio(granted, shown)} label={`${clientLabel(c.client)} sign-in shown to grant`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {methods.length > 0 && (
        <Note>Login methods: {methods.map(([m, n]) => `${m} ${fmtInt(n)}`).join(' · ')}.</Note>
      )}
      <Note>
        People are distinct accounts; the number in brackets is authorize attempts. {definition ?? ''}
        {' '}The older “Registrations → granted” counts OAuth client registrations, and Claude registers a new client on almost every attempt, so it is kept only as a muted note.
      </Note>
    </div>
  );
}

const dash = (n: number | undefined): string => (n === undefined ? '—' : fmtInt(n));

export function QuotaFunnelRow({ funnel }: { funnel: Funnel | null | undefined }): ReactNode {
  if (!funnel) return <div><SubHead>Quota → checkout → paid</SubHead><NotYet what="Quota funnel" /></div>;
  const surfaces = Object.entries(funnel.quota_hits_by_surface ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const tools = Object.entries(funnel.quota_hits_by_tool ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div data-testid="quota-funnel">
      <SubHead>Quota → checkout → paid (people)</SubHead>
      <div className="flex flex-wrap gap-6">
        <Figure label="Hit a quota" value={dash(funnel.quota_hit_accounts)} />
        <Figure label="Started checkout after a hit" value={dash(funnel.checkout_after_quota_hit_accounts)} />
        <Figure label="Started checkout (all)" value={dash(funnel.checkout_started_accounts)} />
        <Figure label="Paid after checkout" value={dash(funnel.paid_after_checkout_accounts)} />
        <Figure label="Checkouts expired" value={dash(funnel.checkouts_expired)} />
      </div>
      <Note>
        {fmtInt(funnel.quota_hits ?? 0)} quota hits from {fmtInt(funnel.quota_hit_accounts ?? 0)} people; {fmtInt(funnel.checkout_started ?? 0)} checkouts started, {fmtInt(funnel.checkouts_completed ?? 0)} completed.
        {surfaces.length > 0 && ` By surface: ${surfaces.map(([k, n]) => `${k} ${n}`).join(' · ')}.`}
        {tools.length > 0 && ` By tool: ${tools.map(([k, n]) => `${k} ${n}`).join(' · ')}.`}
      </Note>
      <Note>People who hit a quota limit, then opened checkout, then paid. Counts since the funnel events started recording; earlier hits are not backfilled.</Note>
    </div>
  );
}

function Spark({ values, label }: { values: Array<number | null>; label: string }): ReactNode {
  const W = 120, H = 28;
  const pts = values.map((v, i) => (v === null ? null : [values.length <= 1 ? W / 2 : (i / (values.length - 1)) * W, H - 2 - v * (H - 4)] as const));
  const d = pts.map((p, i) => (p === null ? '' : `${i === 0 || pts[i - 1] === null ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ');
  return (
    <svg role="img" aria-label={label} width={W} height={H} viewBox={`0 0 ${W} ${H}`} data-testid="mesh-spark">
      <path d={d} fill="none" stroke="var(--kcs-series-1)" strokeWidth={1.5} />
    </svg>
  );
}

export function MeshTile({ stats }: { stats: AdminStats }): ReactNode {
  const mesh = stats.mesh;
  const proc = stats.health.mesh;
  if (!mesh) {
    return (
      <div data-testid="mesh-tile">
        <SubHead>Studio mesh</SubHead>
        {!proc ? <NotYet what="Studio mesh stats" /> : (
          <>
            <div className="flex flex-wrap gap-6">
              <Figure label="Success" value={fmtPct(proc.success_rate, 1)} />
              <Figure label="Served" value={fmtPct(proc.served_rate, 1)} />
              <Figure label="p50 / p95" value={proc.duration_ms.samples > 0 ? `${fmtMs(proc.duration_ms.p50)} / ${fmtMs(proc.duration_ms.p95)}` : '—'} />
            </div>
            <Note>
              Since the server last restarted (resets on every deploy); the windowed numbers are not available yet.
              {' '}{Object.entries(proc.outcomes).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(' · ')}
            </Note>
          </>
        )}
      </div>
    );
  }
  const errors = (mesh.top_errors ?? []).slice(0, 5);
  const byDay = mesh.success_rate_by_day;
  return (
    <div data-testid="mesh-tile">
      <SubHead>Studio mesh</SubHead>
      <div className="flex flex-wrap gap-6 items-end">
        <Figure label="Success" value={fmtPct(mesh.success_rate, 1)} />
        <Figure label="Served" value={fmtPct(mesh.served_rate ?? null, 1)} />
        <Figure label="p50 / p95" value={`${fmtMs(mesh.p50_ms)} / ${fmtMs(mesh.p95_ms)}`} />
        <Figure label="Cache hit" value={fmtPct(mesh.cache_hit_rate ?? null, 0)} />
        {byDay && byDay.length > 1 && byDay.some(v => v !== null) && <Spark values={byDay} label="Mesh success rate per day" />}
      </div>
      <Note>
        Success = meshes built / ({fmtInt(mesh.eligible ?? 0)} requests that count: aborted, rejected and still-meshing ones are left out). “Served” also counts the stored-revision fallback. Times are over successful requests.
      </Note>
      {errors.length > 0 && (
        <table>
          <thead><tr><th scope="col">Top mesh errors</th><th scope="col" className="kcs-r">Count</th></tr></thead>
          <tbody>
            {errors.map(e => (
              <tr key={e.code} data-testid="mesh-error-row"><td>{e.code}</td><td className="kcs-r">{fmtInt(e.n)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
