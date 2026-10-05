// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The /stats dashboard body: a KPI strip and five panels, each answering one
// question — (1) do people sign up and connect an agent, (2) do they succeed
// on the first try, (3) do they come back, (4) do they pay, (5) is prod
// healthy — plus the read-failures panel. Renders one AdminStats payload;
// fetching and auth live in routes/stats.tsx.

import type { ReactNode } from 'react';
import { ColumnChart, LineChart, Meter } from './charts';
import { clientLabel, clientOrder, fmtInt, fmtMs, fmtPct, kpis, ratio, retentionRate, sum } from './derive';
import { SERIES } from './palette';
import { SuccessPanel } from './SuccessPanel';
import type { AdminStats, Cohort, RetentionCell } from './types';
import { Figure, Note, Panel, SubHead, Unknown } from './ui';

function KpiStrip({ stats }: { stats: AdminStats }): ReactNode {
  return (
    <ul className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }} aria-label="Key numbers">
      {kpis(stats).map(k => (
        <li key={k.key} className="kcs-card" data-testid={`kpi-${k.key}`} style={{ padding: 12 }}>
          <div className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{k.label}</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: 'var(--kcs-text)' }}>{k.value}</div>
          <div className="text-xs mt-1" style={{ color: k.unknown ? 'var(--kcs-critical-text)' : 'var(--kcs-muted)' }}>{k.note}</div>
          <div className="text-xs mt-1" data-testid={`kpi-def-${k.key}`} style={{ color: 'var(--kcs-muted)' }}>{k.definition}</div>
        </li>
      ))}
    </ul>
  );
}

// (1) Sign-ups and agent connections ----------------------------------------
function GrowthPanel({ stats }: { stats: AdminStats }): ReactNode {
  const g = stats.growth;
  return (
    <Panel id="growth" title="Sign-ups and agent connections"
      question="Are people signing up and connecting an agent? Where do OAuth registrations fail to become grants?">
      {!g ? <Unknown section="growth" /> : (
        <>
          <div>
            <SubHead>Sign-ups per day</SubHead>
            <ColumnChart days={stats.days} label="Sign-ups per day"
              series={[{ key: 'signups', label: 'Sign-ups', color: SERIES.s1, values: g.signups }]} />
          </div>
          <div>
            <SubHead>Connections by client</SubHead>
            {g.by_client.length === 0 ? <Note>No OAuth clients or grants yet.</Note> : (
              <div className="kcs-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Client</th>
                      <th scope="col" className="kcs-r">Connected accounts</th>
                      <th scope="col" className="kcs-r">Registrations</th>
                      <th scope="col" className="kcs-r">Got a grant</th>
                      <th scope="col">Registration → grant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...g.by_client].sort((a, b) => clientOrder(a.client) - clientOrder(b.client)).map(c => (
                      <tr key={c.client} data-testid="client-row">
                        <td style={{ color: 'var(--kcs-text)' }}>{clientLabel(c.client)}</td>
                        <td className="kcs-r">{fmtInt(c.connected_accounts)}</td>
                        <td className="kcs-r">{fmtInt(c.registrations)}</td>
                        <td className="kcs-r">{fmtInt(c.registrations_granted)}</td>
                        <td><Meter value={ratio(c.registrations_granted, c.registrations)} label={`${clientLabel(c.client)} registration to grant`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Note>{stats.definitions['registration']}</Note>
          </div>
        </>
      )}
    </Panel>
  );
}

// (3) Retention -------------------------------------------------------------
function RetentionCellView({ cell }: { cell: RetentionCell }): ReactNode {
  const r = retentionRate(cell);
  return (
    <td className="kcs-r" title={`${cell.returned} of ${cell.eligible} eligible`}>
      {r === null ? '—' : `${fmtPct(r)} `}
      {r !== null && <span style={{ color: 'var(--kcs-muted)' }}>({cell.returned}/{cell.eligible})</span>}
    </td>
  );
}

function CohortTable({ cohorts }: { cohorts: Cohort[] }): ReactNode {
  if (cohorts.length === 0) return <Note>No sign-ups in these cohorts.</Note>;
  return (
    <div className="kcs-scroll">
      <table data-testid="cohort-table">
        <thead>
          <tr>
            <th scope="col">Sign-up week</th><th scope="col" className="kcs-r">Accounts</th><th scope="col" className="kcs-r">Activated</th>
            <th scope="col" className="kcs-r">D1</th><th scope="col" className="kcs-r">D7</th><th scope="col" className="kcs-r">D30</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map(c => (
            <tr key={c.week}>
              <td style={{ color: 'var(--kcs-text)' }}>{c.week}</td>
              <td className="kcs-r">{c.size}</td>
              <td className="kcs-r">{fmtPct(ratio(c.activated, c.size))}</td>
              <RetentionCellView cell={c.d1} /><RetentionCellView cell={c.d7} /><RetentionCellView cell={c.d30} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RetentionPanel({ stats }: { stats: AdminStats }): ReactNode {
  const a = stats.activity;
  return (
    <Panel id="retention" title="Activity and retention" question="Do people come back?">
      {!a ? <Unknown section="activity" /> : (
        <>
          <div>
            <SubHead>Active accounts per day</SubHead>
            <LineChart days={stats.days} label="Active accounts per day"
              series={[{ key: 'active', label: 'Active accounts', color: SERIES.s1, values: a.active_by_day }]} />
          </div>
          <div>
            <SubHead>New projects per day</SubHead>
            <ColumnChart days={stats.days} label="New projects per day, owned and anonymous" series={[
              { key: 'owned', label: 'Owned', color: SERIES.s1, values: a.projects_owned },
              { key: 'anonymous', label: 'Anonymous', color: SERIES.s2, values: a.projects_anonymous },
            ]} />
            <Note>{fmtInt(sum(a.revisions))} revisions in the window.</Note>
          </div>
          <div>
            <SubHead>Weekly sign-up cohorts</SubHead>
            <CohortTable cohorts={a.cohorts} />
            <Note>{stats.definitions['returned']} {stats.definitions['activity']}</Note>
          </div>
        </>
      )}
    </Panel>
  );
}

// (4) Money -----------------------------------------------------------------
function MoneyPanel({ stats }: { stats: AdminStats }): ReactNode {
  const m = stats.money;
  return (
    <Panel id="money" title="Money" question="Do they pay?">
      {!m ? <Unknown section="billing" /> : (
        <div className="flex flex-wrap gap-6">
          {Object.keys(m.active_by_tier).length === 0
            ? <Figure label="Active subscriptions" value="0" />
            : Object.entries(m.active_by_tier).sort().map(([tier, n]) => (
              <Figure key={tier} label={`Active — ${tier}`} value={fmtInt(n)} />
            ))}
          <Figure label="Past due" value={fmtInt(m.past_due)} />
          <Figure label="Checkouts completed" value={fmtInt(m.checkouts_completed)} />
          <Figure label="Cancellations" value={fmtInt(m.cancellations)} />
          <Figure label="Failed payments" value={fmtInt(m.payment_failures)} />
        </div>
      )}
      <Note>Subscriptions are current; checkouts, cancellations and failed payments are Stripe events in the window.</Note>
    </Panel>
  );
}

// (5) Health ----------------------------------------------------------------
function HealthPanel({ stats }: { stats: AdminStats }): ReactNode {
  const h = stats.health;
  const kills = Object.entries(h.pool.kills);
  const u = h.uptime;
  return (
    <Panel id="health" title="Health" question="Is prod healthy right now?">
      <div className="flex flex-wrap gap-6">
        <Figure label="Deployed commit" value={h.commit.slice(0, 7)} />
        <Figure label="Process started" value={new Date(h.process_started_at).toLocaleString()} />
        <Figure label="Workers (busy)" value={`${h.pool.workers} (${h.pool.busy})`} />
        <Figure label="Queue" value={String(h.pool.queue_depth)} />
        <Figure label="Worker RSS" value={h.pool.rss_mb.length ? h.pool.rss_mb.map(r => `${Math.round(r)} MB`).join(' · ') : '—'} />
        <Figure label="Respawns / recycles" value={`${h.pool.respawns} / ${h.pool.recycles}`} />
      </div>
      <div>
        <SubHead>Pool kills since start</SubHead>
        <p className="text-sm kcs-num" style={{ color: 'var(--kcs-text-2)' }}>
          {kills.map(([cause, n]) => `${cause} ${n}`).join(' · ') || '—'}
        </p>
      </div>
      <div>
        <SubHead>Uptime monitor</SubHead>
        {!h.uptime_configured ? <Note>Not configured (UPTIME_STATUS_URL is unset on the server).</Note>
          : !u ? <Unknown section="uptime monitor" /> : (
            <>
              <table>
                <thead><tr><th scope="col">Check</th><th scope="col">Now</th><th scope="col" className="kcs-r">Uptime</th><th scope="col" className="kcs-r">p95</th></tr></thead>
                <tbody>
                  {u.checks.map(c => (
                    <tr key={c.check} data-testid="uptime-row">
                      <td>{c.check}</td>
                      <td style={{ color: c.ok_now === false ? 'var(--kcs-critical-text)' : undefined }}>
                        {c.ok_now == null ? '—' : c.ok_now ? 'passing' : 'failing'}
                      </td>
                      <td className="kcs-r">{c.uptime_pct === null ? '—' : `${c.uptime_pct.toFixed(2)}%`}</td>
                      <td className="kcs-r">
                        {c.p95_ms != null ? fmtMs(c.p95_ms) : c.latency_ms != null ? `${fmtMs(c.latency_ms)} (last)` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Note>
                {u.last_run_at ? `Last run ${new Date(u.last_run_at).toLocaleString()}. ` : ''}
                {u.uptime_pct === null
                  ? 'No uptime % yet: the deployed monitor does not serve /summary.'
                  : `${u.window_days ? `Last ${u.window_days} days` : 'Monitor window'} (the monitor keeps 7): ${u.incidents} incidents · ${u.blips} blips · ${u.deploys} deploys.`}
              </Note>
              <Note>{stats.definitions['uptime'] ?? ''}</Note>
            </>
          )}
      </div>
    </Panel>
  );
}

function ReadFailuresPanel({ stats }: { stats: AdminStats }): ReactNode {
  const f = stats.read_failures;
  return (
    <section aria-labelledby="rf-h" className="kcs-card" data-testid="panel-read-failures">
      <h2 id="rf-h" className="text-base font-semibold">Read failures</h2>
      {f.length === 0 ? (
        <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--kcs-good-text)' }}>
          <span aria-hidden="true">✓</span> Every read succeeded.
        </p>
      ) : (
        <>
          <p className="text-sm mt-1" style={{ color: 'var(--kcs-critical-text)' }}>
            <span aria-hidden="true">⚠ </span>{f.length} read{f.length === 1 ? '' : 's'} failed — those numbers are unknown, not zero.
          </p>
          <table className="mt-2">
            <thead><tr><th scope="col">Source</th><th scope="col">Section</th><th scope="col">Code</th></tr></thead>
            <tbody>
              {f.map(x => (
                <tr key={`${x.source}/${x.section}/${x.code}`} data-testid="read-failure-row">
                  <td>{x.source}</td><td>{x.section}</td><td className="kcs-num">{x.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export function StatsDashboard({ stats }: { stats: AdminStats }): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <KpiStrip stats={stats} />
      <GrowthPanel stats={stats} />
      <SuccessPanel stats={stats} />
      <RetentionPanel stats={stats} />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <MoneyPanel stats={stats} />
        <HealthPanel stats={stats} />
      </div>
      <ReadFailuresPanel stats={stats} />
      <p className="text-xs" style={{ color: 'var(--kcs-muted)' }}>
        Excludes {stats.excluded.accounts} internal account{stats.excluded.accounts === 1 ? '' : 's'} and projects titled
        “{stats.excluded.dogfood_title_prefix}…”. Days are UTC. Generated {new Date(stats.generated_at).toLocaleString()}.
      </p>
    </div>
  );
}
