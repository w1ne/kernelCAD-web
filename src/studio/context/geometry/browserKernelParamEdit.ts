// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/browserKernelParamEdit.ts
//
// Declared-parameter edits on the browser kernel worker (behind the
// `?kernel=browser` flag). The edit is the same stateless edit the server
// gets — the source with choice/text values written in, number/boolean
// values as overrides — so the settled mesh is the server's mesh. Drag ticks
// mesh at the kernel's coarse tessellation profile; the release is always a
// full display-quality rebuild.
//
// Whenever the worker cannot answer (not warm yet, crashed, timed out, out
// of memory, server-only model, or switched off after repeated failures) the
// edit goes through the existing server path unchanged — when there is one.

import { browserKernel } from '../../browserKernel/browserKernelInstance';
import { BrowserKernelError } from '../../browserKernel/browserKernelClient';
import { browserKernelEnabled } from '../../browserKernel/flag';
import { appliedDetail, markParamEdit } from '../../browserKernel/paramEditPerf';
import type { RebuildJobResult } from '../../browserKernel/protocol';
import { rebuildQueue, studioModelDoc } from '../../rebuild/rebuildQueueInstance';
import { devMeshAvailable, shouldUseHostedMesh, type BackendMeshPayload } from '../../scriptSource';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import type { ExecutionApplyDeps } from './executionApplyDeps';
import { paramEditsForMesh, type ParamEditValues } from './paramEditsForMesh';
import { isAbortError } from './types';

/** Calls that need a filesystem or the server's part library. */
const SERVER_ONLY_SOURCE = /\blib\s*\.\s*(fromSTEP|fromSTL|fetchPart|standard)\b|\breferenceImage\s*\(|\bfontPath\s*\(/;

/** Fingerprints of the worker features a geometries array shows, so the
 *  next edit only receives what changed. Keyed by the array: anything that
 *  replaces the view (a code edit, a server mesh) is a miss and the next
 *  edit sends everything. */
const shownFingerprints = new WeakMap<readonly GeometryResult[], Record<string, string>>();

export function browserKernelTakes(code: string): boolean {
  return browserKernelEnabled()
    && browserKernel.usable()
    && !SERVER_ONLY_SOURCE.test(code)
    && !browserKernel.isServerOnly(code);
}

/** True when the edit could be served by a server-side kernel. */
export function serverMeshAvailable(): boolean {
  return shouldUseHostedMesh() || devMeshAvailable();
}

/** Build a parametric model in the background so its first slider tick is
 *  an incremental edit with no network. */
export function warmBrowserKernel(code: string, deps: ExecutionApplyDeps): void {
  if (!/\bparam\s*\(/.test(code) || !browserKernelTakes(code)) return;
  void browserKernel.warm(studioModelDoc(deps.mainRevisionRef), code, deps.mainRevisionRef.current);
}

export interface BrowserParamEditJob {
  snapshot: ParamEditValues;
  bakeIntoSource?: boolean;
  preview?: boolean;
  epoch: number;
}

export interface BrowserParamEditRun {
  code: string;
  executionCount: number;
  deps: ExecutionApplyDeps;
  epochRef: { current: number };
  followUpPending: () => boolean;
  apply: (payload: BackendMeshPayload, revision: number, keepDimensions: boolean) => void;
}

function editLabel(snapshot: ParamEditValues): string {
  const names = Object.keys(snapshot);
  return `Browser rebuild · ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
}

type Outcome = { result: RebuildJobResult } | { fallback: BrowserKernelError };

type BrowserEdit = { source: string; params: Record<string, number | boolean> };

/** The stateless edit to send, or null when the server must take it. */
function browserEditFor(job: BrowserParamEditJob, run: BrowserParamEditRun, scope: string, server: boolean): BrowserEdit | null {
  // The customizer writes every value into the source: each edit is a new
  // document the worker has never built, so the server answers it sooner.
  if (job.bakeIntoSource && server) return null;
  let edit: BrowserEdit;
  try {
    edit = paramEditsForMesh(run.code, job.snapshot, job.bakeIntoSource);
  } catch {
    return null;
  }
  if (browserKernel.isServerOnly(edit.source)) return null;
  if (server && !browserKernel.isWarm(scope, edit.source)) {
    // Not warm yet: the server takes this edit while the worker builds.
    void browserKernel.warm(scope, edit.source, run.deps.mainRevisionRef.current);
    return null;
  }
  return edit;
}

/** The worker rebuild, listed in the rebuild queue. A failure the server can
 *  take resolves as `fallback`, kept out of the queue's error. */
function trackedRebuild(
  job: BrowserParamEditJob,
  edit: BrowserEdit,
  target: { scope: string; revision: number; have: Record<string, string> | null; server: boolean },
): Promise<Outcome> {
  return rebuildQueue.track<Outcome>(
    { label: editLabel(job.snapshot), doc: target.scope, generation: target.revision },
    async (signal) => {
      try {
        return {
          result: await browserKernel.rebuild({
            scope: target.scope,
            generation: target.revision,
            source: edit.source,
            params: edit.params,
            quality: job.preview ? 'coarse' : 'display',
            have: target.have,
            signal,
          }),
        };
      } catch (error) {
        if (error instanceof BrowserKernelError && error.fallback && target.server) return { fallback: error };
        throw error;
      }
    },
  );
}

/** The settled result whose dimensions are still on their way. */
let awaitingDimensions: { jobId: number; revision: number; deps: ExecutionApplyDeps; shows: unknown; bounds: RebuildJobResult['payload']['bounds'] } | null = null;
let dimensionsSubscribed = false;

/** Dimensions follow a settled mesh; they apply only while that same edit
 *  is still what the viewer shows. */
function awaitDimensions(deps: ExecutionApplyDeps, result: RebuildJobResult, revision: number): void {
  if (result.quality !== 'display' || result.payload.dimensions) return;
  awaitingDimensions = { jobId: result.jobId, revision, deps, shows: deps.geometriesRef?.current, bounds: result.payload.bounds };
  if (dimensionsSubscribed) return;
  dimensionsSubscribed = true;
  browserKernel.onDimensions((message) => {
    const waiting = awaitingDimensions;
    if (!waiting || waiting.jobId !== message.jobId) return;
    awaitingDimensions = null;
    const { deps } = waiting;
    if (deps.mainRevisionRef.current !== waiting.revision || deps.geometriesRef?.current !== waiting.shows) return;
    deps.setMeshDimensions({ dimensions: message.dimensions, bounds: waiting.bounds });
  });
}

/** Record the fingerprints of what the view now shows, so the next edit
 *  only receives the features that changed. Only shown features count: a
 *  hidden construction feature the next edit changes is sent like a new one. */
function rememberShown(deps: ExecutionApplyDeps, result: RebuildJobResult): void {
  const shown = deps.geometriesRef?.current;
  if (!shown) return;
  const held: Record<string, string> = {};
  for (const geometry of shown) {
    const id = geometry.featureId;
    if (id && result.fingerprints[id] !== undefined) held[id] = result.fingerprints[id]!;
  }
  shownFingerprints.set(shown, held);
}

/** Paint a worker result and remember what the view now shows. */
function applyResult(run: BrowserParamEditRun, result: RebuildJobResult, revision: number): void {
  markParamEdit('response', { generation: revision, kernel: 'browser', detail: { ...result.timings, quality: result.quality, memoryBytes: result.memoryBytes } });
  run.apply(result.payload as BackendMeshPayload, revision, result.payload.dimensions === undefined);
  rememberShown(run.deps, result);
  awaitDimensions(run.deps, result, revision);
  markParamEdit('applied', { generation: revision, kernel: 'browser', detail: appliedDetail(result.payload) });
}

/**
 * Run one param edit on the worker. 'fallback': the caller sends it to the
 * server instead (nothing was painted, no error was shown).
 */
export async function runBrowserKernelParamEdit(
  job: BrowserParamEditJob,
  run: BrowserParamEditRun,
): Promise<'done' | 'fallback'> {
  const { deps } = run;
  const scope = studioModelDoc(deps.mainRevisionRef);
  const server = serverMeshAvailable();
  const edit = browserEditFor(job, run, scope, server);
  if (!edit) return 'fallback';
  const revision = ++deps.mainRevisionRef.current;
  deps.setCurrentCodeRevision(revision);
  deps.setIsComputing(true);
  const current = (): boolean => job.epoch === run.epochRef.current && revision === deps.mainRevisionRef.current;
  const shown = deps.geometriesRef?.current;
  const have = shown ? shownFingerprints.get(shown) ?? null : null;
  let fellBack = false;
  try {
    markParamEdit('request', { generation: revision, kernel: 'browser' });
    const outcome = await trackedRebuild(job, edit, { scope, revision, have, server });
    if ('fallback' in outcome) {
      fellBack = current();
      return fellBack ? 'fallback' : 'done';
    }
    if (current()) applyResult(run, outcome.result, revision);
    return 'done';
  } catch (error) {
    // The queue already shows the error; the last valid model stays.
    if (!isAbortError(error) && current()) deps.setError(error instanceof Error ? error.message : String(error));
    return 'done';
  } finally {
    if (!fellBack && current() && !run.followUpPending()) {
      deps.setIsComputing(false);
      deps.setExecutionCount((prev) => prev + 1);
    }
  }
}

/**
 * Initial build of a model in the browser kernel, for a build with no
 * server-side kernel at all (a static preview). Returns false when the
 * worker cannot build it, so the caller takes its normal path.
 */
export async function buildWithBrowserKernel(
  code: string,
  deps: ExecutionApplyDeps,
  revision: number,
  apply: (payload: BackendMeshPayload) => void,
): Promise<boolean> {
  const scope = studioModelDoc(deps.mainRevisionRef);
  const outcome = await rebuildQueue.track<Outcome>(
    { label: 'Browser rebuild', doc: scope, generation: revision },
    async (signal) => {
      try {
        return {
          result: await browserKernel.rebuild({
            scope, generation: revision, source: code, params: {}, quality: 'display', have: null, background: true, signal,
          }),
        };
      } catch (error) {
        if (error instanceof BrowserKernelError && error.fallback && error.failure !== 'script') return { fallback: error };
        throw error;
      }
    },
  );
  if ('fallback' in outcome) return false;
  if (revision === deps.mainRevisionRef.current) {
    apply(outcome.result.payload as BackendMeshPayload);
    rememberShown(deps, outcome.result);
    awaitDimensions(deps, outcome.result, revision);
  }
  return true;
}
