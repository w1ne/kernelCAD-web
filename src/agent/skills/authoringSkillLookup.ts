// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sectioned access to the kernelcad-authoring SKILL.md for the
// `lookup_authoring_skill` MCP tool.
//
// The full SKILL.md is ~108k characters — more than an MCP client's response
// limit, so returning it whole broke the very first call an agent makes. The
// default answer is now a short index (one line per section) plus the
// essential quick-start; the agent pulls the sections it needs by `section`
// id, or searches with `query`. `section: 'all'` keeps the old full body.
//
// kernelCAD-server hosts the tool and imports this module through the
// vendored bundle (src/agent/mcp/toolRegistry.ts re-exports it), so the
// server and the SKILL.md share one parser.

export interface AuthoringSkillSection {
  /** Slug of the heading, e.g. `coordinate-system`. */
  id: string;
  title: string;
  /** 2 for `##`, 3 for `###`. */
  level: 2 | 3;
  /** Parent `##` id for a `###` section. */
  parent?: string;
  /** Heading line through the end of the section (a `##` includes its `###`s). */
  text: string;
  /** One-line summary: the first prose sentence under the heading. */
  summary: string;
}

export interface LookupAuthoringSkillInput {
  /** Section id or title from the index, or `'all'` for the full SKILL.md. */
  section?: string;
  /** Alias of `section` that also accepts a loose title (e.g. "materials"). */
  topic?: string;
  /** Keyword search over section titles and bodies. */
  query?: string;
}

export interface LookupAuthoringSkillResult {
  /** `index` (no args), `section`, `search`, `all`, or `not-found`. */
  mode: 'index' | 'section' | 'search' | 'all' | 'not-found';
  text: string;
  /** Section ids returned in `text` (section / search modes). */
  sections?: string[];
}

/** Sections inlined in the default answer: what an agent needs before its
 *  first script (units and axes, the return rule, params, overlap rule, and
 *  which API serves a manufacturing intent such as a tapped hole or a gear). */
const QUICK_START_SECTIONS = ['coordinate-system', 'conventions', 'manufacturing-intent-api'];
/** `##` sections large enough that the index lists their `###` parts too. */
const INDEX_EXPANDED_SECTIONS = new Set(['api-surface', 'materials']);
/** Cap on one search answer so a broad query cannot blow the limit again. */
const SEARCH_BODY_CAP = 24_000;
const SUMMARY_MAX = 56;

export function slugifyHeading(title: string): string {
  return title
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---\n')) return markdown;
  const end = markdown.indexOf('\n---', 4);
  return end < 0 ? markdown : markdown.slice(end + 4).replace(/^\n+/, '');
}

function summarize(body: string): string {
  let inFence = false;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || line === '' || line.startsWith('#') || line.startsWith('|') || line.startsWith('<!--')) continue;
    const plain = line
      .replace(/^[-*]\s+|^\d+\.\s+/, '')
      .replace(/\*\*|__|`/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    const sentence = plain.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? plain;
    return sentence.length > SUMMARY_MAX ? `${sentence.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : sentence;
  }
  return '';
}

interface Heading {
  level: 1 | 2 | 3;
  title: string;
  line: number;
}

/** Split SKILL.md into `##` and `###` sections (fenced code is not scanned
 *  for headings). The preamble before the first `##` is returned separately. */
export function parseAuthoringSkill(markdown: string): {
  preamble: string;
  sections: AuthoringSkillSection[];
} {
  const lines = stripFrontmatter(markdown).split('\n');
  const headings: Heading[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('```')) inFence = !inFence;
    if (inFence) return;
    const m = /^(#{1,3}) (.+?)\s*$/.exec(line);
    if (m) headings.push({ level: m[1].length as 1 | 2 | 3, title: m[2], line: i });
  });

  const firstH2 = headings.find((h) => h.level === 2);
  const preamble = lines.slice(0, firstH2?.line ?? lines.length).join('\n').trim();
  const sections: AuthoringSkillSection[] = [];
  const seen = new Map<string, number>();
  let parent: string | undefined;
  headings.forEach((h, idx) => {
    if (h.level === 1) return;
    // A section runs to the next heading of the same or higher level.
    const next = headings.slice(idx + 1).find((o) => o.level <= h.level);
    const text = lines.slice(h.line, next?.line ?? lines.length).join('\n').trim();
    let id = slugifyHeading(h.title);
    const dup = seen.get(id) ?? 0;
    seen.set(id, dup + 1);
    if (dup > 0) id = `${id}-${dup + 1}`;
    if (h.level === 2) parent = id;
    sections.push({
      id,
      title: h.title,
      level: h.level,
      ...(h.level === 3 && parent !== undefined ? { parent } : {}),
      text,
      summary: summarize(lines.slice(h.line + 1, next?.line ?? lines.length).join('\n')),
    });
  });
  return { preamble, sections };
}

function buildIndex(sections: AuthoringSkillSection[]): string {
  const rows: string[] = [];
  for (const s of sections) {
    const show = s.level === 2 || (s.parent !== undefined && INDEX_EXPANDED_SECTIONS.has(s.parent));
    if (!show) continue;
    const indent = s.level === 3 ? '  ' : '';
    const size = `${Math.round(s.text.length / 1000)}k`;
    rows.push(`${indent}- \`${s.id}\` — ${s.title} (${size})${s.summary ? `: ${s.summary}` : ''}`);
  }
  return rows.join('\n');
}

function findSection(sections: AuthoringSkillSection[], key: string): AuthoringSkillSection | undefined {
  const slug = slugifyHeading(key);
  return sections.find((s) => s.id === slug)
    ?? sections.find((s) => slugifyHeading(s.title) === slug)
    ?? sections.find((s) => s.id.startsWith(slug))
    ?? sections.find((s) => slug.length >= 4 && s.id.includes(slug));
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}

function searchSections(sections: AuthoringSkillSection[], query: string): AuthoringSkillSection[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];
  // Score the smallest units: a `##` without subsections, or each `###`.
  const hasChildren = new Set(sections.filter((s) => s.parent).map((s) => s.parent));
  const units = sections.filter((s) => s.level === 3 || !hasChildren.has(s.id));
  const scored = units.map((s) => {
    const title = tokenize(s.title);
    const body = tokenize(s.text);
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      const inTitle = title.filter((w) => w.startsWith(t)).length;
      const inBody = body.filter((w) => w.startsWith(t)).length;
      if (inTitle + inBody > 0) matched += 1;
      score += 5 * inTitle + Math.log1p(inBody);
    }
    // Favour sections that match every term, and dense (short) ones.
    return { s, score: (score * matched) / terms.length / Math.log(20 + body.length / 50) };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.s);
}

/**
 * Answer a `lookup_authoring_skill` call against the SKILL.md body.
 *
 * - no args → index of sections (id, title, size, one-line summary) plus the
 *   quick-start (preamble, coordinate system, conventions), under ~8k chars;
 * - `section` / `topic` → that section's full text (`'all'` → whole body);
 * - `query` → the best-matching sections' text, capped, plus the ids of the
 *   next matches.
 */
export function lookupAuthoringSkill(
  markdown: string,
  input: LookupAuthoringSkillInput = {},
): LookupAuthoringSkillResult {
  const { preamble, sections } = parseAuthoringSkill(markdown);
  const key = input.section ?? input.topic;
  if (key !== undefined && key.trim().toLowerCase() === 'all') {
    return { mode: 'all', text: markdown };
  }
  if (key !== undefined && key.trim() !== '') {
    const hit = findSection(sections, key);
    if (hit) return { mode: 'section', text: hit.text, sections: [hit.id] };
    return {
      mode: 'not-found',
      text: `No section '${key}'. Pass one of these ids as \`section\`, or search with \`query\`:\n\n${buildIndex(sections)}`,
    };
  }
  if (input.query !== undefined && input.query.trim() !== '') {
    const hits = searchSections(sections, input.query);
    if (hits.length === 0) {
      return {
        mode: 'not-found',
        text: `Nothing in the authoring skill matches '${input.query}'. Sections:\n\n${buildIndex(sections)}`,
      };
    }
    const picked: AuthoringSkillSection[] = [];
    let size = 0;
    for (const h of hits.slice(0, 3)) {
      if (picked.length > 0 && size + h.text.length > SEARCH_BODY_CAP) break;
      picked.push(h);
      size += h.text.length;
    }
    const more = hits.slice(picked.length, picked.length + 5).map((h) => `\`${h.id}\``);
    const body = picked.map((h) => (h.text.length > SEARCH_BODY_CAP ? `${h.text.slice(0, SEARCH_BODY_CAP)}\n…(truncated — pass section: '${h.id}' for the rest)` : h.text));
    return {
      mode: 'search',
      text: body.join('\n\n---\n\n') + (more.length > 0 ? `\n\n---\nMore matches: ${more.join(', ')}` : ''),
      sections: picked.map((h) => h.id),
    };
  }

  const quick = QUICK_START_SECTIONS
    .map((id) => sections.find((s) => s.id === id)?.text)
    .filter((t): t is string => t !== undefined);
  return {
    mode: 'index',
    text: [
      preamble,
      ...quick,
      '## Sections',
      "Pull a section with `lookup_authoring_skill({ section: '<id>' })`, search with `{ query: '...' }`, or get everything with `{ section: 'all' }` (~" +
        `${Math.round(markdown.length / 1000)}k chars).`,
      buildIndex(sections),
    ].join('\n\n'),
  };
}

/** Tool description for `lookup_authoring_skill` (hosted by kernelCAD-server). */
export const LOOKUP_AUTHORING_SKILL_DESCRIPTION = [
  'Return the kernelcad-authoring skill — conventions for writing .kcad.ts scripts (API surface, parameters, evaluation contract, common pitfalls) — in sections.',
  '',
  'Call with NO arguments first: you get the quick-start (units, axes, the return rule, conventions) and an index of every section with a one-line summary (under ~8k chars). Then pull what you need: `{ section: "<id>" }` returns one section (e.g. "top-level-functions", "materials", "dfm-gates-print-readiness"); `{ query: "fillet after subtract" }` returns the best-matching sections. `{ section: "all" }` returns the full ~108k-char SKILL.md — only if your client accepts large responses.',
  '',
  'Clients that list resources can also read `kernelcad://skills/authoring` (the full body).',
  '',
  'OUTPUT: { uri, mimeType, mode, text, sections? } — `mode` is index | section | search | all | not-found.',
].join('\n');

/** JSON-schema for the tool's input. */
export const LOOKUP_AUTHORING_SKILL_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    section: {
      type: 'string',
      description: "Section id from the index (e.g. 'top-level-functions'), or 'all' for the full SKILL.md.",
    },
    topic: {
      type: 'string',
      description: "Alias of section; also accepts a loose title such as 'materials' or 'cli commands'.",
    },
    query: {
      type: 'string',
      description: 'Keywords to search section titles and bodies (e.g. "sweep along helix").',
    },
  },
};
