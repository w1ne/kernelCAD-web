// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/importStepFetch.ts
//
// SSRF-hardened download for `import_step`. Each hop:
//   1. parses the URL (https only, no credentials, no localhost names),
//   2. resolves the host ONCE, under a DNS deadline, and refuses it unless
//      every answer is a public, globally routable address,
//   3. connects with a custom `lookup` that only ever returns the checked
//      address, so a rebinding DNS answer cannot redirect the socket; the
//      original hostname is kept for TLS SNI and certificate checks,
//   4. streams the body with a hard byte cap (Content-Length is checked up
//      front, and the stream is aborted as soon as the cap is passed).
// Redirects are followed by hand (at most MAX_REDIRECTS), each hop going
// through the same checks. One overall deadline covers DNS, connect, headers
// and body.

import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpsRequest, type RequestOptions } from 'node:https';
import type { ClientRequest, IncomingMessage } from 'node:http';
import type { LookupFunction } from 'node:net';
import { BlockList, isIP } from 'node:net';

export const MAX_REDIRECTS = 5;
const DNS_TIMEOUT_MS = 5_000;
const TOTAL_TIMEOUT_MS = 60_000;

/** IPv4 special-purpose ranges that are not globally reachable (IANA IPv4 special registry). */
const V4_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.31.196.0', 24], ['192.52.193.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['192.175.48.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
/**
 * IPv6: only global unicast (2000::/3) is allowed at all, which already
 * excludes ::/128, ::1, IPv4-compatible (::/96), IPv4-mapped (::ffff:0:0/96),
 * NAT64 (64:ff9b::/96, 64:ff9b:1::/48), discard (100::/64), ULA (fc00::/7),
 * link-local (fe80::/10) and multicast (ff00::/8). Inside 2000::/3 these
 * special or tunnelling ranges are refused too.
 */
const V6_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20],
];
const V4_LIST = new BlockList();
for (const [net, p] of V4_BLOCKED) V4_LIST.addSubnet(net, p, 'ipv4');
const V6_GLOBAL = new BlockList();
V6_GLOBAL.addSubnet('2000::', 3, 'ipv6');
const V6_LIST = new BlockList();
for (const [net, p] of V6_BLOCKED) V6_LIST.addSubnet(net, p, 'ipv6');

/** True unless `ip` is a public, globally routable unicast address. Non-IPs count as private. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return V4_LIST.check(ip, 'ipv4');
  if (v === 6) return !V6_GLOBAL.check(ip, 'ipv6') || V6_LIST.check(ip, 'ipv6');
  return true;
}

export interface ResolvedAddress { address: string; family: 4 | 6 }
export type Resolver = (host: string) => Promise<ResolvedAddress[]>;
export type HttpsRequester = (opts: RequestOptions, cb: (res: IncomingMessage) => void) => ClientRequest;

export interface FetchDeps { resolve: Resolver; request: HttpsRequester; dnsTimeoutMs: number; totalTimeoutMs: number }

const defaultDeps: FetchDeps = {
  resolve: async host => (await dnsLookup(host, { all: true, verbatim: true })).map(a => ({ address: a.address, family: a.family === 6 ? 6 : 4 })),
  request: httpsRequest,
  dnsTimeoutMs: DNS_TIMEOUT_MS,
  totalTimeoutMs: TOTAL_TIMEOUT_MS,
};
let deps: FetchDeps = defaultDeps;
/** Test hook: swap the resolver / requester / deadlines. Pass nothing to restore. */
export function setFetchDepsForTest(next?: Partial<FetchDeps>): void {
  deps = { ...defaultDeps, ...next };
}

class FetchError extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const t = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new FetchError(`${what} timed out.`)), ms); });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

/** Parse and syntactically check a URL; returns the URL or an error message. */
export function parseFetchUrl(raw: string): URL | string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'url is not a valid URL.';
  }
  if (u.protocol !== 'https:') return 'url must use https.';
  if (u.username !== '' || u.password !== '') return 'url must not carry credentials.';
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    return 'url host is not public.';
  }
  return u;
}

/** Resolve once and return the single address the connection will be pinned to. */
export async function resolvePinned(u: URL): Promise<ResolvedAddress> {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const v = isIP(host);
  let addrs: ResolvedAddress[];
  if (v !== 0) addrs = [{ address: host, family: v === 6 ? 6 : 4 }];
  else {
    try {
      addrs = await withTimeout(deps.resolve(host), deps.dnsTimeoutMs, `DNS lookup for '${host}'`);
    } catch (e) {
      throw new FetchError(e instanceof FetchError ? e.message : `cannot resolve host '${host}'.`);
    }
  }
  if (addrs.length === 0 || addrs.some(a => isPrivateAddress(a.address))) throw new FetchError('url host is not public.');
  return addrs[0];
}

/** A `lookup` that ignores DNS and always answers with the pinned address. */
export function pinnedLookup(pin: ResolvedAddress): LookupFunction {
  return ((_host: string, opts: { all?: boolean }, cb: (...a: unknown[]) => void) => {
    if (opts?.all === true) cb(null, [{ address: pin.address, family: pin.family }]);
    else cb(null, pin.address, pin.family);
  }) as unknown as LookupFunction;
}

interface Hop { status: number; location?: string; body?: Uint8Array }

function readCapped(res: IncomingMessage, maxBytes: number, req: ClientRequest): Promise<Uint8Array> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    res.on('data', (c: Buffer) => {
      total += c.byteLength;
      if (total > maxBytes) {
        req.destroy();
        res.destroy();
        reject(new FetchError(`file is larger than ${maxBytes / 1024 / 1024} MB.`));
        return;
      }
      chunks.push(c);
    });
    res.on('end', () => resolveBody(new Uint8Array(Buffer.concat(chunks))));
    res.on('error', e => reject(e));
    res.on('aborted', () => reject(new FetchError('download aborted.')));
  });
}

function oneHop(u: URL, pin: ResolvedAddress, maxBytes: number, signal: AbortSignal): Promise<Hop> {
  return new Promise((resolveHop, reject) => {
    const opts: RequestOptions = {
      protocol: 'https:', hostname: u.hostname.replace(/^\[|\]$/g, ''), port: u.port === '' ? 443 : Number(u.port),
      path: `${u.pathname}${u.search}`, method: 'GET', lookup: pinnedLookup(pin), signal, agent: false,
      servername: isIP(u.hostname.replace(/^\[|\]$/g, '')) === 0 ? u.hostname : undefined,
      headers: { 'accept-encoding': 'identity', 'user-agent': 'kernelcad-import' },
    };
    const req = deps.request(opts, res => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        res.resume();
        req.destroy();
        resolveHop({ status, location: typeof res.headers.location === 'string' ? res.headers.location : undefined });
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        req.destroy();
        resolveHop({ status });
        return;
      }
      const enc = res.headers['content-encoding'];
      if (enc !== undefined && enc !== 'identity') {
        req.destroy();
        reject(new FetchError(`unsupported content-encoding '${String(enc)}'.`));
        return;
      }
      const declared = Number(res.headers['content-length'] ?? '0');
      if (Number.isFinite(declared) && declared > maxBytes) {
        req.destroy();
        reject(new FetchError(`file is larger than ${maxBytes / 1024 / 1024} MB.`));
        return;
      }
      readCapped(res, maxBytes, req).then(body => resolveHop({ status, body }), reject);
    });
    req.on('error', reject);
    req.end();
  });
}

async function followHops(raw: string, maxBytes: number, signal: AbortSignal): Promise<Uint8Array> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = parseFetchUrl(current);
    if (typeof u === 'string') throw new FetchError(hop === 0 ? u : `redirect refused: ${u}`);
    let pin: ResolvedAddress;
    try {
      pin = await resolvePinned(u);
    } catch (e) {
      throw new FetchError(hop === 0 ? (e as Error).message : `redirect refused: ${(e as Error).message}`);
    }
    const r = await oneHop(u, pin, maxBytes, signal);
    if (r.body !== undefined) return r.body;
    if (r.status < 300 || r.status >= 400) throw new FetchError(`download failed: HTTP ${r.status}.`);
    if (r.location === undefined) throw new FetchError(`download failed: HTTP ${r.status} without a location.`);
    try {
      current = new URL(r.location, u).toString();
    } catch {
      throw new FetchError('redirect refused: invalid location.');
    }
  }
  throw new FetchError(`download failed: more than ${MAX_REDIRECTS} redirects.`);
}

/** Download `raw` with the SSRF and size policy above. Returns the bytes or an error message; never throws. */
export async function fetchPublicBytes(raw: string, maxBytes: number): Promise<Uint8Array | string> {
  const ctl = new AbortController();
  try {
    return await withTimeout(followHops(raw, maxBytes, ctl.signal), deps.totalTimeoutMs, 'download');
  } catch (e) {
    if (e instanceof FetchError) return e.message;
    return `download failed: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    ctl.abort();
  }
}
