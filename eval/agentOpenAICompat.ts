// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { randomUUID } from 'node:crypto';
import type { AgentClient, AgentMessage, AgentResponse } from './types';

export interface OpenAICompatOptions {
  baseUrl: string;
  apiKey: string;
  /** Total attempts = maxRetries + 1. Default 5 (6 attempts). */
  maxRetries?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  fetchImpl?: typeof fetch;
  /**
   * Stable conversation id sent as `x-opencode-session`. OpenCode Go uses it
   * for routing and prompt caching and rejects requests without it. Defaults
   * to a per-client UUID, so a run keeps one stable session for its lifetime.
   */
  sessionId?: string;
  /**
   * Identifying user agent. OpenCode Go asks clients to name themselves
   * instead of looking like a generic HTTP library.
   */
  userAgent?: string;
  /** Sampling seed forwarded verbatim; the endpoint may ignore it. */
  seed?: number;
  /**
   * Console workspace/org selector sent as `x-opencode-org-id`. An OAuth
   * token reachable from more than one workspace is rejected with 403
   * "Workspace selection is required" until this is sent.
   */
  orgId?: string;
  /**
   * Ceiling for automatic output-budget escalation. Reasoning models can
   * spend the whole `max_tokens` on hidden reasoning and return an empty
   * message with `finish_reason: 'length'`; the client then retries with
   * twice the budget, up to this ceiling, instead of handing the loop an
   * empty reply. Default 64000.
   */
  maxTokensCeiling?: number;
  /** Per-request wall clock limit in ms. Default 600000 (10 min), enough for
   *  a long reasoning pass at a 64k output budget. */
  requestTimeoutMs?: number;
  /** Called before each retry with the attempt number, delay and reason. */
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const RETRYABLE_STATUS = (status: number): boolean => status === 429 || status >= 500;

/**
 * A request that never reached a usable response: DNS/connect failure, socket
 * reset, or a body read that died mid-stream. The harness records these as
 * `infra_error` (environment), never as a candidate verdict, and retries them.
 */
export class TransportFailure extends Error {
  readonly code = 'transport';
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'TransportFailure';
  }
}

const TRANSPORT_PATTERN =
  /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|socket hang up|other side closed|terminated|network error|TimeoutError|aborted/i;

/** True for an error that says nothing about the model's answer. */
export function isTransportFailure(err: unknown): boolean {
  if (err instanceof TransportFailure) return true;
  const text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return TRANSPORT_PATTERN.test(text);
}

function retryAfterMs(resp: Response): number | undefined {
  const raw = resp.headers?.get?.('retry-after');
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 300_000);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), 300_000);
  return undefined;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAICompatAgentClient implements AgentClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sessionId?: string;
  private readonly orgId?: string;
  private readonly userAgent: string;
  private readonly seed?: number;
  private readonly maxTokensCeiling: number;
  private readonly requestTimeoutMs: number;
  private readonly onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void;

  constructor(opts: OpenAICompatOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.maxRetries = opts.maxRetries ?? 7;
    this.retryBaseMs = opts.retryBaseMs ?? 2000;
    this.retryMaxMs = opts.retryMaxMs ?? 60000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    // Only OpenCode Go needs the session header; other compatible endpoints
    // ignore it, but keeping it off them avoids surprising a strict gateway.
    const openCodeHost = /(^|\.)opencode\.ai$/.test(safeHostname(this.baseUrl));
    this.sessionId = opts.sessionId ?? (openCodeHost ? `cadgenbench-${randomUUID()}` : undefined);
    this.orgId = opts.orgId;
    this.userAgent = opts.userAgent ?? 'kernelcad-cadgenbench/1.0';
    this.seed = opts.seed;
    this.maxTokensCeiling = Math.max(opts.maxTokensCeiling ?? 64_000, 1);
    this.requestTimeoutMs = Math.max(opts.requestTimeoutMs ?? 600_000, 1);
    this.onRetry = opts.onRetry;
  }

  async generate(args: {
    system: string;
    systemAddendum?: string;
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<AgentResponse> {
    const system =
      args.systemAddendum && args.systemAddendum.length > 0
        ? `${args.system}\n\n${args.systemAddendum}`
        : args.system;
    const buildBody = (maxTokens: number) => ({
      model: args.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...args.messages.map((m) => ({
          role: m.role,
          content:
            m.images && m.images.length > 0
              ? [
                  ...m.images.map((img) => ({
                    type: 'image_url',
                    image_url: { url: `data:${img.mediaType};base64,${img.data}` },
                  })),
                  { type: 'text', text: m.content },
                ]
              : m.content,
        })),
      ],
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
      ...(this.seed !== undefined ? { seed: this.seed } : {}),
    });

    let maxTokens = args.max_tokens;
    let lastErr: Error | undefined;
    let delayOverride: number | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = delayOverride ?? Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** (attempt - 1));
        const jittered = delayOverride !== undefined ? backoff : backoff + Math.random() * backoff * 0.25;
        delayOverride = undefined;
        this.onRetry?.({ attempt, delayMs: jittered, reason: lastErr?.message ?? 'retry' });
        await sleep(jittered);
      }
      let resp: Response;
      try {
        resp = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'User-Agent': this.userAgent,
            ...(this.sessionId ? { 'x-opencode-session': this.sessionId } : {}),
            ...(this.orgId ? { 'x-opencode-org-id': this.orgId } : {}),
          },
          body: JSON.stringify(buildBody(maxTokens)),
          signal: AbortSignal.timeout(this.requestTimeoutMs),
        });
      } catch (err) {
        lastErr = new TransportFailure(
          `transport: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
        continue;
      }
      if (RETRYABLE_STATUS(resp.status)) {
        const text = await resp.text().catch(() => '');
        lastErr = new Error(`HTTP ${resp.status} ${text.slice(0, 300)}`);
        delayOverride = retryAfterMs(resp);
        continue;
      }
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`OpenAI-compat request failed: HTTP ${resp.status} ${text.slice(0, 300)}`);
      }
      let data: ChatCompletionResponse;
      try {
        data = (await resp.json()) as ChatCompletionResponse;
      } catch (err) {
        lastErr = new TransportFailure(
          `transport: response body unreadable (${err instanceof Error ? err.message : String(err)})`,
          err,
        );
        continue;
      }
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? '';
      if (text.length === 0) {
        // A reasoning model can spend the whole budget on hidden reasoning:
        // the reply is empty and `finish_reason` is 'length'. Grow the budget
        // instead of handing the closed loop an empty "no script" reply.
        if (choice?.finish_reason === 'length' && maxTokens < this.maxTokensCeiling) {
          const raised = Math.min(this.maxTokensCeiling, maxTokens * 2);
          lastErr = new Error(
            `OpenAI-compat response truncated at ${maxTokens} max_tokens (reasoning only); retrying with ${raised}`,
          );
          maxTokens = raised;
          continue;
        }
        if (choice?.finish_reason === 'length') {
          throw new Error(
            `OpenAI-compat response truncated: reasoning consumed ${maxTokens} max_tokens and returned no text; raise --max-tokens`,
          );
        }
        return { text: '', tokens_in: num(data.usage?.prompt_tokens), tokens_out: 0 };
      }
      return {
        text,
        tokens_in: num(data.usage?.prompt_tokens),
        tokens_out: num(data.usage?.completion_tokens),
      };
    }
    throw lastErr ?? new Error('OpenAI-compat request failed after retries');
  }
}
