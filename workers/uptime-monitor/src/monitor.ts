// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/monitor.ts
//
// One monitor run and one daily summary, with every side effect injected
// (fetch, store, email, clock) so the tests drive them end to end.

import { step, unsend, latencyVerdict, LATENCY_FAIL_AFTER, type AlertState, type Notice } from './alerts';
import { CHECKS, LATENCY_ID, checkName, runCheck, type CheckDef, type CheckResult, type FetchLike, type HealthDetail } from './checks';
import type { Deploy, Meta, ResultRow, Store } from './store';
import { duration, formatSummary, iso, shortSha, summarize } from './summary';

export type SendFn = (subject: string, text: string) => Promise<void>;

/** Result rows older than this are deleted. The summary needs 24 h. */
export const KEEP_MS = 8 * 24 * 60 * 60 * 1000;
/** A deploy this long before a failure streak starts (or during it) is named as the likely cause. */
export const DEPLOY_BLAME_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface RunDeps {
  store: Store;
  fetch: FetchLike;
  send: SendFn;
  checks?: CheckDef[];
  timeoutMs?: number;
}

export interface RunOutcome {
  results: CheckResult[];
  notices: Notice[];
  emailed: boolean;
  emailError?: string;
}

/** A 30-minute check runs at :00 and :30, and on every run while it is failing. */
export function isDue(def: CheckDef, at: number, state: AlertState | undefined, force = false): boolean {
  if (force || def.everyMin === 5 || !state?.lastRunAt) return true;
  if (state.fails > 0) return true;
  return Math.floor(at / 60_000) % def.everyMin < 5;
}

function poolLine(d: HealthDetail): string {
  const causes = Object.entries(d.killsByCause).map(([k, n]) => `${k} ${n}`).join(', ');
  return (
    `workers ${d.workers}, warm ${d.warm}, busy ${d.busy}, queue ${d.queueDepth}, ` +
    `kills ${d.kills}${causes ? ` (${causes})` : ''}, respawns ${d.respawns}, rssMb [${d.rssMb.join(', ')}]`
  );
}

/** The deploy that likely caused a streak that started at `since`, if any. */
export function blamedDeploy(deploy: Deploy | undefined, since: number): Deploy | undefined {
  if (!deploy) return undefined;
  return deploy.at >= since - DEPLOY_BLAME_MS ? deploy : undefined;
}

export function alertEmail(
  notices: Notice[],
  ctx: { meta: Meta; states: Record<string, AlertState>; now: number },
): { subject: string; text: string } {
  const down = notices.filter((n) => n.kind !== 'recovery');
  const up = notices.filter((n) => n.kind === 'recovery');
  const names = (ns: Notice[]) => ns.map((n) => checkName(n.checkId)).join(', ');
  const subject = down.length
    ? `[kernelCAD ${down.every((n) => n.kind === 'reminder') ? 'STILL DOWN' : 'DOWN'}] ${names(down)}`
    : `[kernelCAD RECOVERED] ${names(up)}`;

  const lines: string[] = [];
  for (const n of down) {
    lines.push(`${n.kind === 'alert' ? 'FAILING' : 'STILL FAILING'}: ${checkName(n.checkId)}`);
    lines.push(`  error: ${n.error ?? '-'}`);
    lines.push(`  since: ${iso(n.since)} (${duration(ctx.now - n.since)}, ${n.fails} failed runs in a row)`);
    const d = blamedDeploy(ctx.meta.lastDeploy, n.since);
    if (d) {
      const rel = d.at <= n.since ? `${duration(n.since - d.at)} before the first failure` : 'during the failures';
      lines.push(`  likely cause: deploy ${shortSha(d.from)} -> ${shortSha(d.to)} at ${iso(d.at)} (${rel})`);
    }
    lines.push('');
  }
  for (const n of up) {
    lines.push(`RECOVERED: ${checkName(n.checkId)}`);
    lines.push(`  was down from ${iso(n.since)} to ${iso(n.at)} (${duration(n.at - n.since)})`);
    lines.push('');
  }
  const noticed = new Set(notices.map((n) => n.checkId));
  const others = Object.entries(ctx.states).filter(([id, s]) => s.fails > 0 && !noticed.has(id));
  if (others.length) {
    lines.push('Also failing now (not yet alerted, or already alerted):');
    for (const [id, s] of others) lines.push(`  ${checkName(id)}: ${s.fails} run(s), ${s.lastError ?? '-'}`);
    lines.push('');
  }
  const good = ctx.meta.lastGood;
  lines.push(`Current healthz commit: ${ctx.meta.commit ?? 'unknown'}`);
  if (good) {
    lines.push(`Last good healthz: ${iso(good.at)}, commit ${good.detail.commit}`);
    lines.push(`  pool: ${poolLine(good.detail)}`);
  } else {
    lines.push('Last good healthz: none recorded');
  }
  if (ctx.meta.lastDeploy) {
    const d = ctx.meta.lastDeploy;
    lines.push(`Last deploy seen: ${shortSha(d.from)} -> ${shortSha(d.to)} at ${iso(d.at)}`);
  }
  return { subject, text: lines.join('\n') };
}

/** Run the due checks, update the alert state and history, and email on changes. */
export async function runMonitor(deps: RunDeps, at: number, opts: { force?: boolean } = {}): Promise<RunOutcome> {
  const { store } = deps;
  const checks = deps.checks ?? CHECKS;
  const [prevStates, meta] = await Promise.all([store.getStates(), store.getMeta()]);
  const due = checks.filter((c) => isDue(c, at, prevStates[c.id], opts.force));
  const results = await Promise.all(due.map((c) => runCheck(c, deps.fetch, { timeoutMs: deps.timeoutMs })));

  // Commit tracking: a change is a deploy. Info only; it is named in the
  // alert email when failures follow it.
  const health = results.find((r) => r.id === 'healthz');
  const commit = health?.detail?.commit;
  if (commit && commit !== 'unknown') {
    if (meta.commit && meta.commit !== 'unknown' && meta.commit !== commit) {
      meta.lastDeploy = { at, from: meta.commit, to: commit };
    }
    meta.commit = commit;
  }
  if (health?.ok && health.detail) meta.lastGood = { at, detail: health.detail };

  const states: Record<string, AlertState> = { ...prevStates };
  const notices: Notice[] = [];
  const apply = (id: string, ok: boolean, error: string | undefined, failAfter?: number) => {
    const out = step(prevStates[id], id, ok, error, at, failAfter);
    states[id] = out.state;
    if (out.notice) notices.push(out.notice);
  };
  for (const r of results) apply(r.id, r.ok, r.error, undefined);
  // Latency is judged only when healthz answered; a dead healthz is the healthz alert.
  if (health?.detail) {
    const v = latencyVerdict(health.latencyMs);
    apply(LATENCY_ID, v.ok, v.error, LATENCY_FAIL_AFTER);
  }

  let emailed = false;
  let emailError: string | undefined;
  if (notices.length) {
    const { subject, text } = alertEmail(notices, { meta, states, now: at });
    try {
      await deps.send(subject, text);
      emailed = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error(`uptime-monitor alert email failed: ${emailError}`);
      for (const n of notices) states[n.checkId] = unsend(states[n.checkId]!, n, prevStates[n.checkId]);
    }
  }

  meta.lastRunAt = at;
  const rows: ResultRow[] = results.map((r) => ({
    ts: at,
    checkId: r.id,
    ok: r.ok,
    latencyMs: r.latencyMs,
    ...(r.error ? { error: r.error } : {}),
    ...(r.detail ? { detail: r.detail } : {}),
  }));
  await store.addResults(rows);
  await store.putStates(states);
  await store.putMeta(meta);
  await store.prune(at - KEEP_MS);
  return { results, notices, emailed, emailError };
}

/** Send the summary of the 24 h before `at`, once per UTC day. */
export async function runDailySummary(
  deps: Pick<RunDeps, 'store' | 'send' | 'checks'>,
  at: number,
): Promise<{ sent: boolean; subject?: string }> {
  const day = new Date(at).toISOString().slice(0, 10);
  const meta = await deps.store.getMeta();
  if (meta.lastSummaryDay === day) return { sent: false };
  const rows = await deps.store.resultsSince(at - DAY_MS);
  const ids = (deps.checks ?? CHECKS).map((c) => c.id);
  const { subject, text } = formatSummary(summarize(rows, at - DAY_MS, at, ids), checkName);
  await deps.send(subject, text);
  // Re-read: a monitor run may have written meta while the email was sent.
  const fresh = await deps.store.getMeta();
  await deps.store.putMeta({ ...fresh, lastSummaryDay: day });
  return { sent: true, subject };
}

export interface StatusCheck {
  id: string;
  name: string;
  ok: boolean;
  at: number;
  latencyMs: number;
  error?: string;
  failingSince?: string;
  failsInARow: number;
}

/** Public /status body: latest verdict per check, the commit and pool numbers. No secrets, no personal data. */
export async function statusBody(store: Store, checks: CheckDef[] = CHECKS): Promise<Record<string, unknown>> {
  const [latest, states, meta] = await Promise.all([store.latest(), store.getStates(), store.getMeta()]);
  const known = new Set(checks.map((c) => c.id));
  const list: StatusCheck[] = latest
    .filter((r) => known.has(r.checkId as CheckDef['id']))
    .map((r) => {
      const s = states[r.checkId];
      return {
        id: r.checkId,
        name: checkName(r.checkId),
        ok: r.ok,
        at: r.ts,
        latencyMs: r.latencyMs,
        ...(r.error ? { error: r.error } : {}),
        ...(s?.fails && s.since ? { failingSince: iso(s.since) } : {}),
        failsInARow: s?.fails ?? 0,
      };
    });
  const lat = states[LATENCY_ID];
  const pool = latest.find((r) => r.checkId === 'healthz')?.detail;
  return {
    service: 'kernelcad-uptime',
    ok: list.length > 0 && list.every((c) => c.ok),
    lastRunAt: meta.lastRunAt ? iso(meta.lastRunAt) : null,
    commit: meta.commit ?? null,
    lastDeploy: meta.lastDeploy ? { at: iso(meta.lastDeploy.at), from: meta.lastDeploy.from, to: meta.lastDeploy.to } : null,
    pool: pool ?? null,
    healthzSlowRunsInARow: lat?.fails ?? 0,
    checks: list,
  };
}
