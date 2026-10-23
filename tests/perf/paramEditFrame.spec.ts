// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Click-to-frame benchmark of a declared-parameter edit in the Studio:
// value entered → rebuild request → response → meshes applied → installed in
// the viewer → next rendered frame. Production build, headless Chromium.
//
// Adapted from OpenZCAD's perf-cad-edit.spec.ts (https://github.com/esaueng/OpenZCAD,
// Apache-2.0): the stage breakdown, nearest-rank p50/p95 and "report, never
// gate on wall time". It FAILS only on errors and wrong geometry: every
// settled edit must echo the value that was entered, change the mesh bounds
// like the edit should, and come from the kernel under test. Timings vary
// with the machine, the GPU backend (SwiftShader on CI) and load, so no
// threshold is asserted. The frame mark is a render-loop observation, not
// GPU completion or scan-out.
//
// The same spec measures any model locally (see PARAM_PERF_* below), e.g.
//   PARAM_PERF_MODEL=examples/gallery/gearfinity-planetary-stage.kcad.ts \
//   PARAM_PERF_PARAM=driveAngleDeg PARAM_PERF_VALUES=100,110,120,130,140,150 \
//   npx playwright test -c playwright.perf.config.ts
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const FIXTURE = 'tests/fixtures/browser-kernel/param-arm.kcad.ts';
const env = process.env;
const MODEL = env.PARAM_PERF_MODEL ?? FIXTURE;
const KERNEL = env.PARAM_PERF_KERNEL ?? 'browser';
const WARMUP = Number(env.PARAM_PERF_WARMUP ?? 2);
const TICK_TIMEOUT_MS = Number(env.PARAM_PERF_TICK_TIMEOUT_MS ?? 60_000);
/** name=value pairs, alternating params when more than one is given. */
const TICKS: Array<{ name: string; value: number }> = env.PARAM_PERF_PARAM
  ? (env.PARAM_PERF_VALUES ?? '').split(',').filter(Boolean).map((value) => ({ name: env.PARAM_PERF_PARAM!, value: Number(value) }))
  : [
    { name: 'elbowDeg', value: 10 }, { name: 'width', value: 50 },
    { name: 'elbowDeg', value: 25 }, { name: 'width', value: 60 },
    { name: 'elbowDeg', value: -20 }, { name: 'width', value: 45 },
    { name: 'elbowDeg', value: 40 }, { name: 'width', value: 70 },
    { name: 'elbowDeg', value: -35 }, { name: 'width', value: 35 },
  ];
const OUT = env.PARAM_PERF_OUT ?? 'test-results/perf/param-edit-frame.json';

interface PerfEvent { stage: string; t: number; kernel?: string; detail?: Record<string, unknown> }
type Bounds = { min: number[]; max: number[] };

interface Sample {
  name: string;
  value: number;
  kernel: string;
  inputToRequestMs: number;
  requestToResponseMs: number;
  responseToAppliedMs: number;
  appliedToInstalledMs: number;
  installedToFrameMs: number;
  inputToFrameMs: number;
  worker?: Record<string, unknown>;
}

async function serveModel(page: Page, slug: string, source: string): Promise<void> {
  await page.route('**/gallery.json', (route) => route.fulfill({
    json: { entries: [{ slug, sourceUrl: `/perf-src/${slug}.kcad.ts`, title: 'Benchmark model' }] },
  }));
  await page.route(`**/perf-src/${slug}.kcad.ts`, (route) => route.fulfill({ body: source, contentType: 'text/plain' }));
  await page.route('**/gallery/_mesh/**', (route) => route.fulfill({ status: 404, body: '' }));
  // Nothing leaves the machine: fonts, the editor CDN and analytics are aborted.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
}

async function events(page: Page): Promise<PerfEvent[]> {
  return page.evaluate(() => (globalThis as unknown as { __kernelcadParamPerf: { events: PerfEvent[] } }).__kernelcadParamPerf.events.slice());
}

/** Enter one value and wait for the frame that shows it. */
async function tick(page: Page, name: string, value: number): Promise<{ sample: Sample; applied: PerfEvent }> {
  const input = page.getByTestId(`scrub-input-${name}`);
  await input.fill(String(value));
  await page.evaluate(() => {
    const sink = (globalThis as unknown as { __kernelcadParamPerf: { events: PerfEvent[] } }).__kernelcadParamPerf;
    sink.events.length = 0;
    document.activeElement?.addEventListener('keydown', () => {
      sink.events.push({ stage: 'input', t: performance.now() });
    }, { once: true, capture: true });
  });
  await input.press('Enter');
  await page.waitForFunction(() => {
    const ev = (globalThis as unknown as { __kernelcadParamPerf: { events: PerfEvent[] } }).__kernelcadParamPerf.events;
    const applied = ev.findIndex((e) => e.stage === 'applied');
    return applied >= 0 && ev.slice(applied).some((e) => e.stage === 'frame');
  }, null, { timeout: TICK_TIMEOUT_MS });
  const ev = await events(page);
  const at = (stage: string, from = 0) => ev.slice(from).find((e) => e.stage === stage);
  const appliedIndex = ev.findIndex((e) => e.stage === 'applied');
  const input0 = at('input')!;
  const request = ev.filter((e) => e.stage === 'request').at(-1)!;
  const response = ev.filter((e) => e.stage === 'response').at(-1)!;
  const applied = ev[appliedIndex]!;
  const frameIndex = ev.findIndex((e, i) => i > appliedIndex && e.stage === 'frame');
  const frame = ev[frameIndex]!;
  // React may commit the new geometry before or after the applied mark.
  const responseIndex = ev.lastIndexOf(response);
  const installed = ev.slice(responseIndex, frameIndex).filter((e) => e.stage === 'installed').at(-1) ?? frame;
  return {
    applied,
    sample: {
      name, value, kernel: request.kernel ?? '?',
      inputToRequestMs: request.t - input0.t,
      requestToResponseMs: response.t - request.t,
      responseToAppliedMs: applied.t - response.t,
      appliedToInstalledMs: Math.max(0, installed.t - applied.t),
      installedToFrameMs: frame.t - installed.t,
      inputToFrameMs: frame.t - input0.t,
      ...(response.detail ? { worker: response.detail } : {}),
    },
  };
}

function summarize(values: number[]): { samples: number; medianMs: number | null; p95Ms: number | null } {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? null;
  const round = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
  return { samples: sorted.length, medianMs: round(at(0.5)), p95Ms: round(at(0.95)) };
}

function boundsChanged(a: Bounds | undefined, b: Bounds | undefined): boolean {
  if (!a || !b) return true;
  return [0, 1, 2].some((i) => Math.abs(a.min[i]! - b.min[i]!) > 1e-6 || Math.abs(a.max[i]! - b.max[i]!) > 1e-6);
}

function report(result: Record<string, unknown>, samples: Sample[]): void {
  mkdirSync(dirname(resolve(OUT)), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2));
  const stats = result.summary as Record<string, { medianMs: number | null; p95Ms: number | null }>;
  const rows = Object.entries(stats).map(([stage, s]) => `| ${stage} | ${s.medianMs ?? '–'} | ${s.p95Ms ?? '–'} |`);
  const markdown = [
    `### Param edit click-to-frame (${KERNEL} kernel, ${MODEL})`,
    '',
    `${samples.length} warm settled edits after ${WARMUP} warm-up edits; headless Chromium, production build. Reported only, not gated.`,
    '',
    '| stage | p50 ms | p95 ms |',
    '| --- | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
  console.log(markdown);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

test('param edit click-to-frame', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    // The code editor's loader rejects with a bare Event when its CDN (aborted
    // above) is unreachable; it has nothing to do with the rebuild.
    if (error.message === 'Event') return;
    errors.push(error.message);
  });
  await page.addInitScript(() => {
    (globalThis as unknown as { __kernelcadParamPerf: { events: unknown[] } }).__kernelcadParamPerf = { events: [] };
  });
  await serveModel(page, 'perf-model', readFileSync(MODEL, 'utf8'));
  const opened = Date.now();
  await page.goto(`/studio?gallery=perf-model&kernel=${KERNEL}`);
  await page.getByText('Params', { exact: true }).first().click({ timeout: TICK_TIMEOUT_MS });
  await expect(page.getByTestId(`scrub-input-${TICKS[0]!.name}`)).toBeVisible({ timeout: TICK_TIMEOUT_MS });
  await page.waitForFunction(() => (globalThis as unknown as { __kernelcadParamPerf: { events: PerfEvent[] } })
    .__kernelcadParamPerf.events.some((e) => e.stage === 'frame'), null, { timeout: TICK_TIMEOUT_MS });
  const firstPaintMs = Date.now() - opened;

  const samples: Sample[] = [];
  let previous: Bounds | undefined;
  for (const [index, { name, value }] of TICKS.entries()) {
    const { sample, applied } = await tick(page, name, value);
    // Correctness, not speed: the settled mesh is this value's, from the kernel under test.
    expect(sample.kernel, `tick ${index} kernel`).toBe(KERNEL);
    const echoed = (applied.detail?.params as Record<string, unknown> | undefined)?.[name];
    expect(echoed, `tick ${index} echoed ${name}`).toBe(value);
    const bounds = applied.detail?.bounds as Bounds | undefined;
    expect(boundsChanged(previous, bounds), `tick ${index} geometry changed`).toBe(true);
    previous = bounds;
    if (index >= WARMUP) samples.push(sample);
  }
  expect(errors).toEqual([]);
  await expect(page.getByText(/is not available|failed to compile/)).toHaveCount(0);

  const stages: Array<keyof Sample> = [
    'inputToRequestMs', 'requestToResponseMs', 'responseToAppliedMs',
    'appliedToInstalledMs', 'installedToFrameMs', 'inputToFrameMs',
  ];
  const summary = Object.fromEntries(stages.map((stage) => [stage, summarize(samples.map((s) => s[stage] as number))]));
  report({ model: MODEL, kernel: KERNEL, firstPaintMs, warmup: WARMUP, summary, samples, userAgent: await page.evaluate(() => navigator.userAgent) }, samples);
  await test.info().attach('param-edit-frame.json', { path: OUT, contentType: 'application/json' });
});

test('a hostile model in the browser kernel reaches no network, storage or page messaging', async ({ page }) => {
  test.skip(KERNEL !== 'browser' || MODEL !== FIXTURE, 'Runs with the default fixture only.');
  await serveModel(page, 'lockdown-probe', readFileSync('tests/fixtures/browser-kernel/lockdown-probe.kcad.ts', 'utf8'));
  await page.goto('/studio?gallery=lockdown-probe&kernel=browser');
  const probe = page.getByText(/PROBE:\{/).first();
  await expect(probe).toBeVisible({ timeout: TICK_TIMEOUT_MS });
  const text = await probe.innerText();
  const report = JSON.parse(text.slice(text.indexOf('PROBE:') + 'PROBE:'.length, text.lastIndexOf('}') + 1)) as Record<string, string>;
  console.log('lockdown probe', report);
  expect(report.origin).toBe('null');
  for (const [capability, outcome] of Object.entries(report)) {
    if (capability === 'origin') continue;
    expect(outcome, capability).toBe('blocked');
  }
});
