// src/mcp/tools/lookupCookbook.ts
//
// MCP tool: BM25 search over the curated kernelCAD cookbook. Returns
// the top-k snippets matching a natural-language query, ranked by score
// over title + tags + keywords + when_to_use (body excluded). Empty hits
// is a valid success — tells the agent "no canonical pattern available
// for this intent; proceed without cookbook help."

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
let cached: ReturnType<typeof loadSnippets> | null = null;
function snippets() {
  if (cached === null) cached = loadSnippets();
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
