// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// /stats panel (2) "First-try success": hosted-agent runs, MCP tool calls and
// Studio exports.

import type { ReactNode } from 'react';
import { ColumnChart, LineChart, Meter } from './charts';
import {
  clientLabel,
  clientOrder,
  dataWindow,
  failingTools,
  fmtInt,
  fmtMs,
  fmtPct,
  generationGroups,
  isMcpV2,
  persistedExportTotals,
  ratio,
  toolErrors,
} from './derive';
import { SERIES } from './palette';
import type { AdminStats, ExportFormatCounters, ExportsPersisted, Generations, Mcp } from './types';
import { Figure, Note, Panel, SubHead, Unknown } from './ui';

function FailureReasons({ g, days }: { g: Generations; days: string[] }): ReactNode {
  if (g.failures.length === 0) return <Note>No failed runs in this window.</Note>;
  const since = g.instrumented_since;
  const legacy = g.legacy_unrecorded ?? 0;
  return (
    <>
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
    {since && (days[0] ?? '') < since && (
      <Note>
        Reasons are recorded since {since}.{legacy > 0 ? ` ${legacy} older failed run${legacy === 1 ? '' : 's'} show “legacy” (never recorded), not an unknown cause.` : ''}
      </Note>
    )}
    </>
  );
}

function HostedAgent({ g, days }: { g: Generations | null; days: string[] }): ReactNode {
  if (!g) return <div><SubHead>Hosted agent — runs per day</SubHead><Unknown section="generations" /></div>;
  const groups = generationGroups(g, days.length);
  return (
    <div>
      <SubHead>Hosted agent — runs per day</SubHead>
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
        <FailureReasons g={g} days={days} />
      </div>
    </div>
  );
}

function TopTools({ m }: { m: Mcp }): ReactNode {
  const v2 = isMcpV2(m);
  return (
    <div>
      <SubHead>Top tools</SubHead>
      {m.tools.length === 0 ? <Note>No tool calls in this window.</Note> : (
        <table>
          <thead>
            <tr>
              <th scope="col">Tool</th><th scope="col" className="kcs-r">Calls</th><th scope="col" className="kcs-r">Failed %</th>
              {v2 && <th scope="col" className="kcs-r">Rejected %</th>}
              <th scope="col" className="kcs-r">p95</th>
            </tr>
          </thead>
          <tbody>
            {m.tools.slice(0, 10).map(t => (
              <tr key={t.tool} data-testid="tool-row">
                <td>{t.tool}</td><td className="kcs-r">{fmtInt(t.calls)}</td>
                <td className="kcs-r">{fmtPct(ratio(toolErrors(t), t.calls), 1)}</td>
                {v2 && <td className="kcs-r">{fmtPct(ratio(t.rejected ?? 0, t.calls), 1)}</td>}
                <td className="kcs-r">{fmtMs(t.p95_ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FailingTools({ m }: { m: Mcp }): ReactNode {
  const failing = failingTools(m.tools);
  return (
    <div>
      <SubHead>Top failing tools</SubHead>
      {failing.length === 0 ? <Note>No tool errors in this window.</Note> : (
        <table>
          <thead><tr><th scope="col">Tool</th><th scope="col" className="kcs-r">Failures</th><th scope="col" className="kcs-r">Failed %</th></tr></thead>
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
  );
}

function ErrorCodes({ m }: { m: Mcp }): ReactNode {
  const v2 = isMcpV2(m);
  return (
    <div>
      <SubHead>{v2 ? 'Top failure and rejection codes' : 'Top error codes'}</SubHead>
      {m.diagnostics.length === 0 ? <Note>No error codes in this window.</Note> : (
        <table>
          <thead>
            <tr>
              <th scope="col">Tool</th><th scope="col">Code</th>
              {v2 && <th scope="col">Outcome</th>}
              <th scope="col" className="kcs-r">Calls</th>
            </tr>
          </thead>
          <tbody>
            {m.diagnostics.slice(0, 12).map(d => (
              <tr key={`${d.tool}/${d.outcome ?? ''}/${d.code}`} data-testid="code-row">
                <td>{d.tool}</td><td>{d.code}</td>
                {v2 && <td>{d.outcome === 'rejected' ? 'rejected' : 'failed'}</td>}
                <td className="kcs-r">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CallsByClient({ m }: { m: Mcp }): ReactNode {
  const v2 = isMcpV2(m);
  return (
    <div>
      <SubHead>Calls by client</SubHead>
      {m.clients.length === 0 ? <Note>No tool calls in this window.</Note> : (
        <table>
          <thead>
            <tr>
              <th scope="col">Client</th><th scope="col" className="kcs-r">Calls</th><th scope="col" className="kcs-r">Failed %</th>
              {v2 && <th scope="col" className="kcs-r">Rejected %</th>}
            </tr>
          </thead>
          <tbody>
            {[...m.clients].sort((a, b) => clientOrder(a.client) - clientOrder(b.client)).map(c => (
              <tr key={c.client}>
                <td>{clientLabel(c.client)}</td><td className="kcs-r">{fmtInt(c.calls)}</td><td className="kcs-r">{fmtPct(ratio(c.errors, c.calls), 1)}</td>
                {v2 && <td className="kcs-r">{fmtPct(ratio(c.rejected ?? 0, c.calls), 1)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function McpCalls({ stats }: { stats: AdminStats }): ReactNode {
  const m = stats.mcp;
  if (!m) return <div><SubHead>MCP tool calls per day</SubHead><Unknown section="MCP tool-call" /></div>;
  const v2 = isMcpV2(m);
  return (
    <div>
      <SubHead>MCP tool calls per day</SubHead>
      <LineChart days={stats.days} label="MCP tool calls, failures and model rejections per day" series={[
        { key: 'calls', label: 'Calls', color: SERIES.s1, values: m.calls_by_day },
        { key: 'errors', label: 'Failures', color: SERIES.s2, values: m.errors_by_day },
        ...(v2 && m.rejected_by_day ? [{ key: 'rejected', label: 'Rejected', color: SERIES.s3, values: m.rejected_by_day }] : []),
      ]} />
      <div className="flex flex-wrap gap-6 mt-2">
        <Figure label="Failure rate" value={fmtPct(ratio(m.errors, m.calls), 1)} />
        {v2 && <Figure label="Model rejection rate" value={fmtPct(ratio(m.rejected ?? 0, m.calls), 1)} />}
        <Figure label="Latency p50 / p95" value={`${fmtMs(m.latency_ms?.p50)} / ${fmtMs(m.latency_ms?.p95)}`} />
        {v2 && m.excluded && (
          <Figure label="Left out (monitor / probes)" value={`${fmtInt(m.excluded.monitor)} / ${fmtInt(m.excluded.probe)}`} />
        )}
      </div>
      <div className="grid gap-4 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <TopTools m={m} />
        <FailingTools m={m} />
        <ErrorCodes m={m} />
        <CallsByClient m={m} />
      </div>
      <Note>
        Data {dataWindow(m.data_since, stats.days)}. {stats.definitions['mcp_error']}{' '}
        {v2 ? stats.definitions['mcp_rejected'] : 'This server predates the corrected definition: monitor traffic and model rejections are included.'}
      </Note>
    </div>
  );
}

function ExportRow({ format, c }: { format: string; c: Omit<ExportFormatCounters, 'byClass'> }): ReactNode {
  return (
    <tr data-testid="export-row">
      <td style={{ color: 'var(--kcs-text)' }}>{format}</td><td className="kcs-r">{c.total}</td><td className="kcs-r">{c.ok}</td>
      <td className="kcs-r">{c.warning}</td><td className="kcs-r">{c.rejected}</td><td className="kcs-r">{c.failed}</td>
      <td><Meter value={ratio(c.ok + c.warning, c.total - c.rejected - c.aborted)} label={`${format} export success`} /></td>
    </tr>
  );
}

function PersistedExports({ stats, p }: { stats: AdminStats; p: ExportsPersisted }): ReactNode {
  const formats = Object.entries(p.studio?.formats ?? {}).sort((a, b) => b[1].total - a[1].total);
  const t = persistedExportTotals(p);
  return (
    <div>
      <SubHead>Exports</SubHead>
      {t.total === 0 ? <Note>No exports in this window.</Note> : (
        <div className="kcs-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Source</th><th scope="col" className="kcs-r">Total</th><th scope="col" className="kcs-r">OK</th>
                <th scope="col" className="kcs-r">Warning</th><th scope="col" className="kcs-r">Rejected</th>
                <th scope="col" className="kcs-r">Failed</th><th scope="col">Success</th>
              </tr>
            </thead>
            <tbody>
              {formats.map(([format, c]) => <ExportRow key={format} format={`Studio ${format}`} c={c} />)}
              {p.mcp && p.mcp.calls > 0 && (
                <tr data-testid="export-row">
                  <td style={{ color: 'var(--kcs-text)' }}>MCP export</td><td className="kcs-r">{p.mcp.calls}</td><td className="kcs-r">{p.mcp.ok}</td>
                  <td className="kcs-r">—</td><td className="kcs-r">{p.mcp.rejected}</td><td className="kcs-r">{p.mcp.errors}</td>
                  <td><Meter value={ratio(p.mcp.ok, p.mcp.ok + p.mcp.errors)} label="MCP export success" /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Note>
        Studio exports {dataWindow(p.studio_data_since, stats.days)}, MCP exports {dataWindow(p.mcp_data_since, stats.days)}.{' '}
        {stats.definitions['export_success']}
      </Note>
    </div>
  );
}

function Exports({ stats }: { stats: AdminStats }): ReactNode {
  if (stats.exports_persisted) return <PersistedExports stats={stats} p={stats.exports_persisted} />;
  const formats = Object.entries(stats.exports.formats).sort((a, b) => b[1].total - a[1].total);
  return (
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
              {formats.map(([format, c]) => <ExportRow key={format} format={format} c={c} />)}
            </tbody>
          </table>
        </div>
      )}
      <Note>Since the server process started ({new Date(stats.exports.since).toLocaleString()}); counters reset on every deploy, cover one container, and do not follow the window.</Note>
    </div>
  );
}

export function SuccessPanel({ stats }: { stats: AdminStats }): ReactNode {
  return (
    <Panel id="success" title="First-try success" question="Do hosted-agent runs, MCP tool calls and exports succeed?">
      <HostedAgent g={stats.generations} days={stats.days} />
      <McpCalls stats={stats} />
      <Exports stats={stats} />
    </Panel>
  );
}
