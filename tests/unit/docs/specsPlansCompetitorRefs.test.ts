// tests/unit/docs/specsPlansCompetitorRefs.test.ts
//
// Sentinel: committed spec/plan files (docs/superpowers/{specs,plans}/*.md)
// must not name external CAD systems by name in prose. Per the project's
// no_competitor_refs_in_repo rule, lineage stays in internal memory only.
//
// Backtick-fenced content (single-backtick code spans, triple-backtick
// fences) is exempt — those are operational quotations (regex patterns,
// quoted external file content, code samples).
//
// Closes rc.13 review N4: rc.13's own spec/plan committed lineage prose
// referring to comparator products by name.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve as resolvePath, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolvePath(__dirname, '../../../docs/superpowers/specs');
const PLANS_DIR = resolvePath(__dirname, '../../../docs/superpowers/plans');

// Files that pre-date the no-competitor-refs rule. The rule was first applied
// during rc.6 brainstorming (May 2026); anything dated 2026-04-* predates it.
// Pre-rule docs are historical artifacts and out of scope for the sweep.
const PREDATES_RULE_PREFIX = '2026-04-';

// Files that legitimately discuss the rule itself (the rc.14 spec and plan
// closing N4). Allowlisted.
const META_DISCUSSES_RULE = new Set<string>([
  '2026-05-01-v0.4-rc14-quality-pass-v4-design.md',
  '2026-05-01-v0.4-rc14-quality-pass-v4.md',
]);

const COMPETITOR_REGEX = /\b(forgecad|fusion\s?360|cadquery|onshape|catia|openscad)\b/i;

const isExcluded = (filename: string): boolean =>
  filename.startsWith(PREDATES_RULE_PREFIX) || META_DISCUSSES_RULE.has(filename);

/**
 * Strip backtick-fenced content from a single line. Removes both
 * single-backtick code spans (`code`) and any inline content between
 * triple-backtick fences. Also strips bare URLs containing the names.
 *
 * The sentinel uses this to look at PROSE-level competitor mentions, not
 * operational references like quoted regex patterns or quoted file paths.
 */
function stripCodeSpans(line: string): string {
  // Remove backtick-fenced spans (single backtick to single backtick, non-greedy).
  return line.replace(/`[^`]*`/g, '');
}

/**
 * Strip triple-backtick fenced blocks from the full file content.
 * Returns content with code blocks replaced by blank lines so line numbers
 * stay stable for error reporting.
 */
function stripFencedBlocks(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      out.push(''); // blank line in place of fence delimiter
      continue;
    }
    out.push(inFence ? '' : line);
  }
  return out.join('\n');
}

interface Violation {
  file: string;
  line: number;
  text: string;
}

function findViolations(filename: string, content: string): Violation[] {
  const violations: Violation[] = [];
  const cleanedContent = stripFencedBlocks(content);
  const lines = cleanedContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const proseOnly = stripCodeSpans(lines[i]);
    if (COMPETITOR_REGEX.test(proseOnly)) {
      violations.push({
        file: filename,
        line: i + 1,
        text: lines[i].trim().slice(0, 200),
      });
    }
  }
  return violations;
}

function readMarkdownFiles(dir: string): { name: string; content: string }[] {
  const out: { name: string; content: string }[] = [];
  const entries = readdirSync(dir);
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    if (isExcluded(name)) continue;
    const content = readFileSync(join(dir, name), 'utf8');
    out.push({ name, content });
  }
  return out;
}

describe('docs/superpowers spec+plan competitor-ref sentinel', () => {
  it('no spec or plan file (post-rule, non-meta) mentions named competitor products in prose', () => {
    const files = [
      ...readMarkdownFiles(SPECS_DIR),
      ...readMarkdownFiles(PLANS_DIR),
    ];
    expect(files.length).toBeGreaterThan(0);

    const allViolations: Violation[] = [];
    for (const { name, content } of files) {
      allViolations.push(...findViolations(name, content));
    }

    expect(
      allViolations,
      `Found competitor product references in committed spec/plan prose. ` +
      `Per feedback_no_competitor_refs_in_repo, lineage stays in internal memory only. ` +
      `Strip the named products and rewrite to native phrasing:\n` +
      allViolations.map((v) => `  ${v.file}:${v.line} — ${v.text}`).join('\n'),
    ).toEqual([]);
  });
});
