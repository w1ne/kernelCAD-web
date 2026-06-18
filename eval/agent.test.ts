// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { MockAgentClient } from './agent';

describe('MockAgentClient', () => {
  it('replays canned responses in order', async () => {
    const client = new MockAgentClient([
      { text: '```typescript\nreturn box(1,1,1);\n```', tokens_in: 100, tokens_out: 20 },
      { text: '```typescript\nreturn box(2,2,2);\n```', tokens_in: 110, tokens_out: 25 },
    ]);
    const r1 = await client.generate({ system: 'sys', messages: [], model: 'm', max_tokens: 1000 });
    expect(r1.text).toContain('box(1,1,1)');
    expect(r1.tokens_in).toBe(100);
    const r2 = await client.generate({ system: 'sys', messages: [], model: 'm', max_tokens: 1000 });
    expect(r2.text).toContain('box(2,2,2)');
    expect(r2.tokens_out).toBe(25);
  });

  it('throws when responses are exhausted', async () => {
    const client = new MockAgentClient([
      { text: 'one', tokens_in: 1, tokens_out: 1 },
    ]);
    await client.generate({ system: '', messages: [], model: 'm', max_tokens: 1 });
    await expect(
      client.generate({ system: '', messages: [], model: 'm', max_tokens: 1 }),
    ).rejects.toThrow(/exhausted/i);
  });

  it('records every call for inspection', async () => {
    const client = new MockAgentClient([{ text: 'r', tokens_in: 1, tokens_out: 1 }]);
    await client.generate({
      system: 'sys',
      messages: [{ role: 'user', content: 'hello' }],
      model: 'm',
      max_tokens: 100,
    });
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].messages[0].content).toBe('hello');
  });
});

describe('MockAgentClient — systemAddendum', () => {
  it('records systemAddendum on the call object', async () => {
    const client = new MockAgentClient([{ text: 'r', tokens_in: 1, tokens_out: 1 }]);
    await client.generate({
      system: 'sys',
      systemAddendum: 'addendum',
      messages: [],
      model: 'm',
      max_tokens: 1,
    });
    expect(client.calls[0].systemAddendum).toBe('addendum');
  });
});
