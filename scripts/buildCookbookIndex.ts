#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { loadSnippets, type Snippet } from '../src/cookbook/index';

const SKILL_PATH = 'src/skill/SKILL.md';
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
    lines.push('_(empty — no snippets in `cookbook/snippets/` yet)_');
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
  const startIdx = before.indexOf(START_MARKER);
  const endIdx = before.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `${SKILL_PATH} is missing ${START_MARKER} / ${END_MARKER} markers. Insert them before running this generator.`,
    );
  }
  if (endIdx < startIdx) {
    throw new Error(`${SKILL_PATH}: ${END_MARKER} appears before ${START_MARKER}`);
  }
  const head = before.slice(0, startIdx + START_MARKER.length);
  const tail = before.slice(endIdx);
  const after = `${head}\n${generated}\n${tail}`;
  return { changed: after !== before, before, after };
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
