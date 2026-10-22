// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/rebuild/rebuildProtocol.ts
//
// Message protocol of the rebuild worker plus the worker's logic as a plain
// function, so the behaviour is testable without a real Worker.

import { packMeshPayload } from './meshPayloadTransfer';

/** Fetch options the main thread may pin for one rebuild request. */
export interface RebuildFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type RebuildWorkerRequest =
  | { type: 'fetch'; jobId: number; url: string; init?: RebuildFetchInit }
  | { type: 'cancel'; jobId: number };

export type RebuildWorkerResponse =
  | {
    type: 'done';
    jobId: number;
    ok: boolean;
    status: number;
    statusText: string;
    retryAfter: string | null;
    body: unknown;
  }
  | { type: 'failed'; jobId: number; message: string; aborted: boolean };

/** True for a message the worker posted — the two shapes above, nothing else. */
export function isRebuildWorkerResponse(value: unknown): value is RebuildWorkerResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as {
    type?: unknown; jobId?: unknown; ok?: unknown; status?: unknown;
    message?: unknown; aborted?: unknown;
  };
  if (typeof candidate.jobId !== 'number') return false;
  if (candidate.type === 'done') {
    return typeof candidate.ok === 'boolean' && typeof candidate.status === 'number';
  }
  if (candidate.type === 'failed') {
    return typeof candidate.message === 'string' && typeof candidate.aborted === 'boolean';
  }
  return false;
}

export interface RebuildWorkerDeps {
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>;
  post: (message: RebuildWorkerResponse, transfer: ArrayBuffer[]) => void;
}

/** Per-request state. One job answers with exactly one message. */
interface JobState {
  controller: AbortController;
  cancelled: boolean;
  settled: boolean;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function isAbortError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { name?: unknown }).name === 'AbortError';
}

function abortError(): Error {
  const error = new Error('The rebuild request was cancelled.');
  error.name = 'AbortError';
  return error;
}

/**
 * JSON.parse that answers null instead of throwing. An empty body or an HTML
 * error page is a transport detail, not a failed rebuild — the caller decides
 * from `ok` / `status`.
 */
function parseJsonOrNull(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Response text parsed as JSON. Test doubles and some polyfills only
 *  implement `json()`, so fall back to it. */
async function readJsonBody(response: Response): Promise<unknown> {
  if (typeof response.text === 'function') return parseJsonOrNull(await response.text());
  if (typeof response.json === 'function') return response.json().catch(() => null);
  return null;
}

/**
 * Returns the onmessage handler of the rebuild worker: it fetches a mesh
 * payload off the main thread, parses it, packs the numeric arrays into typed
 * arrays and posts them back with the buffers to transfer. A job can be
 * cancelled; a cancelled job answers with one `failed` message and never with
 * `done`. The handler never throws.
 */
export function createRebuildWorkerHandler(deps: RebuildWorkerDeps): (message: RebuildWorkerRequest) => void {
  const jobs = new Map<number, JobState>();

  const postOnce = (
    state: JobState,
    message: RebuildWorkerResponse,
    transfer: ArrayBuffer[],
  ): void => {
    if (state.settled) return;
    state.settled = true;
    deps.post(message, transfer);
  };

  const failJob = (state: JobState, jobId: number, error: unknown): void => {
    const aborted = state.cancelled || state.controller.signal.aborted || isAbortError(error);
    postOnce(state, { type: 'failed', jobId, message: errorMessage(error), aborted }, []);
  };

  const runFetch = async (jobId: number, url: string, init?: RebuildFetchInit): Promise<void> => {
    const state: JobState = { controller: new AbortController(), cancelled: false, settled: false };
    jobs.set(jobId, state);
    try {
      const response = await deps.fetchImpl(url, { ...(init ?? {}), signal: state.controller.signal });
      const body = await readJsonBody(response);
      if (state.cancelled || state.controller.signal.aborted) {
        failJob(state, jobId, abortError());
        return;
      }
      const packed = packMeshPayload(body);
      postOnce(state, {
        type: 'done',
        jobId,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText ?? '',
        retryAfter: response.headers?.get?.('Retry-After') ?? null,
        body: packed.payload,
      }, packed.transfer);
    } catch (error) {
      failJob(state, jobId, error);
    } finally {
      if (jobs.get(jobId) === state) jobs.delete(jobId);
    }
  };

  return (message: RebuildWorkerRequest): void => {
    try {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'fetch') {
        void runFetch(message.jobId, message.url, message.init);
      } else if (message.type === 'cancel') {
        const state = jobs.get(message.jobId);
        if (!state || state.settled) return;
        state.cancelled = true;
        state.controller.abort();
      }
    } catch {
      // The worker must never throw at its host.
    }
  };
}
