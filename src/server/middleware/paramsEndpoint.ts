/**
 * Slice 2E.bridge — `POST /__kernelcad/params?session=<token>`.
 *
 * Body: `{ edits: [{ name: string; value: number | boolean }] }`.
 * Returns: `{ relowered: string[], skipped: string[], warnings: SoftWarning[] }`.
 *
 * Delegates to `session.params.update(edits)` on the pooled
 * `CaptureSession`. The kernel's internal `RecomputeEngine.emitRelower` fires
 * inside that call, which fans out to every SSE subscriber on this session
 * — so the params endpoint itself doesn't publish events; it just mutates.
 *
 * Validation layers
 * -----------------
 * - 400 for missing/unknown session, malformed JSON, missing `edits` array,
 *   non-primitive value types (caught here, before reaching the kernel so
 *   we don't leak parser internals to the client).
 * - 422 with `code` + `hint` when the kernel raises a `KernelError`-shaped
 *   error (out-of-range, type mismatch, …) — the client can show the hint.
 * - 500 for anything else.
 */

import type { SessionPool } from '../sessionPool';
import { readBody, readQuery, writeJson, type MinimalRes } from './httpUtil';

export interface ParamsEndpointDeps {
  pool: SessionPool;
}

export interface ParamsReqLike extends NodeJS.ReadableStream {
  url?: string;
  method?: string;
}

type ParamEdit = { name: string; value: number | boolean };
type UpdateResult = { relowered?: string[]; skipped?: string[]; warnings?: unknown[] };

interface CoalescedBatch {
  /** Latest value per param name across all requests merged into this batch. */
  edits: Map<string, ParamEdit>;
  waiters: Array<{ resolve: (r: UpdateResult) => void; reject: (e: unknown) => void }>;
}

export function createParamsEndpoint(deps: ParamsEndpointDeps) {
  // Per-session trailing-edge coalescing. A slider drag fires one POST per
  // tick; each kernel relower costs ~1-2 s, so running them all serially
  // builds a minutes-deep queue (the viewport looks frozen), and running
  // them concurrently races the single OCCT WASM instance (Aborted()
  // crashes). Instead: while one update is in flight for a session, every
  // further request merges into ONE pending batch (latest value per param
  // name wins) — a drag-storm costs at most the in-flight relower plus one
  // trailing relower, and updates on a session never overlap.
  const inFlight = new Map<string, Promise<void>>();
  const pending = new Map<string, CoalescedBatch>();

  function enqueueUpdate(token: string, edits: ParamEdit[]): Promise<UpdateResult> {
    return new Promise<UpdateResult>((resolve, reject) => {
      let batch = pending.get(token);
      if (!batch) {
        batch = { edits: new Map(), waiters: [] };
        pending.set(token, batch);
      }
      for (const e of edits) batch.edits.set(e.name, e);
      batch.waiters.push({ resolve, reject });

      if (inFlight.has(token)) return;
      const drain = (async () => {
        try {
          for (;;) {
            const next = pending.get(token);
            if (!next) break;
            pending.delete(token);
            try {
              // Resolve the entry at RUN time, not enqueue time — a live
              // script rebuild may have swapped the session's model since
              // the request arrived.
              const entry = deps.pool.get(token);
              if (!entry) {
                throw Object.assign(new Error('session evicted while update was queued'), {
                  code: 'session.evicted',
                });
              }
              const session = entry.model.session as unknown as {
                params: { update: (edits: ParamEdit[]) => Promise<unknown> };
              };
              const result = (await session.params.update([...next.edits.values()])) as UpdateResult;
              for (const w of next.waiters) w.resolve(result);
            } catch (error) {
              for (const w of next.waiters) w.reject(error);
            }
          }
        } finally {
          inFlight.delete(token);
        }
      })();
      inFlight.set(token, drain);
    });
  }
  return async function paramsHandler(req: ParamsReqLike, res: MinimalRes): Promise<void> {
    try {
      const token = readQuery(req.url, 'session');
      if (!token) {
        return writeJson(res, 400, { error: 'missing session query parameter' });
      }
      const entry = deps.pool.get(token);
      if (!entry) {
        return writeJson(res, 404, { error: 'unknown session token' });
      }

      const raw = await readBody(req);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return writeJson(res, 400, { error: 'body is not valid JSON' });
      }
      const edits = (parsed as { edits?: unknown }).edits;
      if (!Array.isArray(edits)) {
        return writeJson(res, 400, { error: 'body.edits must be an array' });
      }
      // Per-edit shape gate. We accept (name: string, value: number | boolean)
      // and reject anything else here so kernel errors are reserved for
      // semantic problems (out-of-range, unknown param) rather than typos.
      for (const e of edits) {
        if (!e || typeof e !== 'object') {
          return writeJson(res, 400, { error: 'each edit must be an object' });
        }
        const edit = e as { name?: unknown; value?: unknown };
        if (typeof edit.name !== 'string' || edit.name.length === 0) {
          return writeJson(res, 400, { error: 'edit.name must be a non-empty string' });
        }
        if (typeof edit.value !== 'number' && typeof edit.value !== 'boolean') {
          return writeJson(res, 400, { error: 'edit.value must be a number or boolean' });
        }
      }

      try {
        const result = await enqueueUpdate(token, edits as ParamEdit[]);
        return writeJson(res, 200, {
          relowered: result.relowered ?? [],
          skipped: result.skipped ?? [],
          warnings: result.warnings ?? [],
        });
      } catch (error) {
        const err = error as { message?: unknown; code?: unknown; hint?: unknown };
        // KernelError carries `.code` and `.hint`; surface both so the client
        // can render the structured diagnostic instead of a generic toast.
        if (typeof err?.code === 'string') {
          return writeJson(res, 422, {
            error: typeof err.message === 'string' ? err.message : String(error),
            code: err.code,
            hint: typeof err.hint === 'string' ? err.hint : undefined,
          });
        }
        return writeJson(res, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      return writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
