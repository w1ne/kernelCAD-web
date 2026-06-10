import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import App from '../App';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useSession } from '../../funnel/hooks/useSession';
import { fetchProjectBySlug, claimProject, type ProjectRow } from '../../funnel/lib/apiClient';
import { getSupabase } from '../../funnel/lib/supabaseClient';
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
    const supabase = getSupabase();
    let everSubscribed = false;
    const applyRow = (row: { current_code?: string | null; version?: number | null }) => {
      if (!shouldApplyProjectUpdate(versionRef.current, row.version ?? null)) return;
      if (typeof row.current_code === 'string' && row.current_code.length > 0) {
        // Advance the version guard only after we have the final data in hand.
        versionRef.current = row.version ?? versionRef.current;
        setLiveCode(row.current_code);
        setLastLiveUpdate(new Date());
      } else {
        // Oversized realtime payloads omit big columns — fall back to a refetch.
        // Do NOT advance versionRef here; advance it inside .then once we have
        // the fetched row's version, so a concurrent applyRow with a higher
        // version is not incorrectly dropped.
        fetchProjectBySlug(slug)
          .then((p) => {
            if (p && shouldApplyProjectUpdate(versionRef.current, p.version ?? null)) {
              versionRef.current = p.version ?? versionRef.current;
              setLiveCode(p.current_code);
              setLastLiveUpdate(new Date());
            }
          })
          .catch(() => {});
      }
    };
    const channel = supabase
      .channel(`p-${slug}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `slug=eq.${slug}` },
        (payload) => applyRow(payload.new as { current_code?: string | null; version?: number | null }),
      )
      .subscribe((status) => {
        // After a drop+resubscribe, catch anything missed while offline.
        if (status === 'SUBSCRIBED') {
          if (everSubscribed) {
            fetchProjectBySlug(slug)
              .then((p) => { if (p) applyRow(p); })
              .catch(() => {});
          }
          everSubscribed = true;
        }
      });
    return () => { void supabase.removeChannel(channel); };
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
      <span className="text-xs text-gray-200 font-medium truncate max-w-[280px]" title={project.title}>
        {project.title}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono px-1.5 py-0.5 rounded border border-[#333]">
        {formatPrivacyLabel(project.privacy)}
      </span>
      <span
        className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-emerald-700 text-emerald-500"
        title={lastLiveUpdate ? `last update ${lastLiveUpdate.toLocaleTimeString()}` : 'waiting for agent updates'}
      >
        ● live
      </span>
    </div>
  );

  // Anonymous (owner-less) projects — e.g. built by a web-Claude session via
  // open_in_studio — can be claimed: "sign in to save" → claim into your account.
  const isAnonymous = project.owner_id == null && !claimed;
  const btnClass = 'inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors';

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
