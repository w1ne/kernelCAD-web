// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/fetchPart.ts
//
// MCP tool: resolve a bundled (or remote) part id to a record + cache path.

import { CaptureSession } from '../../../modeling/capture/captureSession';
import {
  fetchPartHost,
  fetchPartFromUrlHost,
} from '../../../modeling/parts/fetchPart';
import { KernelError } from '../../../shared/intent/kernelError';
import {
  loadCatalog,
  resolveById,
} from '../../../modeling/parts/catalog';
import type { PartRecord } from '../../../shared/parts/types';

export interface FetchPartInput {
  id?: string;
  query?: string;
  /** Direct geometry URL (FETCH-BY-URL mode). Trusted hosts only; never re-hosted. */
  url?: string;
  category?: string;
  family?: string;
  standard?: string;
  partsBaseUrl?: string;
}

export type FetchPartOutput =
  | {
      ok: true;
      record: PartRecord;
      cachePath: string;
      sha256: string;
      source: 'local' | 'remote';
    }
  | {
      // FETCH-BY-URL vendor configurator: the agent must download + ingest locally.
      ok: true;
      kind: 'link_out';
      url: string;
      instruction: string;
    }
  | { ok: false; error: 'url_host_not_allowed'; host: string | null }
  | { ok: false; error: string; errorCode: string; errorHint: string };

export async function fetchPartTool(
  input: FetchPartInput,
): Promise<FetchPartOutput> {
  // FETCH-BY-URL mode takes precedence when a url is supplied.
  if (typeof input.url === 'string' && input.url.length > 0) {
    const session = new CaptureSession();
    try {
      const outcome = await fetchPartFromUrlHost({ session }, input.url);
      if (!outcome.ok) {
        return { ok: false, error: outcome.error, host: outcome.host };
      }
      if (outcome.kind === 'link_out') {
        return {
          ok: true,
          kind: 'link_out',
          url: outcome.url,
          instruction: outcome.instruction,
        };
      }
      const { record } = outcome.result;
      const cachePath = String(record.attributes.cachePath ?? '');
      return {
        ok: true,
        record,
        cachePath,
        sha256: record.sha256,
        source: 'remote',
      };
    } catch (e) {
      if (e instanceof KernelError) {
        return {
          ok: false,
          error: e.message,
          errorCode: e.code,
          errorHint: e.hint ?? '',
        };
      }
      throw e;
    }
  }

  if (!input.id && !input.query) {
    return {
      ok: false,
      error: 'fetch_part requires id, query, or url.',
      errorCode: 'parts.input.id-or-query-required',
      errorHint:
        'Pass an id (exact bundled record), a query (fuzzy search), or a url (direct geometry URL).',
    };
  }
  const idOrQuery = input.id ?? input.query!;
  const session = new CaptureSession();
  try {
    const r = await fetchPartHost({ session }, idOrQuery, {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.family !== undefined ? { family: input.family } : {}),
      ...(input.standard !== undefined ? { standard: input.standard } : {}),
      ...(input.partsBaseUrl !== undefined
        ? { partsBaseUrl: input.partsBaseUrl }
        : {}),
      strict: true,
    });
    const cat = loadCatalog();
    const direct = resolveById(cat, r.record.id);
    const cachePath = direct?.stepPath ?? '';
    return {
      ok: true,
      record: r.record,
      cachePath,
      sha256: r.record.sha256,
      source: r.record.source === 'local-catalog' ? 'local' : 'remote',
    };
  } catch (e) {
    if (e instanceof KernelError) {
      return {
        ok: false,
        error: e.message,
        errorCode: e.code,
        errorHint: e.hint ?? '',
      };
    }
    throw e;
  }
}
