// src/agent/mcp/tools/findPart.ts
//
// MCP tool: discovery against the bundled (and optionally remote) catalog.

import {
  findPartHost,
  type FindPartOpts,
} from '../../../modeling/parts/findPart';
import { KernelError } from '../../../shared/intent/kernelError';
import type { PartRecord } from '../../../shared/parts/types';

export interface FindPartInput {
  query?: string;
  category?: string;
  family?: string;
  standard?: string;
  tag?: string;
  limit?: number;
  source?: 'local' | 'remote' | 'auto';
  partsBaseUrl?: string;
}

export interface FindPartOk {
  ok: true;
  results: PartRecord[];
  totalMatches: number;
  source: 'local' | 'remote' | 'merged';
  remoteEnabled: boolean;
}

export interface FindPartErr {
  ok: false;
  error: string;
  errorCode: string;
  errorHint: string;
}

export type FindPartOutput = FindPartOk | FindPartErr;

export async function findPartTool(
  input: FindPartInput,
): Promise<FindPartOutput> {
  const hasQuery = typeof input.query === 'string' && input.query.length > 0;
  const hasFilter =
    input.category !== undefined ||
    input.family !== undefined ||
    input.standard !== undefined ||
    input.tag !== undefined;
  if (!hasQuery && !hasFilter) {
    return {
      ok: false,
      error:
        'find_part requires a query or a filter (category/family/standard/tag).',
      errorCode: 'parts.input.id-or-query-required',
      errorHint:
        'Pass either a fuzzy query or at least one filter; both are missing in this call.',
    };
  }
  try {
    const opts: FindPartOpts = {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.family !== undefined ? { family: input.family } : {}),
      ...(input.standard !== undefined ? { standard: input.standard } : {}),
      ...(input.tag !== undefined ? { tag: input.tag } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.partsBaseUrl !== undefined
        ? { partsBaseUrl: input.partsBaseUrl }
        : {}),
    };
    const r = await findPartHost(input.query ?? '', opts);
    return { ok: true, ...r };
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
