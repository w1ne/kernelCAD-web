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
import { fetchProjectBySlug, fetchProjectRevisionBySlug } from '../../funnel/lib/apiClient';
import StudioApp from '../App';
import { StudioConfigProvider } from '../config/StudioConfigContext';
import { embedPresentationMode, embedRevision, loadEmbedCode } from './-embedConfig';

export const Route = createFileRoute('/embed/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: embedPresentationMode(search.mode),
    revision: embedRevision(search.revision),
  }),
  component: EmbedPage,
});

function EmbedPage() {
  const { slug } = Route.useParams();
  const { mode, revision } = Route.useSearch();
  const sourceKey = `${slug}\u0000${revision === undefined ? 'current' : revision === null ? 'invalid' : revision}`;
  const [code, setCode] = useState<string | null>(null);
  const [loadedSourceKey, setLoadedSourceKey] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // `state` starts at 'loading' (initial useState); the fetch resolves it to
    // ready/missing/error. No synchronous setState in the effect body.
    let disposed = false;
    const source = loadEmbedCode(revision, {
      loadCurrent: () => fetchProjectBySlug(slug).then((project) => project?.current_code ?? null),
      loadRevision: (version) => fetchProjectRevisionBySlug(slug, version).then((saved) => saved.code),
    });
    source
      .then((sourceCode) => {
        if (disposed) return;
        if (sourceCode) { setCode(sourceCode); setLoadedSourceKey(sourceKey); setState('ready'); }
        else { setLoadedSourceKey(sourceKey); setState('missing'); }
      })
      .catch((e) => {
        if (disposed) return;
        // Requested release revisions fail closed: never substitute the live model
        // when the revision endpoint is unavailable or refuses access.
        if (revision !== undefined) { setLoadedSourceKey(sourceKey); setState('missing'); return; }
        setLoadedSourceKey(sourceKey);
        setErr(String(e));
        setState('error');
      });
    return () => { disposed = true; };
  }, [slug, revision, sourceKey]);

  const sourceSettled = loadedSourceKey === sourceKey;

  if (revision !== null && sourceSettled && state === 'ready' && code) {
    if (mode === 'studio') {
      return (
        <StudioConfigProvider value={{ showHeader: false, enableAgentRail: false, enableConnect: false }}>
          <StudioApp initialCode={code} viewerMode />
        </StudioConfigProvider>
      );
    }
    return (
      <div className="fixed inset-0">
        <FunnelViewer code={code} />
      </div>
    );
  }

  const message =
    revision === null || (sourceSettled && state === 'missing') ? 'Model not available.'
    : !sourceSettled ? 'Loading…'
    : state === 'error' ? `Failed to load: ${err}`
    : 'Loading…';
  return (
    <main className="fixed inset-0 bg-vellum font-sans grid place-items-center p-8">
      <p className="text-ink-faint font-mono text-sm">{message}</p>
    </main>
  );
}
