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

export function createParamsEndpoint(deps: ParamsEndpointDeps) {
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

      const session = entry.model.session as unknown as {
        params: { update: (edits: Array<{ name: string; value: number | boolean }>) => Promise<unknown> };
      };
      try {
        const result = (await session.params.update(
          edits as Array<{ name: string; value: number | boolean }>,
        )) as { relowered?: string[]; skipped?: string[]; warnings?: unknown[] };
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
