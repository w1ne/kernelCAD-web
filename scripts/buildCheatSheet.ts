#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Render docs/cheat-sheet.md from CHEAT_SHEET_TAXONOMY + listApi entry data.
// No prose is authored here: signatures and blurbs are read out of listApi so
// the doc cannot drift from the runtime surface it documents.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  CHEAT_SHEET_TAXONOMY,
  API_ENTRY_SOURCES,
  allApiEntryNames,
  resolveEntry,
} from '../src/agent/mcp/tools/cheatSheetTaxonomy';

export const CHEAT_SHEET_PATH = 'docs/cheat-sheet.md';

const HEADER = [
  '<!-- GENERATED — do not edit by hand, run `npx tsx scripts/buildCheatSheet.ts` -->',
  '',
  '# kernelCAD cheat sheet',
  '',
  'The script API grouped by what you are trying to DO. Every row is generated from',
  '`src/agent/mcp/tools/listApi.ts`; call `lookup_api(query)` for the full description of any entry.',
  '',
];

/** First sentence of a description — the table needs one line, not a paragraph. */
function firstSentence(description: string): string {
  const s = description.split(/(?<=[.!?])\s/)[0] ?? description;
  return s.trim();
}

/** Markdown table cells: pipes break the row, newlines break the table. */
function cell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
}

export function renderCheatSheet(): string {
  const lines: string[] = [...HEADER];

  lines.push('| Task | What it covers |');
  lines.push('|---|---|');
  for (const group of CHEAT_SHEET_TAXONOMY) {
    const anchor = group.task.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ /g, '-');
    lines.push(`| [${cell(group.task)}](#${anchor}) | ${cell(group.blurb)} |`);
  }
  lines.push('');

  for (const group of CHEAT_SHEET_TAXONOMY) {
    lines.push(`## ${group.task}`);
    lines.push('');
    lines.push(group.blurb);
    lines.push('');
    lines.push('| Call | What it does |');
    lines.push('|---|---|');
    // Taxonomy order is authored intent (build order within a task), so it is
    // preserved rather than sorted; resolveEntry keeps receivers in a fixed
    // order, which is what makes the output deterministic.
    for (const name of group.names) {
      for (const { source, entry } of resolveEntry(name)) {
        const call = `${source.callPrefix}${entry.name}${entry.signature.startsWith('(') ? entry.signature : ` : ${entry.signature}`}`;
        lines.push(`| \`${cell(call)}\` | ${cell(firstSentence(entry.description))} |`);
      }
    }
    lines.push('');
  }

  // Only rendered when the drift test is red: a silently incomplete cheat
  // sheet is worse than a loud one, because agents read it as exhaustive.
  const classified = new Set(CHEAT_SHEET_TAXONOMY.flatMap((g) => g.names));
  const orphans = allApiEntryNames().filter((n) => !classified.has(n)).sort();
  if (orphans.length > 0) {
    lines.push('## Uncategorized');
    lines.push('');
    lines.push(
      'These entries have no task home yet. Classify them in `src/agent/mcp/tools/cheatSheetTaxonomy.ts`.',
    );
    lines.push('');
    for (const name of orphans) {
      const where = resolveEntry(name).map(({ source }) => source.label).join(', ');
      lines.push(`- \`${cell(name)}\` (${where})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main(): void {
  const generated = renderCheatSheet();
  let before = '';
  try {
    before = readFileSync(CHEAT_SHEET_PATH, 'utf8');
  } catch {
    before = '';
  }
  const total = API_ENTRY_SOURCES.reduce((n, s) => n + s.entries.length, 0);
  if (before === generated) {
    console.log(`✓ ${CHEAT_SHEET_PATH} already up to date (${total} entries)`);
    return;
  }
  writeFileSync(CHEAT_SHEET_PATH, generated);
  console.log(`✓ regenerated ${CHEAT_SHEET_PATH} (${total} entries)`);
}

// Run main only when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
