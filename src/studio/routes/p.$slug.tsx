import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import App from '../App';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useSession } from '../../funnel/hooks/useSession';
import { fetchProjectBySlug, claimProject, type ProjectRow } from '../../funnel/lib/apiClient';

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

  useEffect(() => {
    fetchProjectBySlug(slug).then(setProject).catch(e => setErr(String(e)));
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
      headerLeft={headerLeft}
      headerRight={headerRight ?? undefined}
    />
  );
}
