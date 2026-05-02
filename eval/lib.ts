import type { Diagnostic } from './types';

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
