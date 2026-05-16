import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import App from '../App';
import { ExportButtons } from '../../funnel/components/ExportButtons';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useSession } from '../../funnel/hooks/useSession';
import { fetchProjectBySlug, type ProjectRow } from '../../funnel/lib/apiClient';

export const Route = createFileRoute('/p/$slug')({
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const { session } = useSession();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectBySlug(slug).then(setProject).catch(e => setErr(String(e)));
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

  // Full Studio shell with the saved project code preloaded. Floating
  // overlay carries project metadata + export buttons. The shell's own
  // Header handles view modes / local project state.
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <App initialCode={project.current_code} />

      <div className="pointer-events-none absolute top-3 right-3 z-50 flex items-start gap-3">
        <div className="pointer-events-auto rounded-lg border border-rule bg-vellum/95 backdrop-blur px-3 py-2 shadow-sm max-w-md">
          <p className="font-mono text-[10px] text-ink-faint tracking-widest uppercase">
            Project · {project.privacy}
          </p>
          <p className="font-serif text-sm font-medium text-ink mt-0.5 line-clamp-1">
            {project.title}
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <ExportButtons slug={project.slug} signedIn={!!session} />
          {!session && <SignInButton>Sign in</SignInButton>}
        </div>
      </div>
    </div>
  );
}
