// workers/feedback-mailer/src/index.test.ts
//
// Unit test for the private feedback mailer Worker. Mocks the send_email
// binding; no Cloudflare runtime needed.

import { describe, it, expect } from 'vitest';
import worker, { FROM_NAME, type Env } from './index';

function makeEnv(fail = false) {
  const calls: Parameters<Env['EMAIL']['send']>[0][] = [];
  const env: Env = {
    FEEDBACK_TO: 'andrii@kernelcad.com',
    FEEDBACK_FROM: 'feedback@kernelcad.com',
    EMAIL: {
      send: async (msg) => {
        calls.push(msg);
        if (fail) throw new Error('email.sending.error');
        return { messageId: '<m1@kernelcad.com>' };
      },
    },
  };
  return { env, calls };
}

function post(body: unknown, method = 'POST'): Request {
  return new Request('https://feedback-mailer/send', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

describe('feedback-mailer', () => {
  it('sends to the fixed recipient from the fixed sender', async () => {
    const { env, calls } = makeEnv();
    const res = await worker.fetch(post({ subject: 's', text: 't', replyTo: 'me@example.com' }), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, messageId: '<m1@kernelcad.com>' });
    expect(calls).toEqual([
      {
        to: 'andrii@kernelcad.com',
        from: { email: 'feedback@kernelcad.com', name: FROM_NAME },
        replyTo: 'me@example.com',
        subject: 's',
        text: 't',
      },
    ]);
  });

  it('ignores a caller-supplied recipient and an invalid reply-to', async () => {
    const { env, calls } = makeEnv();
    await worker.fetch(post({ subject: 's', text: 't', to: 'x@evil.example', replyTo: 'nope' }), env);
    expect(calls[0].to).toBe('andrii@kernelcad.com');
    expect(calls[0].replyTo).toBeUndefined();
  });

  it('returns 502 when the binding throws', async () => {
    const { env } = makeEnv(true);
    const res = await worker.fetch(post({ subject: 's', text: 't' }), env);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, error: 'send_failed' });
  });

  it('rejects missing fields and non-POST', async () => {
    const { env, calls } = makeEnv();
    expect((await worker.fetch(post({ subject: 's' }), env)).status).toBe(400);
    expect((await worker.fetch(post(null, 'GET'), env)).status).toBe(405);
    expect(calls).toHaveLength(0);
  });
});
