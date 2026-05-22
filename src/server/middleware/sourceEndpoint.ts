/**
 * Lightweight source loader for Studio example routes.
 *
 * Unlike `/__kernelcad/mesh`, this endpoint only reads the .kcad.ts file so
 * the editor can populate immediately without forcing an extra build before
 * the session/mesh pipeline runs.
 */

import { readFile as nodeReadFile } from 'node:fs/promises';
import { writeJson, readQuery } from './httpUtil';

export interface SourceEndpointDeps {
  resolveScript: (rawScript: string) => string | null;
  readFile?: (path: string, encoding: BufferEncoding) => Promise<string>;
}

export interface ReqLike { url?: string }
export interface ResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export function createSourceEndpoint(deps: SourceEndpointDeps) {
  const readFile = deps.readFile ?? nodeReadFile;
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
      const source = await readFile(scriptPath, 'utf8');
      return writeJson(res, 200, { source });
    } catch (error) {
      return writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
