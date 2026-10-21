// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { needsFullKernel } from '../../scriptSource';
import type { ExecutionResult } from '../../../shared/worker/geometryEngine';
import { paramEditsForMesh, type ParamEditValues } from './paramEditsForMesh';
import type { ExecutionApplyDeps } from './executionApplyDeps';

/** The legacy browser worker evaluates plain scripts. Assembly and the
 *  arithmetic param helpers stay on the kernel API. */
export function browserCanEditParams(
  code: string,
  engine: { executeCode?: unknown },
): boolean {
  return typeof engine.executeCode === 'function' && !needsFullKernel(code);
}

export async function runBrowserParamEdit(
  code: string,
  snapshot: ParamEditValues,
  deps: ExecutionApplyDeps,
  epoch: number,
  epochRef: { current: number },
  executionCount: number,
  followUpPending: () => boolean,
): Promise<void> {
  if (epoch !== epochRef.current) return;
  const revision = ++deps.mainRevisionRef.current;
  deps.setCurrentCodeRevision(revision);
  deps.setIsComputing(true);
  const current = (): boolean => epoch === epochRef.current && revision === deps.mainRevisionRef.current;
  try {
    const { source } = paramEditsForMesh(code, snapshot, true);
    const result = await deps.engine.executeCode(source, {
      quality: 'coarse',
      onPreview: (preview: ExecutionResult) => {
        if (!current()) return;
        deps.setGeometries(preview.geometries);
        if (deps.geometriesRef) deps.geometriesRef.current = preview.geometries;
      },
    });
    if (!current()) return;
    deps.setGeometries(result.geometries);
    if (deps.geometriesRef) deps.geometriesRef.current = result.geometries;
    deps.setSketchesGeometries(result.sketches);
    deps.setPreviewGeometries([]);
    deps.setError(null);
    deps.setLastSuccessfulRevision(revision);
    deps.pushExecutionRecord({
      revision,
      status: 'success',
      executionCountAtRecord: executionCount + 1,
    });
  } catch (err) {
    if (!current()) return;
    deps.setError(err instanceof Error ? err.message : String(err));
  } finally {
    if (current() && !followUpPending()) {
      deps.setIsComputing(false);
      deps.setExecutionCount((prev) => prev + 1);
    }
  }
}
