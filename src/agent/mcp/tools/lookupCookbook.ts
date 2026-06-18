// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/lookupCookbook.ts
//
// MCP tool: BM25 search over the curated kernelCAD cookbook. Returns
// the top-k snippets matching a natural-language query, ranked by score
// over title + tags + keywords + when_to_use (body excluded). Empty hits
// is a valid success — tells the agent "no canonical pattern available
// for this intent; proceed without cookbook help."

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadSnippets, search } from '../../cookbook/index';

export interface LookupCookbookInput {
  query: string;
  k?: number;
}

export interface CookbookHit {
  id: string;
  title: string;
  when_to_use: string;
  body: string;
  score: number;
}

export interface LookupCookbookOutput {
  ok: boolean;
  hits?: CookbookHit[];
  error?: string;
}

// Snippet inventory is small (~12 in v1) and pure data — load once per
// process and reuse across calls. Tests load lazily on first use.
// Resolve the cookbook directory independent of process cwd. In prod the tool
// runs from the esbuild bundle (dist/mcp/toolRegistry.js) with the cookbook
// copied alongside it (vendor:build → dist/mcp/cookbook); in dev/tests it runs
// from source with the cookbook at the repo root. Was previously cwd-relative,
// which 404'd in the prod container (cwd=/app, no /app/cookbook).
function resolveCookbookDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, 'cookbook'), // bundled: dist/mcp/toolRegistry.js → dist/mcp/cookbook
    resolve(here, '../../../../cookbook'), // source: src/agent/mcp/tools → <repo>/cookbook
    'cookbook', // cwd-relative fallback (repo-root runs/tests)
  ];
  return candidates.find((c) => existsSync(resolve(c, 'snippets'))) ?? candidates[candidates.length - 1];
}

let cached: ReturnType<typeof loadSnippets> | null = null;
function snippets() {
  if (cached === null) {
    const dir = resolveCookbookDir();
    cached = loadSnippets(resolve(dir, 'snippets'), resolve(dir, 'tags.json'));
  }
  return cached;
}

export async function lookupCookbookTool(input: LookupCookbookInput): Promise<LookupCookbookOutput> {
  if (typeof input.query !== 'string' || input.query.trim().length === 0) {
    return { ok: false, error: 'query must be a non-empty string' };
  }
  const k = input.k ?? 3;
  const hits = search(input.query, snippets(), k).map((h) => ({
    id: h.snippet.id,
    title: h.snippet.title,
    when_to_use: h.snippet.when_to_use,
    body: h.snippet.body,
    score: h.score,
  }));
  return { ok: true, hits };
}
