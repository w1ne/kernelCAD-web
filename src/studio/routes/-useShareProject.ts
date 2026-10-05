// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState } from 'react';
import {
  fetchProjectRevisionBySlug,
  listProjectRevisions,
  type ProjectRow,
} from '../../funnel/lib/apiClient';
import { setHostedRevisionHint } from '../scriptSource';
import {
  isHistoricalPin,
  readRequestedVersion,
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
    const version = requested;
    Promise.all([
      fetchProjectRevisionBySlug(slug, version),
      listProjectRevisions(slug).catch(() => []),
    ]).then(
      ([body, list]) => {
        if (disposed) return;
        if (body.version !== version) {
          setResult({ token, revision: null, error: 'This revision could not be loaded.' });
          return;
        }
        const createdAt = list.find((entry) => entry.version === version)?.created_at ?? null;
        setResult({
          token,
          revision: {
            version: body.version,
            code: body.code,
            parameters: body.parameters,
            createdAt,
          },
          error: null,
        });
      },
      (err: unknown) => {
        if (disposed) return;
        const message = err instanceof Error ? err.message : String(err);
        setResult({ token, revision: null, error: message });
      },
    );
    return () => {
      disposed = true;
    };
  }, [row, requested, slug, token]);

  const current = result?.token === token ? result : null;
  const failed = historical && !!current?.error;
  const pending = historical && !current;
  // The stored mesh is addressed by the URL pin. Paint it while the
  // revision's title and source are still in flight — do not show the
  // latest row's name in that gap.
  const view = !row || failed
    ? null
    : pending
      ? { ...row, title: '', version: requested ?? row.version, current_code: ' ', parameters: [] }
      : shareProjectView(row, historical ? requested : null, current?.revision ?? null);
  // The mesh loader reads this before its debounced fetch. Set it during
  // render so the first paint asks for this revision's artifact.
  if (view) setHostedRevisionHint(view.version);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  let status: ShareStatus = 'pending';
  if (row && failed) status = 'error';
  else if (row && pending) status = 'loading';
  else if (row) status = 'ready';

  return {
    requested,
    project: view,
    status,
    error: current?.error ?? null,
    historical,
    retry,
  };
}
