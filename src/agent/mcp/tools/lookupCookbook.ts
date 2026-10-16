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
  /** Natural-language query (BM25). One of `query` / `id` is required. */
  query?: string;
  /** Exact snippet id, as the skills cite it: `lookup_cookbook(<id>)`. */
  id?: string;
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

/** Shared inventory for lookup_cookbook + execute_cookbook (same resolve path). */
export function getCookbookSnippets(): ReturnType<typeof loadSnippets> {
  return snippets();
}

function toHit(snippet: ReturnType<typeof loadSnippets>[number], score: number): CookbookHit {
  return { id: snippet.id, title: snippet.title, when_to_use: snippet.when_to_use, body: snippet.body, score };
}

export async function lookupCookbookTool(input: LookupCookbookInput): Promise<LookupCookbookOutput> {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (id.length > 0) {
    // The skills cite recipes as lookup_cookbook(<id>): resolve the id exactly,
    // and fall back to ranking it as a query (hyphens read as words).
    const exact = snippets().find((sn) => sn.id === id);
    if (exact) return { ok: true, hits: [toHit(exact, 1)] };
    const fallback = search(id.replace(/[-_]+/g, ' '), snippets(), input.k ?? 3).map((h) => toHit(h.snippet, h.score));
    return fallback.length > 0
      ? { ok: true, hits: fallback }
      : { ok: false, error: `no cookbook snippet with id '${id}' (and nothing ranked for it as a query)` };
  }
  if (typeof input.query !== 'string' || input.query.trim().length === 0) {
    return { ok: false, error: 'pass a non-empty query (natural language) or id (exact snippet id)' };
  }
  const k = input.k ?? 3;
  const hits = search(input.query, snippets(), k).map((h) => toHit(h.snippet, h.score));
  return { ok: true, hits };
}
