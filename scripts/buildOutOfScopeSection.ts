#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Renders the Out of Scope block in kernelcad-authoring/SKILL.md from
// OUT_OF_SCOPE_CLAIMS. Mirrors buildCookbookIndex.ts; shares its section
// rewriter via scripts/lib/rewriteMarkedSection.ts.
//
// Wired into `qc:build`, which already runs `git diff --exit-code src/agent/skills`
// after the generators — so a hand-edited Out of Scope block fails CI for free.
// Do not hand-edit the block; edit OUT_OF_SCOPE_CLAIMS and re-run this.
import { readFileSync, writeFileSync } from 'node:fs';
import {
  OUT_OF_SCOPE_CLAIMS,
  type OutOfScopeClaim,
} from '../src/agent/skills/outOfScope';
import { rewriteMarkedSection } from './lib/rewriteMarkedSection';

const SKILL_PATH = 'src/agent/skills/kernelcad-authoring/SKILL.md';
const START_MARKER = '<!-- OUT-OF-SCOPE:START -->';
const END_MARKER = '<!-- OUT-OF-SCOPE:END -->';

export function renderOutOfScopeSection(
  claims: readonly OutOfScopeClaim[],
): string {
  const lines: string[] = [];
  lines.push('## Out of Scope');
  lines.push('');
  // NB: "not available", not "return errors today" (the old wording). Most of
  // these have no API to call at all — chamfer takes one distance, there is no
  // tracked-ref authoring path — so an agent that tries gets a nonsense result
  // or an unrelated selector error, never a "not supported" diagnostic.
  lines.push(
    'These are not available today; do not generate code that uses them. ' +
      'Anything not listed here is fair game — call `lookup_api` / `lookup_cookbook` before concluding kernelCAD lacks a capability.',
  );
  lines.push('');
  if (claims.length === 0) {
    lines.push('_(nothing — every capability the authoring skill describes ships.)_');
    lines.push('');
    return lines.join('\n');
  }
  const sorted = [...claims].sort((a, b) => a.id.localeCompare(b.id));
  for (const c of sorted) {
    lines.push(`- ${c.claim}`);
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const generated = renderOutOfScopeSection(OUT_OF_SCOPE_CLAIMS);
  const before = readFileSync(SKILL_PATH, 'utf8');
  const { changed, after } = rewriteMarkedSection(
    before,
    generated,
    START_MARKER,
    END_MARKER,
    SKILL_PATH,
  );
  if (changed) {
    writeFileSync(SKILL_PATH, after);
    console.log(
      `✓ regenerated Out of Scope section in ${SKILL_PATH} (${OUT_OF_SCOPE_CLAIMS.length} claim(s))`,
    );
  } else {
    console.log(
      `✓ ${SKILL_PATH} Out of Scope section already up to date (${OUT_OF_SCOPE_CLAIMS.length} claim(s))`,
    );
  }
}

// Run main only when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
