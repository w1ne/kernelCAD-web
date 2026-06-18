// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * /embed/$slug — a chrome-free embed of a public model's 3D viewer, for iframing
 * from other products (e.g. proto.cat's device-page CAD tab) WITHOUT a second
 * login and WITHOUT the Studio editor chrome.
 *
 * It reuses `FunnelViewer` — the same purpose-built "render geometry without the
 * full Studio shell" wrapper the anonymous-generation funnel uses: a bare 3D
 * canvas that auto-executes the model code and frames it, with no toolbar, no
 * inspector rail, no agent connect, and no auth UI. (Rendering the full `App`
 * even in viewerMode pulls in the toolbar + Inspector + Run/Brush/Section — the
 * editor, not a viewer.)
 *
 * Models load anonymously by slug (capability-based): `fetchProjectBySlug`
 * returns public/`public_unlisted` rows with no auth. Private models resolve to
 * null → "Not available".
 */
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FunnelViewer } from '../../funnel/components/FunnelViewer';
import { fetchProjectBySlug, type ProjectRow } from '../../funnel/lib/apiClient';

export const Route = createFileRoute('/embed/$slug')({
  component: EmbedPage,
});

function EmbedPage() {
  const { slug } = Route.useParams();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // `state` starts at 'loading' (initial useState); the fetch resolves it to
    // ready/missing/error. No synchronous setState in the effect body.
    let disposed = false;
    fetchProjectBySlug(slug)
      .then((p) => {
        if (disposed) return;
        if (p) { setProject(p); setState('ready'); }
        else { setState('missing'); }
      })
      .catch((e) => { if (!disposed) { setErr(String(e)); setState('error'); } });
    return () => { disposed = true; };
  }, [slug]);

  if (state === 'ready' && project) {
    return (
      <div className="fixed inset-0">
        <FunnelViewer code={project.current_code} />
      </div>
    );
  }

  const message =
    state === 'error' ? `Failed to load: ${err}`
    : state === 'missing' ? 'Model not available.'
    : 'Loading…';
  return (
    <main className="fixed inset-0 bg-vellum font-sans grid place-items-center p-8">
      <p className="text-ink-faint font-mono text-sm">{message}</p>
    </main>
  );
}
