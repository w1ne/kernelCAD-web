/**
 * Slice 2E.bridge — `GET /__kernelcad/events?session=<token>` (Server-Sent Events).
 *
 * Holds the connection open and forwards every `RecomputeEngine.onRelower`
 * event on the session as an SSE `event: relower` frame:
 *
 *   event: relower
 *   data: {"affectedIds":["feat_1","feat_2"]}
 *
 * The browser opens this with `EventSource(...)` after fetching the session
 * token. On `relower`, the client re-fetches `/__kernelcad/mesh` +
 * `/__kernelcad/review` to refresh `scriptParams` and `scriptReview`.
 *
 * Lifecycle correctness
 * ---------------------
 * 1. Subscribe to `engine.onRelower(...)` once per connection.
 * 2. Unsubscribe on `req.on('close')` so a closed tab doesn't leak callbacks.
 * 3. Optional heartbeat: a `: keepalive` SSE comment every `heartbeatMs` so
 *    proxies that idle-close long HTTP connections don't drop the stream.
 *
 * The handler stays pure — the pool is injected, so tests can supply a fake
 * session + engine without booting OCCT.
 */

import type { SessionPool } from '../sessionPool';
import { writeJson, readQuery } from './httpUtil';

export interface EventsEndpointDeps {
  pool: SessionPool;
  /** Send a `: keepalive` comment every N ms. Set to 0 to disable. */
  heartbeatMs?: number;
}

export interface EventsReqLike {
  url?: string;
  on?: (event: 'close', cb: () => void) => void;
  socket?: { setTimeout?: (ms: number) => void; setNoDelay?: (yes: boolean) => void };
}

export interface EventsResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  write(chunk: string): boolean;
  end(chunk?: string): void;
  flushHeaders?(): void;
}

export function createEventsEndpoint(deps: EventsEndpointDeps) {
  const heartbeatMs = deps.heartbeatMs ?? 0;

  return async function eventsHandler(req: EventsReqLike, res: EventsResLike): Promise<void> {
    const token = readQuery(req.url, 'session');
    if (!token) {
      return writeJson(res, 400, { error: 'missing session query parameter' });
    }
    const entry = deps.pool.get(token);
    if (!entry) {
      return writeJson(res, 404, { error: 'unknown session token' });
    }
    if (!entry.model.session.engine) {
      return writeJson(res, 409, {
        error: 'session has no engine attached (buildModel did not run)',
      });
    }

    // SSE preamble — must be set BEFORE any write or proxies may buffer.
    res.statusCode = 200;
    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('x-accel-buffering', 'no'); // disable nginx buffering if proxied
    res.flushHeaders?.();
    // Disable Node's TCP delay so frames land at the browser immediately.
    req.socket?.setNoDelay?.(true);
    // Prevent the request socket from being killed by the server's
    // default idle timeout — we hold the connection open intentionally.
    req.socket?.setTimeout?.(0);

    // Initial comment line proves the channel is alive even before any
    // relower fires; the client's EventSource fires `onopen` on first byte.
    res.write(': connected\n\n');

    // Subscribe to the ENTRY-level hub, not the engine directly: the hub is
    // stable across `rebuildByScript` model swaps (disk-edit live reload),
    // so this connection keeps receiving relower frames after a rebuild.
    const unsubscribe = entry.onRelower((affectedIds) => {
      // Per SSE spec each frame ends with a blank line.
      res.write(`event: relower\ndata: ${JSON.stringify({ affectedIds })}\n\n`);
    });

    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    if (heartbeatMs > 0) {
      heartbeatTimer = setInterval(() => {
        res.write(`: keepalive ${Date.now()}\n\n`);
        // An open SSE connection means a live viewer: bump `lastAccessAt`
        // (pool.get touches) so `prune()` doesn't evict the session out
        // from under an idle-but-open Studio tab — a pruned session makes
        // disk-edit live rebuilds silently miss and params edits 404.
        deps.pool.get(token);
      }, heartbeatMs);
    }

    const cleanup = () => {
      unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };
    req.on?.('close', cleanup);

    // The handler returns immediately; the connection stays open until the
    // client closes it (triggering `req.on('close', cleanup)`).
  };
}
