// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { loadSnippets, search, type Snippet } from '../src/agent/cookbook/index';

export interface CookbookInjection {
  query: string;
  hits: Array<{ id: string; score: number }>;
  systemPromptAddendum: string;
}

const DEFAULT_K = 3;

export function injectCookbook(prompt: string, snippets?: Snippet[]): CookbookInjection {
  const all = snippets ?? loadSnippets();
  const results = search(prompt, all, DEFAULT_K);
  const hits = results.map((r) => ({ id: r.snippet.id, score: r.score }));

  if (results.length === 0) {
    return { query: prompt, hits: [], systemPromptAddendum: '' };
  }

  const lines: string[] = [];
  lines.push('## Retrieved cookbook snippets for this task');
  lines.push('');
  lines.push('The following canonical patterns may help with the task. Adapt freely.');
  lines.push('');
  for (const h of results) {
    lines.push(`### ${h.snippet.title}`);
    lines.push('');
    lines.push(h.snippet.when_to_use);
    lines.push('');
    lines.push('```typescript');
    lines.push(h.snippet.body);
    lines.push('```');
    lines.push('');
  }

  return { query: prompt, hits, systemPromptAddendum: lines.join('\n') };
}
