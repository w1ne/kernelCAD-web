import type { Diagnostic, HarnessResult, Score } from './types';

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

export function computeScore(
  result: HarnessResult,
  meta: { attempts: number; tokens_in: number; tokens_out: number; time_ms: number },
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

  return {
    gates: result.gates,
    scored: result.scored,
    gate_pass,
    score,
    attempts: meta.attempts,
    tokens: { input: meta.tokens_in, output: meta.tokens_out, total: meta.tokens_in + meta.tokens_out },
    time_ms: meta.time_ms,
  };
}
