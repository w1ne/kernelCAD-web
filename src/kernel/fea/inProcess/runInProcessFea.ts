// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FeaStudyMetadata } from '../../../shared/intent/feaStudyRecord';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { OcctBackend } from '../../backends/occt/occtBackend';
import { solveInProcessFeaStudy, type InProcessSolveOptions, type InProcessSolveResult } from './solveInProcessFea';

export { IN_PROCESS_TARGET_ELEMENTS, IN_PROCESS_MAX_ELEMENTS, DEFAULT_SOLVE_TIMEOUT_MS, inProcessBrickSize } from './solveInProcessFea';
export type { InProcessBrickSize, InProcessStressField } from './solveInProcessFea';

export interface InProcessFeaOptions extends InProcessSolveOptions {
  outDir: string;
}

export interface InProcessFeaResult extends InProcessSolveResult {
  artifacts: { geometryPath?: string; inpPath?: string; frdPath?: string; meshPath?: string; summaryPath?: string };
}

/** Node callers retain the summary on disk, including a solved study that failed its safety margin. */
export async function runInProcessFeaStudy(
  shape: OcctBackend,
  declared: FeaStudyMetadata,
  owner: string,
  records: readonly FeatureRecord[] | undefined,
  opts: InProcessFeaOptions,
): Promise<InProcessFeaResult> {
  const result = solveInProcessFeaStudy(shape, declared, owner, records, opts);
  if (!result.summary) return { ...result, artifacts: {} };
  await mkdir(opts.outDir, { recursive: true });
  const summaryPath = join(opts.outDir, 'fea-summary.json');
  await writeFile(summaryPath, JSON.stringify(result.summary, null, 2), 'utf8');
  return { ...result, artifacts: { summaryPath } };
}
