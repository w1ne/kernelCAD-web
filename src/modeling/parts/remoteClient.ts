// src/modeling/parts/remoteClient.ts
//
// Opt-in remote tier. Accepts partsBaseUrl as an argument OR the
// KERNELCAD_PARTS_BASE_URL env var; throws RemoteDisabledError when
// neither is set. There is NO kernelCAD-shipped default URL.

import { KernelError } from '../../shared/intent/kernelError';
import type { PartRecord } from '../../shared/parts/types';

export class RemoteDisabledError extends KernelError {
  constructor() {
    super(
      'parts.fetch.remote-disabled',
      'No partsBaseUrl configured; remote parts tier is disabled.',
      undefined,
      'Pass partsBaseUrl (programmatic), set the KERNELCAD_PARTS_BASE_URL env var, or use only bundled-catalog ids.',
    );
  }
}

export interface RemoteFindOpts {
  query?: string;
  category?: string;
  family?: string;
  standard?: string;
  tag?: string;
  limit?: number;
  partsBaseUrl?: string;
}

export interface RemoteFindResult {
  results: PartRecord[];
  totalMatches: number;
}

export interface RemoteFetchOpts {
  id: string;
  partsBaseUrl?: string;
}

function resolveBaseUrl(arg: string | undefined): string {
  const url = (arg ?? process.env.KERNELCAD_PARTS_BASE_URL ?? '').trim();
  if (url.length === 0) throw new RemoteDisabledError();
  return url.replace(/\/$/, '');
}

async function callRemote(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': `kernelcad-parts/${process.env.npm_package_version ?? 'dev'}`,
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new KernelError(
        'parts.fetch.api-error',
        `Remote parts API returned ${res.status} for ${url}.`,
        undefined,
        'Retry later or fall back to bundled catalog (source: "local").',
      );
    }
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function remoteFindParts(
  opts: RemoteFindOpts,
): Promise<RemoteFindResult> {
  const base = resolveBaseUrl(opts.partsBaseUrl);
  const qs = new URLSearchParams();
  if (opts.query) qs.set('q', opts.query);
  if (opts.category) qs.set('category', opts.category);
  if (opts.family) qs.set('family', opts.family);
  if (opts.standard) qs.set('standard', opts.standard);
  if (opts.tag) qs.set('tag', opts.tag);
  if (opts.limit) qs.set('pageSize', String(opts.limit));
  const res = await callRemote(`${base}/v1/parts?${qs.toString()}`, 5000);
  return res.json() as Promise<RemoteFindResult>;
}

export async function remoteFetchPartMeta(
  opts: RemoteFetchOpts,
): Promise<PartRecord> {
  const base = resolveBaseUrl(opts.partsBaseUrl);
  const res = await callRemote(
    `${base}/v1/parts/${encodeURIComponent(opts.id)}`,
    5000,
  );
  return res.json() as Promise<PartRecord>;
}

export async function remoteFetchPartBytes(stepUrl: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(stepUrl, { signal: ctrl.signal });
    if (!res.ok) {
      throw new KernelError(
        'parts.fetch.api-error',
        `Remote STEP fetch returned ${res.status} for ${stepUrl}.`,
        undefined,
        'Retry later or fall back to bundled catalog (source: "local").',
      );
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}
