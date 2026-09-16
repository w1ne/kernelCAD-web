// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Lightweight source loader/saver for Studio example routes.
 *
 * GET reads the .kcad.ts file so the editor can populate immediately without
 * forcing an extra build before the session/mesh pipeline runs.
 *
 * PUT is a dev-only save-back: it validates the script via `resolveScript`
 * and writes the posted `source` string through a temp file + rename so the
 * editor never observes a partially written example.
 */

import {
  readFile as nodeReadFile,
  rename as nodeRename,
  writeFile as nodeWriteFile,
} from 'node:fs/promises';
import { writeJson, readQuery, readBody } from './httpUtil';

export interface SourceEndpointDeps {
  resolveScript: (rawScript: string) => string | null;
  readFile?: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile?: (path: string, data: string, encoding: BufferEncoding) => Promise<void>;
  renameFile?: (oldPath: string, newPath: string) => Promise<void>;
}

export interface ReqLike {
  url?: string;
  method?: string;
}
export interface ResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export function createSourceEndpoint(deps: SourceEndpointDeps) {
  const readFile = deps.readFile ?? nodeReadFile;
  const writeFile = deps.writeFile ?? nodeWriteFile;
  const renameFile = deps.renameFile ?? nodeRename;
  return async function sourceHandler(req: ReqLike, res: ResLike): Promise<void> {
    try {
      const script = readQuery(req.url, 'script');
      if (!script) {
        return writeJson(res, 400, { error: 'missing script query parameter' });
      }
      const scriptPath = deps.resolveScript(script);
      if (!scriptPath) {
        return writeJson(res, 400, { error: 'script must be a repo examples/*.kcad.ts file' });
      }

      if ((req.method ?? 'GET').toUpperCase() === 'PUT') {
        let payload: unknown;
        try {
          payload = JSON.parse(await readBody(req as unknown as NodeJS.ReadableStream));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/too large/.test(message)) {
            return writeJson(res, 413, { error: message });
          }
          return writeJson(res, 400, { error: 'body is not valid JSON' });
        }
        const source = (payload as { source?: unknown } | null | undefined)?.source;
        if (typeof source !== 'string' || source.length === 0) {
          return writeJson(res, 400, { error: 'body must include a non-empty "source" string' });
        }
        const tmpPath = `${scriptPath}.tmp-${process.pid}`;
        await writeFile(tmpPath, source, 'utf8');
        await renameFile(tmpPath, scriptPath);
        return writeJson(res, 200, { ok: true, bytes: Buffer.byteLength(source, 'utf8') });
      }

      const source = await readFile(scriptPath, 'utf8');
      return writeJson(res, 200, { source });
    } catch (error) {
      return writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
