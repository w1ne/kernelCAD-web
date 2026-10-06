// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState } from 'react';
import {
  fetchProjectRevisionBySlug,
  listProjectRevisions,
  type ProjectRevision,
  type ProjectRevisionBody,
  type ProjectRow,
} from '../../funnel/lib/apiClient';
import { setHostedRevisionHint } from '../scriptSource';
import {
  isHistoricalPin,
  readRequestedVersion,
  revisionTitleField,
  sharePageModel,
  type PinnedRevision,
} from './-shareRevision';

export type ShareStatus = 'pending' | 'loading' | 'ready' | 'error';

export interface ShareProject {
  /** Version the URL asked for, if any. */
  requested: number | null;
  /** Row to render. Null until a historical pin has loaded. */
  project: ProjectRow | null;
  status: ShareStatus;
  error: string | null;
  /** The link is not the row's current revision. Live pushes must not replace it. */
  historical: boolean;
  retry: () => void;
}

interface PinResult {
  token: string;
  revision: PinnedRevision | null;
  error: string | null;
}

function requestedFromLocation(): number | null {
  if (typeof window === 'undefined') return null;
  return readRequestedVersion(window.location.search ?? '');
}

function pinFromBody(
  body: ProjectRevisionBody,
  version: number,
  token: string,
  listed: ProjectRevision[] | null,
): PinResult {
  if (body.version !== version) {
    return { token, revision: null, error: 'This revision could not be loaded.' };
  }
  return {
    token,
    revision: {
      version: body.version,
      code: body.code,
      parameters: body.parameters,
      title: revisionTitleField(body),
      createdAt: listed?.find((entry) => entry.version === version)?.created_at ?? null,
    },
    error: null,
  };
}

function fetchPin(slug: string, version: number, token: string): Promise<PinResult> {
  // The list is only the timestamp. A slow list must not hold the title.
  let listed: ProjectRevision[] | null = null;
  void listProjectRevisions(slug).then((rows) => { listed = rows; }).catch(() => { listed = []; });
  return fetchProjectRevisionBySlug(slug, version).then(
    (body) => pinFromBody(body, version, token, listed),
    (err: unknown) => ({
      token,
      revision: null,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
}

function shareStatus(row: ProjectRow | null, failed: boolean, pending: boolean): ShareStatus {
  if (row && failed) return 'error';
  if (row && pending) return 'loading';
  if (row) return 'ready';
  return 'pending';
}

/** The stored-mesh hint for this page: the shown revision and its exact code.
 *  A live agent update or restore on a current-revision page replaces that
 *  code, so the hint is dropped — the stored artifact is no longer this model.
 *  A historical pin ignores live pushes and keeps its hint. */
export function revisionHint(
  slug: string,
  view: ProjectRow | null,
  historical: boolean,
  liveCode: string | undefined,
): { slug: string; version: number | null; code: string } | null {
  if (!view) return null;
  if (!historical && liveCode !== undefined && liveCode !== view.current_code) return null;
  return { slug, version: view.version ?? null, code: view.current_code };
}

/** Resolve `?version=N` against the loaded row. The current revision needs no
 *  extra fetch. An older pin is a failed read when the revision API fails —
 *  the latest row must not stand in for it. */
export function useShareProject(
  slug: string,
  row: ProjectRow | null,
  liveCode?: string,
): ShareProject {
  const requested = requestedFromLocation();
  const historical = !!row && isHistoricalPin(row, requested);
  const [attempt, setAttempt] = useState(0);
  const token = `${attempt}:${slug}:${requested ?? ''}`;
  const [result, setResult] = useState<PinResult | null>(null);

  useEffect(() => {
    if (!row || !requested || !isHistoricalPin(row, requested)) return undefined;
    let disposed = false;
    void fetchPin(slug, requested, token).then((next) => {
      if (!disposed) setResult(next);
    });
    return () => {
      disposed = true;
    };
  }, [row, requested, slug, token]);

  const current = result?.token === token ? result : null;
  const failed = historical && !!current?.error;
  const pending = historical && !current;
  const view = row
    ? sharePageModel(row, requested, current?.revision ?? null, { historical, pending, failed })
    : null;
  // The mesh loader reads this before its debounced fetch. Set it during
  // render so the first paint asks for this revision's artifact.
  setHostedRevisionHint(revisionHint(slug, view, historical, liveCode));

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const status = shareStatus(row, failed, pending);

  return {
    requested,
    project: view,
    status,
    error: current?.error ?? null,
    historical,
    retry,
  };
}
