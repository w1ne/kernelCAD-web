/**
 * Slice 2E.bridge — `GET /__kernelcad/session?script=<path>`.
 *
 * Issues (or reuses) a sessionToken for the script and returns it as JSON.
 * The client stores the token in `WorkbenchContext` and threads it through
 * subsequent calls (`/__kernelcad/mesh?session=<token>`,
 * `/__kernelcad/events?session=<token>`, `/__kernelcad/params?session=<token>`).
 *
 * Factored as `createSessionEndpoint(deps)` so unit tests can inject a fake
 * pool and a synchronous `resolveScript` without touching the filesystem.
 * `vite.config.ts` wires the real implementations at server boot.
 */

import type { SessionPool } from '../sessionPool';
import { writeJson, readQuery } from './httpUtil';

export interface SessionEndpointDeps {
  pool: SessionPool;
  resolveScript: (rawScript: string) => string | null;
}

export interface ReqLike { url?: string }
export interface ResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export function createSessionEndpoint(deps: SessionEndpointDeps) {
  return async function sessionHandler(req: ReqLike, res: ResLike): Promise<void> {
    try {
      const script = readQuery(req.url, 'script');
      if (!script) {
        return writeJson(res, 400, { error: 'missing script query parameter' });
      }
      const scriptPath = deps.resolveScript(script);
      if (!scriptPath) {
        return writeJson(res, 400, { error: 'script must be a repo examples/*.kcad.ts file' });
      }
      const entry = await deps.pool.getOrCreate(scriptPath);
      return writeJson(res, 200, { sessionToken: entry.token });
    } catch (error) {
      return writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
