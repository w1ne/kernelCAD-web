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
import {
  clientLabel,
  clientOrder,
  failingTools,
  fmtInt,
  fmtMs,
  fmtPct,
  generationGroups,
  kpis,
  ratio,
  retentionRate,
  sum,
  toolErrors,
} from './derive';
import { SERIES } from './palette';
import type { AdminStats, Cohort, RetentionCell } from './types';

function Panel({ id, title, question, children }: { id: string; title: string; question: string; children: ReactNode }): ReactNode {
  return (
    <section aria-labelledby={`${id}-h`} className="kcs-card flex flex-col gap-4" data-testid={`panel-${id}`}>
      <header>
        <h2 id={`${id}-h`} className="text-base font-semibold" style={{ color: 'var(--kcs-text)' }}>{title}</h2>
        <p className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{question}</p>
      </header>
      {children}
    </section>
  );
}

function SubHead({ children }: { children: ReactNode }): ReactNode {
  return <h3 className="text-sm font-medium" style={{ color: 'var(--kcs-text-2)' }}>{children}</h3>;
}

function Unknown({ section }: { section: string }): ReactNode {
  return (
    <p className="text-sm" style={{ color: 'var(--kcs-critical-text)' }}>
      Unknown — the {section} read failed (see Read failures).
    </p>
  );
}

function Note({ children }: { children: ReactNode }): ReactNode {
  return <p className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{children}</p>;
}

function Figure({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color: 'var(--kcs-text)' }}>{value}</div>
    </div>
  );
}

function KpiStrip({ stats }: { stats: AdminStats }): ReactNode {
  return (
    <ul className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }} aria-label="Key numbers">
      {kpis(stats).map(k => (
        <li key={k.key} className="kcs-card" data-testid={`kpi-${k.key}`} style={{ padding: 12 }}>
          <div className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{k.label}</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: 'var(--kcs-text)' }}>{k.value}</div>
          <div className="text-xs mt-1" style={{ color: k.unknown ? 'var(--kcs-critical-text)' : 'var(--kcs-muted)' }}>{k.note}</div>
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

// (2) First-try success -----------------------------------------------------
function SuccessPanel({ stats }: { stats: AdminStats }): ReactNode {
  const g = stats.generations;
  const m = stats.mcp;
  const days = stats.days;
  const groups = g ? generationGroups(g, days.length) : null;
  const failing = m ? failingTools(m.tools) : [];
  const formats = Object.entries(stats.exports.formats).sort((a, b) => b[1].total - a[1].total);
  return (
    <Panel id="success" title="First-try success"
      question="Do hosted-agent runs, MCP tool calls and exports succeed?">
      <div>
        <SubHead>Hosted agent — runs per day</SubHead>
        {!g || !groups ? <Unknown section="generations" /> : (
          <>
            <ColumnChart days={days} label="Hosted-agent runs per day by outcome" series={[
              { key: 'done', label: 'Done', color: SERIES.good, values: groups.done },
              { key: 'partial', label: 'Partial', color: SERIES.warning, values: groups.partial },
              { key: 'failed', label: 'Failed', color: SERIES.critical, values: groups.failed },
            ]} />
            <div className="flex flex-wrap gap-6 mt-2">
              <Figure label="Duration p50 / p95" value={`${fmtMs(g.duration_ms?.p50)} / ${fmtMs(g.duration_ms?.p95)}`} />
              <Figure label="Tokens (prompt + completion)" value={fmtInt(g.prompt_tokens + g.completion_tokens)} />
              <Figure label="Cost" value={`$${Number(g.cost_usd).toFixed(2)}`} />
            </div>
            <div className="mt-3">
              <SubHead>Top failure reasons</SubHead>
              {g.failures.length === 0 ? <Note>No failed runs in this window.</Note> : (
                <table>
                  <thead><tr><th scope="col">Status</th><th scope="col">Reason</th><th scope="col">Stage</th><th scope="col" className="kcs-r">Runs</th></tr></thead>
                  <tbody>
                    {g.failures.slice(0, 10).map(f => (
                      <tr key={`${f.status}/${f.reason}/${f.stage}`} data-testid="failure-row">
                        <td>{f.status}</td><td>{f.reason}</td><td>{f.stage}</td><td className="kcs-r">{f.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      <div>
        <SubHead>MCP tool calls per day</SubHead>
        {!m ? <Unknown section="MCP tool-call" /> : (
          <>
            <LineChart days={days} label="MCP tool calls and errors per day" series={[
              { key: 'calls', label: 'Calls', color: SERIES.s1, values: m.calls_by_day },
              { key: 'errors', label: 'Errors', color: SERIES.s2, values: m.errors_by_day },
            ]} />
            <div className="flex flex-wrap gap-6 mt-2">
              <Figure label="Error rate" value={fmtPct(ratio(m.errors, m.calls), 1)} />
              <Figure label="Latency p50 / p95" value={`${fmtMs(m.latency_ms?.p50)} / ${fmtMs(m.latency_ms?.p95)}`} />
            </div>
            <div className="grid gap-4 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              <div>
                <SubHead>Top tools</SubHead>
                {m.tools.length === 0 ? <Note>No tool calls in this window.</Note> : (
                  <table>
                    <thead><tr><th scope="col">Tool</th><th scope="col" className="kcs-r">Calls</th><th scope="col" className="kcs-r">Error %</th><th scope="col" className="kcs-r">p95</th></tr></thead>
                    <tbody>
                      {m.tools.slice(0, 10).map(t => (
                        <tr key={t.tool} data-testid="tool-row">
                          <td>{t.tool}</td><td className="kcs-r">{fmtInt(t.calls)}</td>
                          <td className="kcs-r">{fmtPct(ratio(toolErrors(t), t.calls), 1)}</td><td className="kcs-r">{fmtMs(t.p95_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <SubHead>Top failing tools</SubHead>
                {failing.length === 0 ? <Note>No tool errors in this window.</Note> : (
                  <table>
                    <thead><tr><th scope="col">Tool</th><th scope="col" className="kcs-r">Errors</th><th scope="col" className="kcs-r">Error %</th></tr></thead>
                    <tbody>
                      {failing.map(t => (
                        <tr key={t.tool} data-testid="failing-tool-row">
                          <td>{t.tool}</td><td className="kcs-r">{fmtInt(toolErrors(t))}</td>
                          <td className="kcs-r">{fmtPct(ratio(toolErrors(t), t.calls), 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <SubHead>Top error codes</SubHead>
                {m.diagnostics.length === 0 ? <Note>No error codes in this window.</Note> : (
                  <table>
                    <thead><tr><th scope="col">Tool</th><th scope="col">Code</th><th scope="col" className="kcs-r">Calls</th></tr></thead>
                    <tbody>
                      {m.diagnostics.slice(0, 10).map(d => (
                        <tr key={`${d.tool}/${d.code}`}><td>{d.tool}</td><td>{d.code}</td><td className="kcs-r">{d.count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <SubHead>Calls by client</SubHead>
                {m.clients.length === 0 ? <Note>No tool calls in this window.</Note> : (
                  <table>
                    <thead><tr><th scope="col">Client</th><th scope="col" className="kcs-r">Calls</th><th scope="col" className="kcs-r">Error %</th></tr></thead>
                    <tbody>
                      {[...m.clients].sort((a, b) => clientOrder(a.client) - clientOrder(b.client)).map(c => (
                        <tr key={c.client}><td>{clientLabel(c.client)}</td><td className="kcs-r">{fmtInt(c.calls)}</td><td className="kcs-r">{fmtPct(ratio(c.errors, c.calls), 1)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <Note>{stats.definitions['mcp_error']} {stats.excluded.note}</Note>
          </>
        )}
      </div>

      <div>
        <SubHead>Exports by format</SubHead>
        {formats.length === 0 ? <Note>No exports since the server started.</Note> : (
          <div className="kcs-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Format</th><th scope="col" className="kcs-r">Total</th><th scope="col" className="kcs-r">OK</th>
                  <th scope="col" className="kcs-r">Warning</th><th scope="col" className="kcs-r">Rejected</th>
                  <th scope="col" className="kcs-r">Failed</th><th scope="col">Success</th>
                </tr>
              </thead>
              <tbody>
                {formats.map(([format, c]) => (
                  <tr key={format} data-testid="export-row">
                    <td style={{ color: 'var(--kcs-text)' }}>{format}</td><td className="kcs-r">{c.total}</td><td className="kcs-r">{c.ok}</td>
                    <td className="kcs-r">{c.warning}</td><td className="kcs-r">{c.rejected}</td><td className="kcs-r">{c.failed}</td>
                    <td><Meter value={ratio(c.ok + c.warning, c.total)} label={`${format} export success`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Note>Since the server process started ({new Date(stats.exports.since).toLocaleString()}); counters reset on every deploy and do not follow the window.</Note>
      </div>
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
                <thead><tr><th scope="col">Check</th><th scope="col" className="kcs-r">Uptime</th><th scope="col" className="kcs-r">p50</th><th scope="col" className="kcs-r">p95</th></tr></thead>
                <tbody>
                  {u.checks.map(c => (
                    <tr key={c.check} data-testid="uptime-row">
                      <td>{c.check}</td>
                      <td className="kcs-r">{c.uptime_pct === null ? '—' : `${c.uptime_pct.toFixed(2)}%`}</td>
                      <td className="kcs-r">{fmtMs(c.p50_ms)}</td><td className="kcs-r">{fmtMs(c.p95_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Note>{u.incidents} incidents · {u.blips} blips · {u.deploys} deploys{u.from && u.to ? ` · ${new Date(u.from).toLocaleString()} – ${new Date(u.to).toLocaleString()}` : ''}</Note>
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
