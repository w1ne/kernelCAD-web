// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SessionPool } from '../sessionPool';
import { readBody, readQuery, writeJson, type MinimalRes } from './httpUtil';
import { sharedSelectionSchema } from '../../shared/selection/sharedSelection';

/** Local dev route. Hosted consumers must authorize session ownership before calling. */
export function createSelectionEndpoint({ pool }: { pool: SessionPool }) {
  return async (req: NodeJS.ReadableStream & { url?: string; method?: string }, res: MinimalRes): Promise<void> => {
    const token = readQuery(req.url, 'session');
    if (!token) return writeJson(res, 400, { ok: false, error: 'missing session query parameter' });
    const entry = pool.get(token);
    if (!entry) return writeJson(res, 404, { ok: false, error: 'session not found' });
    if (req.method !== 'GET' && req.method !== 'POST') {
      return writeJson(res, 405, { ok: false, error: 'use GET or POST' });
    }
    try {
      if (req.method === 'POST') {
        const body = JSON.parse(await readBody(req, 4096));
        const parsed = sharedSelectionSchema.safeParse(body.selection);
        if (!parsed.success) return writeJson(res, 400, { ok: false, error: 'invalid selection' });
        if (body.model_generation !== entry.selectionModelGeneration) {
          return writeJson(res, 409, { ok: false, error: 'model generation changed; read selection again',
            selection: entry.selection, revision: entry.selectionRevision, modelGeneration: entry.selectionModelGeneration });
        }
        entry.selection = parsed.data;
        entry.selectionRevision += 1;
      }
      return writeJson(res, 200, { ok: true, selection: entry.selection, revision: entry.selectionRevision, modelGeneration: entry.selectionModelGeneration });
    } catch {
      return writeJson(res, 400, { ok: false, error: 'invalid selection JSON' });
    }
  };
}
