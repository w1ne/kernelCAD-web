// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { LookupAgentClient } from './agentLookup';
import type { AgentClient, AgentResponse } from './types';

function scripted(texts: string[]): AgentClient & { seen: string[][] } {
  const seen: string[][] = [];
  let i = 0;
  return {
    seen,
    async generate(opts): Promise<AgentResponse> {
      seen.push(opts.messages.map((m) => m.content));
      return { text: texts[i++] ?? '```typescript\nreturn box(1,1,1);\n```', tokens_in: 10, tokens_out: 5 };
    },
  };
}

describe('LookupAgentClient', () => {
  it('answers a lookup line, then returns the reply that carries the script', async () => {
    const inner = scripted(['LOOKUP_API: counterbore hole', '```typescript\nreturn box(1,1,1);\n```']);
    const client = new LookupAgentClient(inner, async (kind, q) => `${kind}:${q}:RESULT`);
    const r = await client.generate({ system: 's', messages: [{ role: 'user', content: 'task' }], model: 'm', max_tokens: 100 });
    expect(r.text).toContain('```typescript');
    expect(r.tokens_in).toBe(20);
    expect(client.lookups).toBe(1);
    expect(inner.seen[1].at(-1)).toContain('API:counterbore hole:RESULT');
  });

  it('stops looking up after the cap and hands back the last reply', async () => {
    const inner = scripted(Array(10).fill('LOOKUP_SKILL: more'));
    const client = new LookupAgentClient(inner, async () => 'x', 2);
    const r = await client.generate({ system: 's', messages: [{ role: 'user', content: 't' }], model: 'm', max_tokens: 100 });
    expect(client.lookups).toBe(2);
    expect(r.text).toContain('LOOKUP_SKILL');
  });

  it('passes a reply with a code fence straight through', async () => {
    const inner = scripted(['```typescript\nreturn box(1,1,1);\n```']);
    const client = new LookupAgentClient(inner, async () => 'x');
    await client.generate({ system: 's', messages: [{ role: 'user', content: 't' }], model: 'm', max_tokens: 100 });
    expect(client.lookups).toBe(0);
  });
});
