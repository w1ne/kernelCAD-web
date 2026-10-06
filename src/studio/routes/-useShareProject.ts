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
  shareHeadingTitle,
  shareProjectView,
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

function shareView(
  row: ProjectRow,
  requested: number | null,
  historical: boolean,
  failed: boolean,
  pending: boolean,
  revision: PinnedRevision | null,
): ProjectRow | null {
  if (failed) return null;
  // Paint the stored mesh while the revision body is still in flight.
  // The heading stays the project title until that body supplies a better one.
  if (pending) {
    return {
      ...row,
      title: shareHeadingTitle(null, null, row.title),
      version: requested ?? row.version,
      current_code: ' ',
      parameters: [],
    };
  }
  return shareProjectView(row, historical ? requested : null, revision);
}

function shareStatus(row: ProjectRow | null, failed: boolean, pending: boolean): ShareStatus {
  if (row && failed) return 'error';
  if (row && pending) return 'loading';
  if (row) return 'ready';
  return 'pending';
}

/** Resolve `?version=N` against the loaded row. The current revision needs no
 *  extra fetch. An older pin is a failed read when the revision API fails —
 *  the latest row must not stand in for it. */
export function useShareProject(slug: string, row: ProjectRow | null): ShareProject {
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
  const view = row ? shareView(row, requested, historical, failed, pending, current?.revision ?? null) : null;
  // The mesh loader reads this before its debounced fetch. Set it during
  // render so the first paint asks for this revision's artifact.
  if (view) setHostedRevisionHint(view.version);

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
