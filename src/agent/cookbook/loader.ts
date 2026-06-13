// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface Snippet {
  id: string;
  title: string;
  tags: string[];
  keywords: string[];
  when_to_use: string;
  body: string;       // raw TS code, fences stripped
  filepath: string;   // for traceability
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const FENCE_RE = /```typescript\n([\s\S]*?)\n```/g;

export function loadSnippets(rootDir = 'cookbook/snippets', tagsPath = 'cookbook/tags.json'): Snippet[] {
  if (!existsSync(rootDir)) {
    throw new Error(`Cookbook snippets directory not found: ${rootDir}`);
  }
  const allowedTags = new Set<string>(JSON.parse(readFileSync(tagsPath, 'utf8')));
  const files = readdirSync(rootDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const snippets: Snippet[] = [];
  for (const file of files) {
    const filepath = join(rootDir, file);
    const raw = readFileSync(filepath, 'utf8');
    snippets.push(parseSnippet(raw, filepath, allowedTags));
  }
  return snippets;
}

function parseSnippet(raw: string, filepath: string, allowedTags: Set<string>): Snippet {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    throw new Error(`${filepath}: missing or malformed frontmatter (expected leading '---' fences)`);
  }
  const fm = parseYaml(m[1]) as Partial<Snippet> | null;
  if (!fm || typeof fm !== 'object') {
    throw new Error(`${filepath}: frontmatter did not parse as a YAML object`);
  }

  const required = ['id', 'title', 'tags', 'keywords', 'when_to_use'] as const;
  for (const field of required) {
    if (fm[field] === undefined) {
      throw new Error(`${filepath}: frontmatter missing required field '${field}'`);
    }
  }

  const filenameStem = basename(filepath, extname(filepath));
  if (fm.id !== filenameStem) {
    throw new Error(`${filepath}: filename stem '${filenameStem}' does not match frontmatter id '${fm.id}'`);
  }

  if (!Array.isArray(fm.tags)) {
    throw new Error(`${filepath}: 'tags' must be an array`);
  }
  for (const tag of fm.tags) {
    if (!allowedTags.has(tag)) {
      throw new Error(`${filepath}: unknown tag '${tag}' (add it to cookbook/tags.json with justification)`);
    }
  }

  if (!Array.isArray(fm.keywords) || fm.keywords.length < 1) {
    throw new Error(`${filepath}: 'keywords' must be a non-empty array`);
  }

  // Body validation — exactly one fenced typescript block in the post-frontmatter text.
  const body = m[2];
  const matches = [...body.matchAll(FENCE_RE)];
  if (matches.length === 0) {
    throw new Error(`${filepath}: body has no \`\`\`typescript code fence`);
  }
  if (matches.length > 1) {
    throw new Error(`${filepath}: exactly one code fence required, found ${matches.length}`);
  }

  return {
    id: fm.id as string,
    title: fm.title as string,
    tags: fm.tags as string[],
    keywords: fm.keywords as string[],
    when_to_use: fm.when_to_use as string,
    body: matches[0][1].trim(),
    filepath,
  };
}
