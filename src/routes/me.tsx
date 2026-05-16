import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useSession } from '../funnel/hooks/useSession';
import { listMyProjects, type ProjectRow } from '../funnel/lib/apiClient';

export const Route = createFileRoute('/me')({
  component: MePage,
});

function MePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/signin', search: { next: '/me' } });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (session) {
      listMyProjects().then(setProjects).catch(e => setErr(String(e)));
    }
  }, [session]);

  if (loading || !session) return <main className="p-8 text-neutral-400">Loading…</main>;
  if (err) return <main className="p-8 text-red-300">Failed to load: {err}</main>;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-900 px-6 py-3 flex items-center justify-between">
        <a href="/" className="text-lg font-bold">kernelCAD</a>
        <span className="text-sm text-neutral-400">{session.user.email}</span>
      </header>
      <section className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Your projects</h1>
        {!projects && <p className="text-neutral-400 mt-4">Loading projects…</p>}
        {projects?.length === 0 && (
          <p className="text-neutral-400 mt-4">
            No projects yet. <a href="/" className="underline">Start one</a>.
          </p>
        )}
        {projects && projects.length > 0 && (
          <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => (
              <li key={p.id} className="rounded-xl border border-neutral-800 p-4 hover:border-neutral-600">
                <a href={`/p/${p.slug}`} className="block">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {p.privacy} · updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
