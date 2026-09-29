// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { getSupabase } from '../../funnel/lib/supabaseClient';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import { PlanSummaryCard } from './-PlanSummaryCard';
import { useMePageData } from './-useMePageData';
import { MovedProjectsNotice } from './-MovedProjectsNotice';
import { parseMovedParam } from './-anonClaim';

/** Copies the public /p/<slug> link for a project card to the clipboard with
 *  transient "Copied" feedback. Stops propagation so it doesn't trigger the
 *  surrounding card link. */
function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-[11px] text-ink-soft hover:text-ink underline decoration-dotted"
    >
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

// Stripe returns to /billing (which shows the checkout banners), not /me.
// `moved` is set by the anonymous-project claim flows (/claim, /p/:slug banner).
export const Route = createFileRoute('/me')({
  component: MePage,
  validateSearch: (s: Record<string, unknown>): { moved?: number } => {
    const moved = parseMovedParam(s.moved);
    return moved === undefined ? {} : { moved };
  },
});

function MePageHeader({ email }: { email: string | undefined }) {
  return (
    <header className="border-b border-rule px-6 py-3 flex items-center justify-between bg-vellum">
      <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink">
        <svg className="w-4 h-4 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
          <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
        </svg>
        <span>kernel<span className="text-blueprint">CAD</span></span>
      </a>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-ink-soft tracking-wide">{email}</span>
        <button
          type="button"
          onClick={() => {
            // onAuthStateChange clears the session; the !session effect above
            // then redirects to /signin.
            void getSupabase().auth.signOut();
          }}
          className="rounded-md border border-rule px-3 py-1.5 font-mono text-xs tracking-wide text-ink-soft hover:border-ink hover:text-ink transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function ProjectsSection({ projects }: { projects: ProjectRow[] | null }) {
  return (
    <>
      {!projects && (
        <p className="text-ink-faint font-mono text-sm mt-4">Loading projects…</p>
      )}
      {projects?.length === 0 && (
        <p className="text-ink-soft mt-4">
          No projects yet.{' '}
          <a href="/" className="text-blueprint underline">Start one</a>.
        </p>
      )}
      {projects && projects.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <li key={p.id} className="rounded-xl border border-rule bg-white p-5 hover:border-ink transition-colors">
              <a href={`/p/${p.slug}`} className="block no-underline">
                <p className="font-serif font-medium text-ink text-base">{p.title}</p>
                <p className="font-mono text-[11px] text-ink-faint mt-1.5 tracking-wide">
                  {p.privacy} · {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </a>
              <div className="mt-3">
                <CopyLinkButton slug={p.slug} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MePage() {
  const { session, loading, projects, plan, planErr, err } = useMePageData();
  const { moved } = Route.useSearch();

  if (loading || !session) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }
  if (err) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-danger font-mono text-sm">Failed to load: {err}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      {/* Nav */}
      <MePageHeader email={session.user.email} />

      <section className="px-6 py-10 max-w-4xl mx-auto">
        <MovedProjectsNotice moved={moved} />

        <PlanSummaryCard plan={plan} planErr={planErr} />

        <h1 className="font-serif text-3xl font-medium text-ink mt-10">Your projects</h1>

        <ProjectsSection projects={projects} />
      </section>
    </main>
  );
}
