/**
 * Pose-only fast path — `GET /__kernelcad/transforms?session=<token>`.
 *
 * Returns ONLY the per-part world transforms of the session's solved tail
 * scene: `{ parts: [{ name, transform: number[16] }] }` (~1KB). The client
 * calls this after a relower whose affectedIds are all `solvedAssembly*`
 * records — a param-driven mate pose edit refreshes per-part worldTransforms
 * but never the part-LOCAL meshes, so re-fetching the full `/mesh` payload
 * (~740KB of triangle buffers) and rebuilding every Three.js geometry is
 * pure waste.
 *
 * After `session.params.update`, the pool entry's `model.tailShape` can be
 * stale — `updateModelParams` returns a fresh BuiltModel but doesn't write
 * back to the pool. The session's `cachedShapes` map IS updated though, so
 * read the live tail from there first (same approach as the `/review`
 * live-interference overlay in vite.config.ts).
 */

import type { SessionPool } from '../sessionPool';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { readQuery, writeJson, type MinimalRes } from './httpUtil';

export interface TransformsEndpointDeps {
  pool: SessionPool;
}

export interface TransformsReqLike {
  url?: string;
}

export function createTransformsEndpoint(deps: TransformsEndpointDeps) {
  return async function transformsHandler(req: TransformsReqLike, res: MinimalRes): Promise<void> {
    try {
      const token = readQuery(req.url, 'session');
      if (!token) {
        return writeJson(res, 400, { error: 'missing session query parameter' });
      }
      const entry = deps.pool.get(token);
      if (!entry) {
        return writeJson(res, 404, { error: 'unknown session token' });
      }
      const session = entry.model.session as unknown as {
        cachedShapes?: Map<string, unknown>;
      };
      const tailId = entry.model.tailId;
      const liveTail = tailId ? session.cachedShapes?.get(tailId) : undefined;
      const tail = liveTail ?? entry.model.tailShape;
      if (!tail || !isSceneBackend(tail)) {
        // Non-assembly tails have no per-part transforms — the client falls
        // back to the full mesh re-fetch on any non-200.
        return writeJson(res, 409, { error: 'session tail is not an assembly scene' });
      }
      return writeJson(res, 200, {
        parts: tail.parts.map((part) => ({
          name: part.name,
          transform: Array.from(part.worldTransform.toMat4()),
        })),
      });
    } catch (error) {
      return writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
