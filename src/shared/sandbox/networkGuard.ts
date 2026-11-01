// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox network CHOKEPOINT.
//
// Outbound traffic from a Node process funnels through a handful of public
// entry points; sandbox mode wraps each one once:
//
//   - `net.Socket.prototype.connect` — the floor. http, https, http2, tls,
//     the bundled undici behind global `fetch` / `WebSocket`, and any npm
//     HTTP client all end up here. A refused connect destroys the socket
//     with the sandbox error on the next tick, so callers fail fast instead
//     of hanging.
//   - `globalThis.fetch` — rejects immediately with the sandbox KernelError
//     (instead of undici's opaque `TypeError: fetch failed`).
//   - `http.request/get`, `https.request/get` — throw before a socket exists.
//   - `dns.lookup/resolve*` (+ `dns.promises`) — a DNS query is egress too.
//   - `dgram.createSocket(...).send` — UDP.
//
// Localhost policy: loopback (127.0.0.0/8, ::1, the literal `localhost`) is
// refused like any other destination unless `KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1`
// — a local forwarding proxy is one hop from the internet. Listening sockets
// (the live viewer, the headless-render player server) are inbound and are
// unaffected; they bind 127.0.0.1 only.

import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
import { getSandboxConfig } from './config';
import { sandboxNetworkError } from './errors';

type AnyFn = (...args: unknown[]) => unknown;
const saved: Array<{ target: Record<string, unknown>; key: string; fn: unknown }> = [];
let installed = false;

/** True for a loopback IP literal or the literal `localhost` name. */
export function isLoopbackHost(host: string | undefined | null): boolean {
  if (host === undefined || host === null || host === '') return true; // node defaults to localhost
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  if (h.startsWith('::ffff:')) return isLoopbackHost(h.slice(7));
  return net.isIPv4(h) && h.startsWith('127.');
}

/** Policy decision for one destination. `target` is for the message. */
export function networkAllowed(host: string | undefined | null): boolean {
  const cfg = getSandboxConfig();
  if (cfg === null) return true;
  return cfg.allowLoopback && isLoopbackHost(host);
}

function hostOfUrl(input: unknown): { host: string; label: string } {
  try {
    const raw = typeof input === 'string' || input instanceof URL
      ? String(input)
      : String((input as { url?: unknown })?.url ?? input);
    const u = new URL(raw);
    if (u.protocol === 'data:' || u.protocol === 'blob:') return { host: 'localhost', label: `${u.protocol}…` };
    return { host: u.hostname, label: `${u.protocol}//${u.host}` };
  } catch {
    return { host: '?', label: String(input) };
  }
}

/** Destination of a `socket.connect(...)` call: options object, (port, host) or (path). */
function connectTarget(args: unknown[]): { host: string | undefined; label: string } {
  let first = args[0];
  if (Array.isArray(first)) first = first[0]; // internal normalized-args form
  if (first !== null && typeof first === 'object') {
    const o = first as { host?: string; port?: number; path?: string };
    if (typeof o.path === 'string') return { host: '<ipc>', label: `ipc:${o.path}` };
    return { host: o.host, label: `${o.host ?? 'localhost'}:${o.port ?? '?'}` };
  }
  if (typeof first === 'string' && !/^\d+$/.test(first)) return { host: '<ipc>', label: `ipc:${first}` };
  const host = typeof args[1] === 'string' ? args[1] : undefined;
  return { host, label: `${host ?? 'localhost'}:${String(first)}` };
}

function swap(target: Record<string, unknown>, key: string, make: (orig: AnyFn) => AnyFn): void {
  const orig = target[key];
  if (typeof orig !== 'function') return;
  saved.push({ target, key, fn: orig });
  target[key] = make(orig as AnyFn);
}

function guardSocketConnect(): void {
  swap(net.Socket.prototype as unknown as Record<string, unknown>, 'connect', orig =>
    function connect(this: net.Socket, ...args: unknown[]) {
      const { host, label } = connectTarget(args);
      const off = getSandboxConfig() === null;
      if (off || (host !== '<ipc>' && networkAllowed(host))) return orig.apply(this, args);
      const err = sandboxNetworkError('socket connect', label);
      process.nextTick(() => this.destroy(err));
      return this;
    });
}

function guardFetch(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  swap(g, 'fetch', orig => function fetch(this: unknown, ...args: unknown[]) {
    const { host, label } = hostOfUrl(args[0]);
    if (networkAllowed(host)) return orig.apply(this, args);
    return Promise.reject(sandboxNetworkError('fetch', label));
  });
}

function requestHost(args: unknown[]): { host: string | undefined; label: string } {
  const a = args[0];
  if (typeof a === 'string' || a instanceof URL) return hostOfUrl(a);
  const o = (a ?? {}) as { hostname?: string; host?: string; port?: number };
  const host = o.hostname ?? o.host;
  return { host, label: `${host ?? 'localhost'}:${o.port ?? ''}` };
}

function guardHttp(mod: Record<string, unknown>, scheme: string): void {
  for (const key of ['request', 'get']) {
    swap(mod, key, orig => function request(this: unknown, ...args: unknown[]) {
      const { host, label } = requestHost(args);
      if (networkAllowed(host)) return orig.apply(this, args);
      throw sandboxNetworkError(`${scheme}.${key}`, label);
    });
  }
}

/**
 * `dns.lookup` of an IP literal or a loopback name never queries a resolver
 * (servers use it to bind 127.0.0.1), so it stays allowed; every other DNS
 * call is a query that leaves the machine.
 */
function dnsAllowed(fn: string, host: string | undefined): boolean {
  if (getSandboxConfig() === null) return true;
  if (fn !== 'lookup') return false;
  return host !== undefined && (net.isIP(host) !== 0 || isLoopbackHost(host));
}

const DNS_FNS = ['lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname',
  'resolveMx', 'resolveNs', 'resolveTxt', 'resolveSrv', 'resolvePtr', 'resolveNaptr', 'resolveSoa', 'reverse'];

function guardDns(): void {
  const targets: Array<[Record<string, unknown>, boolean]> = [
    [dns as unknown as Record<string, unknown>, false],
    [dns.promises as unknown as Record<string, unknown>, true],
  ];
  for (const [mod, isPromise] of targets) {
    for (const key of DNS_FNS) {
      swap(mod, key, orig => function lookup(this: unknown, ...args: unknown[]) {
        const host = typeof args[0] === 'string' ? args[0] : undefined;
        if (dnsAllowed(key, host)) return orig.apply(this, args);
        const err = sandboxNetworkError(`dns.${key}`, String(args[0]));
        if (isPromise) return Promise.reject(err);
        const cb = args[args.length - 1];
        if (typeof cb === 'function') { process.nextTick(() => (cb as (e: Error) => void)(err)); return undefined; }
        throw err;
      });
    }
  }
}

function guardDgram(): void {
  swap(dgram.Socket.prototype as unknown as Record<string, unknown>, 'send', orig =>
    function send(this: dgram.Socket, ...args: unknown[]) {
      const host = args.find((a, i) => i > 0 && typeof a === 'string') as string | undefined;
      if (networkAllowed(host)) return orig.apply(this, args);
      throw sandboxNetworkError('udp send', host ?? '?');
    });
}

/** Install every network wrapper. Idempotent. */
export function installNetworkGuard(): void {
  if (installed) return;
  installed = true;
  guardSocketConnect();
  guardFetch();
  guardHttp(http as unknown as Record<string, unknown>, 'http');
  guardHttp(https as unknown as Record<string, unknown>, 'https');
  guardDns();
  guardDgram();
  syncBuiltinESMExports();
}

/** Test-only: restore the original functions. */
export function uninstallNetworkGuard(): void {
  while (saved.length > 0) {
    const { target, key, fn } = saved.pop()!;
    target[key] = fn;
  }
  installed = false;
  syncBuiltinESMExports();
}

export function isNetworkGuardInstalled(): boolean {
  return installed;
}
