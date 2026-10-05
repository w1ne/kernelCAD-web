// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/index.ts
//
// Prod uptime monitor for kernelCAD. Runs on Cloudflare, off the Hetzner box,
// so it still reports when the box is down.
//
//   cron */5    run the checks (src/checks.ts), keep history + alert state in
//               D1, email ALERT_TO on 2 failures in a row, a reminder every
//               2 h while down, and one recovery email.
//   07:00 UTC   the */5 run at 07:00 also sends the daily summary.
//   GET /status latest verdict per check as public JSON (no secrets).
//
// Email goes through the Cloudflare Email Service `send_email` binding, the
// same setup as workers/feedback-mailer.

import { runDailySummary, runMonitor, statusBody, summaryBody, type SendFn } from './monitor';
import { D1Store, type D1Like } from './store';

export interface SendEmailBinding {
  send(message: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

export interface Env {
  DB: D1Like;
  EMAIL: SendEmailBinding;
  ALERT_TO: string;
  ALERT_FROM: string;
}

export const FROM_NAME = 'kernelCAD uptime';
/** UTC hour of the daily summary. */
export const SUMMARY_HOUR_UTC = 7;

interface ScheduledControllerLike {
  scheduledTime: number;
  cron: string;
}
interface ExecutionContextLike {
  waitUntil(p: Promise<unknown>): void;
}

export function emailSender(env: Env): SendFn {
  return async (subject, text) => {
    const { messageId } = await env.EMAIL.send({
      to: env.ALERT_TO,
      from: { email: env.ALERT_FROM, name: FROM_NAME },
      subject: subject.slice(0, 200),
      text,
    });
    console.log(`uptime-monitor sent "${subject}" messageId=${messageId}`);
  };
}

/** True for the run that also sends the daily summary (the cron fires on 5-minute marks). */
export function isSummaryRun(at: number): boolean {
  const d = new Date(at);
  return d.getUTCHours() === SUMMARY_HOUR_UTC && d.getUTCMinutes() < 5;
}

export async function scheduledRun(env: Env, at: number): Promise<void> {
  const store = new D1Store(env.DB);
  const send = emailSender(env);
  const out = await runMonitor({ store, fetch: (i, init) => fetch(i, init), send }, at);
  const failed = out.results.filter((r) => !r.ok).map((r) => `${r.id}: ${r.error}`);
  console.log(
    `uptime-monitor ran ${out.results.length} checks, ${failed.length} failed` +
      `${failed.length ? ` (${failed.join('; ')})` : ''}, notices ${out.notices.length}`,
  );
  if (isSummaryRun(at)) {
    const s = await runDailySummary({ store, send }, at);
    if (s.sent) console.log(`uptime-monitor daily summary sent: ${s.subject}`);
  }
}

export default {
  async scheduled(controller: ScheduledControllerLike, env: Env, ctx: ExecutionContextLike): Promise<void> {
    ctx.waitUntil(scheduledRun(env, controller.scheduledTime));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/status' && url.pathname !== '/summary') return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const store = new D1Store(env.DB);
    const body = url.pathname === '/status'
      ? await statusBody(store)
      : await summaryBody(store, Date.now(), Number(url.searchParams.get('days') ?? '1'));
    return new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
