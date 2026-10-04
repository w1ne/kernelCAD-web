// workers/feedback-mailer/src/index.ts
//
// Private Worker behind the FEEDBACK_MAILER service binding of the kernelcad.com
// Pages project. POST { subject, text, replyTo? } → one email to FEEDBACK_TO
// from FEEDBACK_FROM via the Cloudflare Email Service `send_email` binding.
// Returns { ok: true, messageId } or { ok: false, error } with a 5xx status.

export interface SendEmailBinding {
  send(message: {
    to: string;
    from: { email: string; name: string };
    replyTo?: string;
    subject: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

export interface Env {
  EMAIL: SendEmailBinding;
  FEEDBACK_TO: string;
  FEEDBACK_FROM: string;
}

export const FROM_NAME = 'kernelCAD feedback';
export const SUBJECT_MAX = 200;
export const TEXT_MAX = 16 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400);
    }
    const subject = typeof body.subject === 'string' ? body.subject.slice(0, SUBJECT_MAX) : '';
    const text = typeof body.text === 'string' ? body.text.slice(0, TEXT_MAX) : '';
    if (!subject || !text) return json({ ok: false, error: 'missing_fields' }, 400);
    const replyTo =
      typeof body.replyTo === 'string' && body.replyTo.length <= 254 && EMAIL_RE.test(body.replyTo)
        ? body.replyTo
        : null;

    try {
      const { messageId } = await env.EMAIL.send({
        to: env.FEEDBACK_TO,
        from: { email: env.FEEDBACK_FROM, name: FROM_NAME },
        // A bare string: `{ email }` without `name` is rejected by the binding.
        replyTo: replyTo ?? undefined,
        subject,
        text,
      });
      console.log(`feedback-mailer sent messageId=${messageId}`);
      return json({ ok: true, messageId }, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`feedback-mailer send failed: ${message}`);
      return json({ ok: false, error: 'send_failed', detail: message.slice(0, 300) }, 502);
    }
  },
};
