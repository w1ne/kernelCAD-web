// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/lib/mechanismBanner.ts
//
// Shared lines of the "MECHANISM BROKEN" banner that `kernelcad validate`
// and strict `kernelcad render` print. The probe's failure list also carries
// non-fatal entries (an 'info' passive-joint drop note, a 'warn' skipped
// sweep); only error-severity entries make the verdict 'broken', so only
// those are counted as failures and labelled ERROR.

import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

/** The entries that make a mechanism 'broken' (see `checkMechanismTruth`). */
export function mechanismErrors<T extends Pick<CompilerDiagnostic, 'severity'>>(failures: readonly T[]): T[] {
  return failures.filter((d) => d.severity === 'error');
}

function severityLabel(severity: CompilerDiagnostic['severity']): 'ERROR' | 'WARN' | 'NOTE' {
  return severity === 'error' ? 'ERROR' : severity === 'warn' ? 'WARN' : 'NOTE';
}

/**
 * Banner lines: the headline with the error count, the errors, then the
 * non-fatal entries under their own label. `verdict` is the text after the
 * dash ("this assembly will not work as built", "render refused").
 */
export function mechanismBannerLines(
  failures: readonly CompilerDiagnostic[],
  verdict: string,
  isTty: boolean,
): string[] {
  const RED = isTty ? '\x1b[31m' : '';
  const BOLD = isTty ? '\x1b[1m' : '';
  const RESET = isTty ? '\x1b[0m' : '';
  const errors = mechanismErrors(failures);
  const lines = [
    `${BOLD}${RED}MECHANISM BROKEN${RESET} — ${verdict} (${errors.length} failure${errors.length === 1 ? '' : 's'})`,
  ];
  for (const d of [...errors, ...failures.filter((f) => f.severity !== 'error')]) {
    const label = severityLabel(d.severity);
    lines.push(`  ${label === 'ERROR' ? `${RED}[ERROR]${RESET}` : `[${label}]`} ${d.code}`);
    lines.push(`         ${d.message}`);
    lines.push(`         hint: ${d.hint}`);
  }
  return lines;
}
