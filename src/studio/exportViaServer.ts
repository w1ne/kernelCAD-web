// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared Studio → OCCT export path. Header toolbar buttons and the Export
// inspector tab both use this so modern scripts (top-level await,
// lib.fromSTEP, assemblies) run on the node kernel instead of the legacy
// in-browser worker (`new Function` without an async wrapper).

import { apiCall, rewritePath } from './api/apiBase';
import { currentHostedProject, shouldUseHostedMesh } from './scriptSource';

export type StudioExportFormat = 'stl' | 'step' | 'dxf' | '3mf' | 'glb';

export interface ServerExportResult {
  blob: Blob;
  downloadName: string;
}

/**
 * Export editor source (or a hosted project bundle) via POST /__kernelcad/export.
 * Hosted `/p/<slug>` pages send projectSlug so complementary STEP/STL assets
 * materialize next to the script.
 */
export async function exportViaServer(
  format: StudioExportFormat,
  code: string,
): Promise<ServerExportResult> {
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
    `/__kernelcad/export?format=${format}`,
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload?.error === 'string' ? payload.error : response.statusText,
    );
  }

  const blob = await response.blob();
  const downloadName =
    response.headers
      .get('content-disposition')
      ?.match(/filename="?([^";]+)"?/)?.[1]
    ?? `kernelcad-export.${format}`;
  return { blob, downloadName };
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
