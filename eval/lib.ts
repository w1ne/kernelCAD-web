// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Diagnostic, HarnessResult, Score, TranscriptEvent } from './types';

const FENCED_LANGS = ['typescript', 'ts', 'kcad', ''];

export function extractScript(text: string): string | null {
  if (!text || !text.trim()) return null;

  // Match fenced blocks: ``` followed by optional language tag, newline, body, then ```
  const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(text)) !== null) {
    const lang = (m[1] ?? '').toLowerCase();
    if (FENCED_LANGS.includes(lang)) {
      return m[2].trim();
    }
  }

  // No matching fence — return the whole text trimmed.
  return text.trim();
}

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      let line = `- \`${d.code}\` — ${d.message}`;
      if (d.featureId) line += ` (feature: ${d.featureId})`;
      if (d.hint) line += `\n  Hint: ${d.hint}`;
      return line;
    })
    .join('\n');
}

// W2 — funnel-gate cascade. Each stage matches gate/scored NAMES by substring
// (case-insensitive). A stage with zero matches is omitted from the funnel so
// unrelated tasks don't carry empty stages.
const FUNNEL_STAGES: { stage: string; matchers: string[] }[] = [
  { stage: 'code-valid', matchers: ['evaluates clean'] },
  { stage: 'watertight/non-overlapping', matchers: ['non-empty solid', 'interference', 'watertight'] },
  { stage: 'mechanism-real', matchers: ['eyewear-wide', 'mechanism', 'joint', 'reachab'] },
  { stage: 'design-intent', matchers: ['silhouette', 'composite', 'ssim', 'chamfer', 'bbox', 'rubric'] },
];

function buildFunnel(
  gates: Record<string, boolean>,
  scored: Record<string, boolean>,
): { stage: string; passed: number; total: number }[] {
  const all: [string, boolean][] = [...Object.entries(gates), ...Object.entries(scored)];
  const out: { stage: string; passed: number; total: number }[] = [];
  for (const { stage, matchers } of FUNNEL_STAGES) {
    let passed = 0;
    let total = 0;
    for (const [name, value] of all) {
      const lower = name.toLowerCase();
      if (matchers.some((m) => lower.includes(m))) {
        total++;
        if (value) passed++;
      }
    }
    if (total > 0) out.push({ stage, passed, total });
  }
  return out;
}

export function computeScore(
  result: HarnessResult,
  meta: { attempts: number; tokens_in: number; tokens_out: number; time_ms: number; firstFailureCode?: string },
): Score {
  const gateValues = Object.values(result.gates);
  const gate_pass = gateValues.every((v) => v);

  let score: number;
  if (!gate_pass) {
    score = 0;
  } else {
    const scoredValues = Object.values(result.scored);
    const total = scoredValues.length;
    if (total === 0) {
      score = 1; // gates-only success
    } else {
      const passed = scoredValues.filter((v) => v).length;
      score = passed / total;
    }
  }

  const out: Score = {
    gates: result.gates,
    scored: result.scored,
    gate_pass,
    score,
    attempts: meta.attempts,
    tokens: { input: meta.tokens_in, output: meta.tokens_out, total: meta.tokens_in + meta.tokens_out },
    time_ms: meta.time_ms,
  };
  if (meta.firstFailureCode !== undefined) out.firstFailureCode = meta.firstFailureCode;
  out.funnel = buildFunnel(result.gates, result.scored);
  return out;
}

export interface RenderTranscriptArgs {
  task: string;
  model: string;
  started_at: string;
  events: TranscriptEvent[];
  score: Score;
}

const formatNum = (n: number) => n.toLocaleString('en-US');
const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function renderTranscript(args: RenderTranscriptArgs): string {
  const lines: string[] = [];
  lines.push(`# ${args.task} — ${args.model} — ${args.started_at}`);
  lines.push('');

  for (const ev of args.events) {
    if (ev.kind === 'system_prompt') {
      // We deliberately do not dump the full SKILL.md into the transcript;
      // the chars count is enough for forensics.
      continue;
    }
    if (ev.kind === 'user_prompt') {
      lines.push('## Prompt');
      for (const line of ev.content.split('\n')) {
        lines.push(`> ${line}`);
      }
      lines.push('');
    } else if (ev.kind === 'turn') {
      lines.push(
        `## Turn ${ev.attempt} (in: ${formatNum(ev.tokens_in)} tok, out: ${formatNum(
          ev.tokens_out,
        )} tok, ${formatSeconds(ev.ms)})`,
      );
      lines.push('');
      lines.push(ev.assistant_text);
      lines.push('');
    } else if (ev.kind === 'evaluate') {
      const verdict = ev.ok ? 'OK' : 'FAIL';
      lines.push(`## Evaluate (attempt ${ev.attempt}) — ${verdict}`);
      if (ev.diagnostics.length > 0) {
        lines.push(formatDiagnostics(ev.diagnostics));
      }
      lines.push('');
    } else if (ev.kind === 'cookbook_inject') {
      lines.push(`## Cookbook injection`);
      lines.push(`- query: "${ev.query}"`);
      if (ev.hits.length === 0) {
        lines.push('- hits: (no match above floor)');
      } else {
        lines.push(`- hits:`);
        for (const h of ev.hits) {
          lines.push(`  - ${h.id} (score ${h.score.toFixed(2)})`);
        }
      }
      lines.push('');
    } else if (ev.kind === 'score') {
      // Score block is rendered at end from the score arg, not from this event.
    }
  }

  // Final score block.
  lines.push('## Score');
  const gatesLine = Object.entries(args.score.gates)
    .map(([n, v]) => `${v ? '✓' : '✗'} ${n}`)
    .join(', ');
  lines.push(`- Gates: ${gatesLine || '(none)'}`);

  const scoredEntries = Object.entries(args.score.scored);
  const passed = scoredEntries.filter(([, v]) => v).length;
  const total = scoredEntries.length;
  const pct = total === 0 ? (args.score.gate_pass ? 100 : 0) : Math.round((passed / total) * 100);
  lines.push(`- Scored: ${passed}/${total} — ${pct}%`);

  const t = args.score.tokens;
  lines.push(`- Tokens: ${formatNum(t.input)} in / ${formatNum(t.output)} out / ${formatNum(t.total)} total`);
  lines.push(`- Time: ${formatSeconds(args.score.time_ms)}`);
  lines.push(`- Attempts: ${args.score.attempts}`);

  return lines.join('\n');
}
