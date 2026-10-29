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
  'The script API, grouped by the job you are doing rather than by the object you',
  'call it on. Rows come from `src/agent/mcp/tools/listApi.ts`; for the full',
  'description of any entry, call `lookup_api(query)`.',
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
    if (group.task === 'Import & export') appendGlbRigNotes(lines);
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

function appendGlbRigNotes(lines: string[]): void {
  lines.push(
    '### GLB assembly rigs',
    '',
    'When a returned assembly scene has mates, GLB export defaults to a strict node',
    'hierarchy. Revolute, prismatic, and cylindrical mates create `pivot:<mateName>`',
    'nodes at the resolved connector frame; moving part meshes are offset beneath',
    'those pivots so the solved pose remains unchanged. Fastened parts remain',
    'grouped under their parent. A pivot’s local `+Z` axis follows the mate axis.',
    '',
    'The asset-level `extras.kernelcad.rig` map records `type`, local `axis`,',
    '`range`, and pivot `node`. Rotational `range` values are degrees; slide `range`',
    'and cylindrical `slideRange` values are millimetres. Explicit absolute mate',
    'limits are offset by the captured pose, so ranges are relative to the exported',
    'rest pose (for example, limits `[0, 110]` at pose `35` become `[-35, 75]`).',
    'Cylindrical entries identify both degrees of freedom with',
    '`degreesOfFreedom: [\'rotate\', \'slide\']`; the current solver poses its',
    'secondary axial degree of freedom at zero. Loop-closing mates have',
    '`closed: true`, are not nested, and generate a warning. Ball, planar, and',
    'pin-slot mates are held fixed with a warning; GLB animation clips and IK are',
    'not emitted. When a solved assembly is active, `asset_manifest` includes the',
    'same `rig` map and `rigWarnings`; the params JSON helper can emit a',
    '`{ params, rig }` envelope when given that map (without it, the legacy flat',
    'knob JSON remains unchanged).',
    '',
    'Set the GLB export option `hierarchy: \'flat\'` to keep the historical flat',
    'node list. See the original [hinge assembly example](../examples/assemblies/glb-rig-hinge.kcad.ts).',
    '',
  );
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
