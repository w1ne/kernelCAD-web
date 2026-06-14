// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * /embed/$slug — a chrome-free embed of a public model's viewer, for iframing
 * from other products (e.g. proto.cat's device page CAD tab) WITHOUT forcing a
 * second login.
 *
 * It renders the same Studio viewport as /p/$slug (`App` in `viewerMode`, which
 * is read-only and never persists), but injects NO header chrome — no title, no
 * privacy badge, and crucially no "Sign in to save" button. The kernelCAD Header
 * has no default auth UI (sign-in is only ever rendered via the injected
 * `headerRight`), so omitting it yields a login-free viewer that still keeps the
 * real view toolbar (3D/2D, grid, STEP/STL export).
 *
 * Models load anonymously by slug (capability-based): `fetchProjectBySlug` returns
 * public/`public_unlisted` rows with no auth. Private models resolve to null and
 * show "Not available" — embeds are expected to target public models only.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import App from '../App';
import { fetchProjectBySlug, type ProjectRow } from '../../funnel/lib/apiClient';

export const Route = createFileRoute('/embed/$slug')({
  component: EmbedPage,
});

function EmbedPage() {
  const { slug } = Route.useParams();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    fetchProjectBySlug(slug)
      .then((p) => { if (!disposed) setProject(p); })
      .catch((e) => { if (!disposed) setErr(String(e)); });
    return () => { disposed = true; };
  }, [slug]);

  if (err) {
    return (
      <main className="min-h-screen bg-vellum font-sans grid place-items-center p-8">
        <p className="text-copper font-mono text-sm">Failed to load: {err}</p>
      </main>
    );
  }
  if (project === null && !err) {
    // Either still loading, or a private/missing model (anon fetch returned null).
    return (
      <main className="min-h-screen bg-vellum font-sans grid place-items-center p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }

  // Chrome-free: the real Studio viewport, read-only, no header chrome → no login.
  return <App initialCode={project!.current_code} viewerMode />;
}
