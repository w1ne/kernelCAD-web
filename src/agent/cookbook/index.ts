// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { scoreBM25 } from './bm25';
import type { Snippet } from './loader';

export type { Snippet } from './loader';
export { loadSnippets } from './loader';

export interface SearchHit {
  snippet: Snippet;
  score: number;
}

const SCORE_FLOOR = 0.5;
const K_MIN = 1;
const K_MAX = 5;
const K_DEFAULT = 3;

function buildScoringText(s: Snippet): string {
  return `${s.title} ${s.tags.join(' ')} ${s.keywords.join(' ')} ${s.when_to_use}`;
}

export function search(query: string, snippets: Snippet[], k: number = K_DEFAULT): SearchHit[] {
  const kClamped = Math.max(K_MIN, Math.min(K_MAX, Math.floor(k) || K_DEFAULT));
  const docs = snippets.map((s) => ({ id: s.id, text: buildScoringText(s) }));
  const scored = scoreBM25(query, docs);
  const byId = new Map(snippets.map((s) => [s.id, s]));
  return scored
    .filter((d) => d.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, kClamped)
    .map((d) => ({ snippet: byId.get(d.id)!, score: d.score }));
}
