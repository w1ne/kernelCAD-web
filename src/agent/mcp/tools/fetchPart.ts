// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/fetchPart.ts
//
// MCP tool: resolve a bundled (or remote) part id to a record + cache path.

import { CaptureSession } from '../../../modeling/capture/captureSession';
import { fetchPartHost } from '../../../modeling/parts/fetchPart';
import { KernelError } from '../../../shared/intent/kernelError';
import {
  loadCatalog,
  resolveById,
} from '../../../modeling/parts/catalog';
import type { PartRecord } from '../../../shared/parts/types';

export interface FetchPartInput {
  id?: string;
  query?: string;
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
  | { ok: false; error: string; errorCode: string; errorHint: string };

export async function fetchPartTool(
  input: FetchPartInput,
): Promise<FetchPartOutput> {
  if (!input.id && !input.query) {
    return {
      ok: false,
      error: 'fetch_part requires id or query.',
      errorCode: 'parts.input.id-or-query-required',
      errorHint:
        'Pass either an id (exact bundled record) or a query (fuzzy search).',
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
