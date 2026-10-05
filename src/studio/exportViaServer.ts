// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared Studio → OCCT export path. Header toolbar buttons, the Export
// inspector tab and the public customizer download menu all use this so modern scripts (top-level await,
// lib.fromSTEP, assemblies) run on the node kernel instead of the legacy
// in-browser worker (`new Function` without an async wrapper).

import { apiCall, rewritePath } from './api/apiBase';
import { currentHostedProject, shouldUseHostedMesh } from './scriptSource';

export type StudioExportFormat = 'stl' | 'step' | 'dxf' | '3mf' | 'glb' | 'pdf-drawing';

/** File extension of a format's download (`pdf-drawing` is a `.pdf`). */
export function exportFileExtension(format: StudioExportFormat): string {
  return format === 'pdf-drawing' ? 'pdf' : format;
}

/** Response headers of an export that shipped with a warning (the server
 *  exposes both to browsers). */
export const EXPORT_WARNING_HEADER = 'X-KernelCAD-Export-Warning';
export const EXPORT_OPEN_EDGES_HEADER = 'X-KernelCAD-Mesh-Open-Edges';

/** Longest Retry-After the client waits out on its own before one retry of
 *  a 429 / 503. A longer wait is shown to the user instead. */
export const MAX_AUTO_RETRY_WAIT_SEC = 30;
/** Poll interval bounds for an async export job. */
const MIN_POLL_MS = 500;
const MAX_POLL_MS = 5000;

/** An export that shipped, but with a defect the user should know about. */
export interface ExportWarning {
  /** Diagnostic code(s) from the warning header, comma-separated. */
  code: string;
  openEdges?: number;
  /** One sentence for the UI. */
  message: string;
}

export interface ServerExportResult {
  blob: Blob;
  downloadName: string;
  warning?: ExportWarning;
}

/** A failed export, with the server's diagnostic code and fix hint. */
export class ServerExportError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly hint?: string;
  readonly retryAfterSec?: number;

  constructor(
    message: string,
    fields: { status: number; code?: string; hint?: string; retryAfterSec?: number },
  ) {
    super(message);
    this.name = 'ServerExportError';
    this.status = fields.status;
    this.code = fields.code;
    this.hint = fields.hint;
    this.retryAfterSec = fields.retryAfterSec;
  }
}

/** Where a running export is. `waiting`: the server was busy and the client
 *  retries after `retryInSec`. */
export interface ExportProgress {
  phase: 'running' | 'waiting' | 'downloading';
  retryInSec?: number;
}

export interface ExportViaServerOptions {
  /** Cancels the request, the retry wait and the job polling. */
  signal?: AbortSignal;
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Export editor source (or a hosted project bundle) via POST /__kernelcad/export.
 * Hosted `/p/<slug>` pages send projectSlug so complementary STEP/STL assets
 * materialize next to the script.
 *
 * Every export asks for async mode (`?async=1`): the server answers 202 with
 * a job id at once and the client polls it, so a heavy export never holds one
 * HTTP request open past a proxy timeout. A server without async mode (the
 * vite dev middleware) answers 200 with the file, which is also accepted.
 * A 429 / 503 is retried once after its Retry-After when that is short.
 * Failures throw `ServerExportError` with the server's message and hint.
 */
export async function exportViaServer(
  format: StudioExportFormat,
  code: string,
  options: ExportViaServerOptions = {},
): Promise<ServerExportResult> {
  const { signal, onProgress } = options;
  const request = await exportRequest(format, code);
  const post = () => fetch(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...request.headers },
    body: JSON.stringify(request.body),
    signal,
  });

  onProgress?.({ phase: 'running' });
  let response = await postWithBusyRetry(post, options);
  if (response.status === 202) {
    const job = await response.json() as { statusUrl?: string; jobId?: string };
    response = await awaitExportJob(job, request.base, request.headers, options);
  }
  if (!response.ok) throw await errorFromResponse(response);
  return fileFromResponse(response, format);
}

/** URL, auth headers and JSON body of the export POST. */
async function exportRequest(format: StudioExportFormat, code: string): Promise<{
  url: string;
  base: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}> {
  const source = code.trim();
  const project = currentHostedProject();
  if (!project && !source) {
    throw new Error('Export requires script source in the editor.');
  }

  const { base, headers } = await apiCall();
  // Hosted static app has no same-origin /__kernelcad/* middleware.
  // meshSourceHosted uses VITE_API_BASE_URL even when unsigned-in;
  // mirror that so Export works without a Supabase session.
  const effectiveBase = base
    || (shouldUseHostedMesh()
      ? (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
      : '');
  const url = rewritePath(
    `/__kernelcad/export?format=${format}&async=1`,
    effectiveBase,
  );
  // Always send projectSlug on /p/<slug> so the server materializes STEP/STL
  // assets. Also send editor `source` when present so live edits export without
  // requiring a save first (server prefers source over stored project code).
  const body = project
    ? {
        projectSlug: project.slug,
        ...(project.version ? { projectVersion: project.version } : {}),
        ...(source ? { source } : {}),
      }
    : { source };
  return { url, base: effectiveBase, headers, body };
}

/** POST once; on 429 / 503 with a short Retry-After, wait it out and POST
 *  once more. A long wait throws the busy error for the UI. */
async function postWithBusyRetry(
  post: () => Promise<Response>,
  { signal, onProgress }: ExportViaServerOptions,
): Promise<Response> {
  const response = await post();
  if (response.status !== 429 && response.status !== 503) return response;
  const busy = await errorFromResponse(response);
  const wait = busy.retryAfterSec ?? 0;
  if (wait > MAX_AUTO_RETRY_WAIT_SEC) throw busy;
  onProgress?.({ phase: 'waiting', retryInSec: wait });
  await sleep(wait * 1000, signal);
  onProgress?.({ phase: 'running' });
  return post();
}

async function fileFromResponse(response: Response, format: StudioExportFormat): Promise<ServerExportResult> {
  const blob = await response.blob();
  const downloadName =
    response.headers
      .get('content-disposition')
      ?.match(/filename="?([^";]+)"?/)?.[1]
    ?? (format === 'pdf-drawing' ? 'kernelcad-drawing.pdf' : `kernelcad-export.${exportFileExtension(format)}`);
  const warning = exportWarningFrom(response.headers, format);
  return { blob, downloadName, ...(warning ? { warning } : {}) };
}

/** Poll an async export job until it is done (then fetch its download) or
 *  failed (then throw its error). */
async function awaitExportJob(
  job: { statusUrl?: string; jobId?: string },
  base: string,
  headers: Record<string, string>,
  { signal, onProgress }: ExportViaServerOptions,
): Promise<Response> {
  const statusPath = job.statusUrl ?? `/__kernelcad/export/jobs/${job.jobId ?? ''}`;
  let delayMs = 1000;
  for (;;) {
    await sleep(delayMs, signal);
    const res = await fetch(rewritePath(statusPath, base), { headers, signal });
    if (!res.ok) throw await errorFromResponse(res, 'The export job is gone (the server restarted or it expired). Export again.');
    const status = await res.json() as {
      status?: string;
      downloadUrl?: string;
      httpStatus?: number;
      retryAfterSec?: number;
      error?: unknown;
      code?: unknown;
      hint?: unknown;
    };
    if (status.status === 'failed') {
      throw errorFromBody(status.httpStatus ?? 500, status, 'The export failed on the server.');
    }
    if (status.status === 'done') {
      onProgress?.({ phase: 'downloading' });
      const downloadPath = status.downloadUrl ?? `${statusPath}/download`;
      return fetch(rewritePath(downloadPath, base), { headers, signal });
    }
    const hinted = (status.retryAfterSec ?? 0) * 1000;
    delayMs = Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, hinted || delayMs));
  }
}

function errorFromBody(
  status: number,
  body: { error?: unknown; code?: unknown; hint?: unknown; retryAfterSec?: unknown },
  fallback: string,
  retryAfterHeader?: string | null,
): ServerExportError {
  const headerSec = Number(retryAfterHeader);
  const retryAfterSec = typeof body.retryAfterSec === 'number'
    ? body.retryAfterSec
    : Number.isFinite(headerSec) && retryAfterHeader ? headerSec : undefined;
  return new ServerExportError(
    typeof body.error === 'string' && body.error ? body.error : fallback,
    {
      status,
      ...(typeof body.code === 'string' ? { code: body.code } : {}),
      ...(typeof body.hint === 'string' && body.hint ? { hint: body.hint } : {}),
      ...(retryAfterSec !== undefined ? { retryAfterSec } : {}),
    },
  );
}

async function errorFromResponse(response: Response, fallback?: string): Promise<ServerExportError> {
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  return errorFromBody(
    response.status,
    payload ?? {},
    fallback ?? (response.statusText || `Export failed (HTTP ${response.status}).`),
    response.headers?.get('retry-after'),
  );
}

/** The warning headers of a shipped export, as one sentence for the UI. */
export function exportWarningFrom(headers: Headers | undefined, format: string): ExportWarning | undefined {
  const code = headers?.get(EXPORT_WARNING_HEADER);
  if (!code) return undefined;
  const edges = Number(headers?.get(EXPORT_OPEN_EDGES_HEADER));
  const openEdges = Number.isFinite(edges) && edges > 0 ? edges : undefined;
  const label = format.toUpperCase();
  const message = /not-watertight/.test(code)
    ? `The ${label} has a small mesh gap${openEdges ? ` (${openEdges} open edge${openEdges === 1 ? '' : 's'})` : ''}. `
      + 'Slicers close gaps this small; check the print preview.'
    : `The ${label} was exported with a warning (${code}).`;
  return { code, ...(openEdges ? { openEdges } : {}), message };
}

/** The user-facing text of an export failure: the message, then the hint. */
export function exportErrorText(err: unknown): { message: string; hint?: string } {
  if (err instanceof ServerExportError) {
    const retry = (err.status === 429 || err.status === 503) && err.retryAfterSec
      ? ` Try again in ${err.retryAfterSec} s.`
      : '';
    return {
      message: /retry in \d+ s/i.test(err.message) ? err.message : err.message + retry,
      ...(err.hint ? { hint: err.hint } : {}),
    };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

/** True when `err` is the rejection of a cancelled export. */
export function isExportAbort(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError';
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Export cancelled', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Export cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Trigger a browser download for a blob returned by exportViaServer. */
export function downloadBlob(blob: Blob, downloadName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
