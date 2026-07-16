#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync, writeFileSync } from 'node:fs';
import { loadSnippets, type Snippet } from '../src/agent/cookbook/index';
import { rewriteMarkedSection } from './lib/rewriteMarkedSection';

const SKILL_PATH = 'src/agent/skills/kernelcad-authoring/SKILL.md';
const START_MARKER = '<!-- COOKBOOK:START -->';
const END_MARKER = '<!-- COOKBOOK:END -->';

export function renderCookbookSection(snippets: Snippet[]): string {
  const lines: string[] = [];
  lines.push('## Cookbook (snippet index)');
  lines.push('');
  lines.push(
    'When you need a canonical pattern, call MCP tool `lookup_cookbook(query, k?)` to fetch the full body of a snippet. The IDs and triggers below are the full v1 inventory; query by intent, not by ID.',
  );
  lines.push('');
  if (snippets.length === 0) {
    lines.push('_(empty)_');
    lines.push('');
    return lines.join('\n');
  }
  lines.push('| ID | Trigger |');
  lines.push('|---|---|');
  const sorted = [...snippets].sort((a, b) => a.id.localeCompare(b.id));
  for (const s of sorted) {
    // Escape pipes inside when_to_use so the table stays valid markdown.
    const trigger = s.when_to_use.replace(/\|/g, '\\|');
    lines.push(`| ${s.id} | ${trigger} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function rewriteSkillMd(generated: string): { changed: boolean; before: string; after: string } {
  const before = readFileSync(SKILL_PATH, 'utf8');
  const { changed, after } = rewriteMarkedSection(
    before,
    generated,
    START_MARKER,
    END_MARKER,
    SKILL_PATH,
  );
  return { changed, before, after };
}

function main(): void {
  const snippets = loadSnippets();
  const generated = renderCookbookSection(snippets);
  const { changed, after } = rewriteSkillMd(generated);
  if (changed) {
    writeFileSync(SKILL_PATH, after);
    console.log(`✓ regenerated cookbook section in ${SKILL_PATH} (${snippets.length} snippet(s))`);
  } else {
    console.log(`✓ ${SKILL_PATH} cookbook section already up to date (${snippets.length} snippet(s))`);
  }
}

// Run main only when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
