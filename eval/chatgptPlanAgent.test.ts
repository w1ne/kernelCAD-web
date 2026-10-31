// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { ChatGPTPlanAgentClient } from './chatgptPlanAgent';

describe('ChatGPT plan Responses client', () => {
  it('streams a multimodal response and requires completion', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ model: 'example', store: false, stream: true, instructions: 'system' });
      expect(body.input[0].content[0]).toMatchObject({ type: 'input_image', image_url: 'data:image/png;base64,AA==' });
      expect(body).not.toHaveProperty('temperature');
      return new Response('data: {"type":"response.output_text.delta","delta":"hello"}\n\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":2,"output_tokens":1}}}\n\n');
    });
    const client = new ChatGPTPlanAgentClient({ token: async () => 'secret', fetchImpl });
    await expect(client.generate({system:'system', model:'example', max_tokens:10, messages:[{role:'user',content:'describe',images:[{mediaType:'image/png',data:'AA=='}]}]})).resolves.toEqual({text:'hello',tokens_in:2,tokens_out:1});
  });
  it('rejects a stream without a completed event', async () => {
    const client = new ChatGPTPlanAgentClient({token:async()=> 'secret',fetchImpl:async()=>new Response('data: {"type":"response.output_text.delta","delta":"partial"}\n\n'), maxRetries: 0});
    await expect(client.generate({system:'s',model:'m',max_tokens:1,messages:[]})).rejects.toThrow('without response.completed');
  });

  it('retries a dropped connection and keeps the completed reply', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('data: {"type":"response.output_text.delta","delta":"kept"}\n\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":3,"output_tokens":1}}}\n\n'));
    const client = new ChatGPTPlanAgentClient({ token: async () => 'secret', fetchImpl, maxRetries: 2, retryBaseMs: 1 });
    await expect(client.generate({ system: 's', model: 'm', max_tokens: 8, messages: [{ role: 'user', content: 'edit' }] })).resolves.toEqual({ text: 'kept', tokens_in: 3, tokens_out: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('stops after the retry cap when every connection drops', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('fetch failed'); });
    const client = new ChatGPTPlanAgentClient({ token: async () => 'secret', fetchImpl, maxRetries: 2, retryBaseMs: 1 });
    await expect(client.generate({ system: 's', model: 'm', max_tokens: 8, messages: [] })).rejects.toThrow('fetch failed');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
