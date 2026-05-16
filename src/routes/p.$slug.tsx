import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FunnelViewer } from '../funnel/components/FunnelViewer';
import { CodePane } from '../funnel/components/CodePane';
import { ExportButtons } from '../funnel/components/ExportButtons';
import { SignInButton } from '../funnel/components/SignInButton';
import { useSession } from '../funnel/hooks/useSession';
import { fetchProjectBySlug, type ProjectRow } from '../funnel/lib/apiClient';

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

  if (err) return <main className="p-8 text-red-300">Failed to load: {err}</main>;
  if (!project) return <main className="p-8 text-neutral-400">Loading…</main>;

  const isOwner = session?.user.id === project.owner_id;

  return (
    <main className="min-h-screen bg-neutral-950 text-white grid grid-rows-[auto_1fr] grid-cols-1">
      <header className="border-b border-neutral-900 px-6 py-3 flex items-center justify-between">
        <a href="/" className="text-lg font-bold">kernelCAD</a>
        <div className="flex items-center gap-3">
          <ExportButtons slug={project.slug} signedIn={!!session} />
          {!session && <SignInButton />}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
        <div className="bg-neutral-900 min-h-[60vh] lg:min-h-0">
          <FunnelViewer code={project.current_code} />
        </div>
        <aside className="flex flex-col min-h-0 border-l border-neutral-900">
          <div className="px-6 py-4 border-b border-neutral-900 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-neutral-500 tracking-wide">Project</p>
              <h1 className="text-lg font-semibold mt-1">{project.title}</h1>
            </div>
            <span className="text-xs text-neutral-500">{project.privacy}</span>
          </div>
          <div className="flex-1 min-h-0">
            <CodePane code={project.current_code} />
          </div>
          {isOwner && (
            <div className="px-6 py-3 border-t border-neutral-900 text-xs text-neutral-500">
              Editing via /studio for now. Refine-prompt in /p/&lt;slug&gt; arrives in slice 1.1.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
