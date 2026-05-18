/**
 * Minimal stand-in for connect/Node `http` request and response objects.
 *
 * The middleware factories we test only touch `req.url`, `res.statusCode`,
 * `res.setHeader`, `res.write`, and `res.end`. These fakes capture exactly
 * those so unit tests can assert on the wire payload without booting an
 * actual HTTP server.
 *
 * SSE-oriented helpers (`writes`, `closed`, `triggerClose`) let us assert
 * the events endpoint flushes its `data: {...}\n\n` frames and unsubscribes
 * the upstream emitter when the simulated client disconnects.
 */

import { EventEmitter } from 'node:events';

export interface FakeReq {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** EventEmitter so handlers can call `req.on('close', ...)`. */
  on?: (event: string, cb: () => void) => void;
  socket?: { setTimeout?: (ms: number) => void; setNoDelay?: (yes: boolean) => void };
}

export interface FakeRes {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  writes: string[];
  closed: boolean;
  setHeader: (name: string, value: string) => void;
  getHeader: (name: string) => string | undefined;
  write: (chunk: string) => boolean;
  end: (chunk?: string) => void;
  flushHeaders?: () => void;
  on?: (event: string, cb: () => void) => void;
}

export function createFakeRes(): FakeRes {
  const emitter = new EventEmitter();
  const res: FakeRes = {
    statusCode: 200,
    headers: {},
    body: '',
    writes: [],
    closed: false,
    setHeader(name, value) { res.headers[name.toLowerCase()] = value; },
    getHeader(name) { return res.headers[name.toLowerCase()]; },
    write(chunk) {
      res.writes.push(chunk);
      return true;
    },
    end(chunk) {
      if (chunk !== undefined) res.body += chunk;
      res.closed = true;
      emitter.emit('finish');
    },
    flushHeaders() { /* no-op for fakes */ },
    on(event, cb) {
      emitter.on(event, cb);
    },
  };
  return res;
}

export interface FakeReqWithClose extends FakeReq {
  triggerClose: () => void;
}

/** Make a fake req that exposes `triggerClose()` to simulate client
 *  disconnect (used by the SSE unsubscribe assertion). */
export function createFakeReqWithClose(url: string, init?: { method?: string; body?: string }): FakeReqWithClose {
  const emitter = new EventEmitter();
  return {
    url,
    method: init?.method,
    body: init?.body,
    on(event, cb) { emitter.on(event, cb); },
    triggerClose() { emitter.emit('close'); },
    socket: { setTimeout: () => {}, setNoDelay: () => {} },
  };
}
