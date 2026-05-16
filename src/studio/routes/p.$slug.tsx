import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FunnelViewer } from '../../funnel/components/FunnelViewer';
import { CodePane } from '../../funnel/components/CodePane';
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

  const isOwner = session?.user.id === project.owner_id;

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans grid grid-rows-[auto_1fr] grid-cols-1">
      {/* Nav */}
      <header className="border-b border-rule px-6 py-3 flex items-center justify-between bg-vellum">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink">
          <svg className="w-4 h-4 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-blueprint">CAD</span></span>
        </a>
        <div className="flex items-center gap-3">
          <ExportButtons slug={project.slug} signedIn={!!session} />
          {!session && <SignInButton />}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* 3D Viewer — dark background matches brand code-bg */}
        <div className="bg-code-bg min-h-[60vh] lg:min-h-0">
          <FunnelViewer code={project.current_code} />
        </div>

        {/* Sidebar — vellum */}
        <aside className="flex flex-col min-h-0 border-l border-rule bg-vellum">
          <div className="px-6 py-4 border-b border-rule flex items-start justify-between">
            <div>
              <p className="font-mono text-[11px] text-ink-faint tracking-widest uppercase">Project</p>
              <h1 className="font-serif text-xl font-medium mt-1 text-ink">{project.title}</h1>
            </div>
            <span className="font-mono text-[11px] text-ink-faint tracking-widest uppercase mt-1">{project.privacy}</span>
          </div>
          <div className="flex-1 min-h-0">
            <CodePane code={project.current_code} />
          </div>
          {isOwner && (
            <div className="px-6 py-3 border-t border-rule">
              <p className="font-mono text-[11px] text-ink-faint tracking-wide">
                Editing via /studio for now. Refine-prompt in /p/&lt;slug&gt; arrives in slice 1.1.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
