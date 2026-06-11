// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import App from '../App';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useSession } from '../../funnel/hooks/useSession';
import { fetchProjectBySlug, claimProject, type ProjectRow } from '../../funnel/lib/apiClient';
import { shouldApplyProjectUpdate } from '../../funnel/lib/liveProject';

export const Route = createFileRoute('/p/$slug')({
  component: ProjectPage,
});

function formatPrivacyLabel(privacy: ProjectRow['privacy']): string {
  if (privacy === 'private') return 'private';
  if (privacy === 'public_featured') return 'featured';
  return 'public by link';
}

function ProjectPage() {
  const { slug } = Route.useParams();
  const { session } = useSession();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [liveCode, setLiveCode] = useState<string | undefined>();
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const versionRef = useRef<number | null>(null);

  useEffect(() => {
    fetchProjectBySlug(slug).then(setProject).catch(e => setErr(String(e)));
  }, [slug]);

  // Seed the version guard from the initial fetch.
  useEffect(() => {
    if (project) versionRef.current = project.version ?? null;
  }, [project]);

  useEffect(() => {
    let disposed = false;
    // Guarded refetch: the SSE payload carries only the version; fetch the row
    // and apply it monotonically (re-check after the await — an in-flight fetch
    // must not overwrite a newer update).
    const refetchAndApply = (incomingVersion: number | null) => {
      if (!shouldApplyProjectUpdate(versionRef.current, incomingVersion)) return;
      fetchProjectBySlug(slug)
        .then((p) => {
          if (disposed || !p) return;
          if (!shouldApplyProjectUpdate(versionRef.current, p.version ?? null)) return;
          versionRef.current = p.version ?? versionRef.current;
          setLiveCode(p.current_code);
          setLastLiveUpdate(new Date());
        })
        .catch(() => {});
    };
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    const es = new EventSource(`${base}/api/v1/projects/${encodeURIComponent(slug)}/events`);
    let hadError = false;
    es.addEventListener('update', (ev) => {
      let version: number | null = null;
      try { version = JSON.parse((ev as MessageEvent).data)?.version ?? null; } catch { /* malformed frame — refetch applies unguarded */ }
      refetchAndApply(version);
    });
    es.addEventListener('open', () => {
      // After an auto-reconnect, catch anything missed while disconnected.
      if (hadError) { hadError = false; refetchAndApply(null); }
    });
    es.addEventListener('error', () => { hadError = true; });
    return () => { disposed = true; es.close(); };
  }, [slug]);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      await claimProject(slug);
      setClaimed(true);
    } catch {
      // Leave the button available to retry.
    } finally {
      setClaiming(false);
    }
  }, [slug]);

  if (err) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-copper font-mono text-sm">Failed to load: {err}</p>
      </main>
    );
  }
  if (!project) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }

  const headerLeft = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-gray-200 font-medium truncate min-w-[72px] max-w-[160px] md:max-w-[280px]" title={project.title}>
        {project.title}
      </span>
      <span className="hidden lg:inline-flex shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest text-gray-500 font-mono px-1.5 py-0.5 rounded border border-[#333]">
        {formatPrivacyLabel(project.privacy)}
      </span>
      <span
        className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-emerald-700 text-emerald-500"
        title={lastLiveUpdate ? `last update ${lastLiveUpdate.toLocaleTimeString()}` : 'waiting for agent updates'}
      >
        ● live
      </span>
    </div>
  );

  // Anonymous (owner-less) projects — e.g. built by a web-Claude session via
  // open_in_studio — can be claimed: "sign in to save" → claim into your account.
  const isAnonymous = project.owner_id == null && !claimed;
  const btnClass = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors';

  let headerRight: ReactNode = null;
  if (claimed) {
    headerRight = <span className="text-[11px] text-green-500 font-mono">Saved ✓</span>;
  } else if (isAnonymous && !session) {
    headerRight = (
      <SignInButton
        redirectTo={typeof window !== 'undefined' ? window.location.href : undefined}
        className={btnClass}
      >
        Sign in to save
      </SignInButton>
    );
  } else if (isAnonymous && session) {
    headerRight = (
      <button type="button" onClick={handleClaim} disabled={claiming} className={btnClass}>
        {claiming ? 'Saving…' : 'Save to my projects'}
      </button>
    );
  }

  return (
    <App
      initialCode={project.current_code}
      liveCode={liveCode}
      viewerMode
      headerLeft={headerLeft}
      headerRight={headerRight ?? undefined}
    />
  );
}
