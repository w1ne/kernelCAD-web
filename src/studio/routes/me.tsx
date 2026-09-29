// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { getSupabase } from '../../funnel/lib/supabaseClient';
import { buttonClass, cx, ErrorState, SkeletonCard, ToastProvider } from '../../ui';
import { PlanSummaryCard } from './-PlanSummaryCard';
import { useMePageData } from './-useMePageData';
import { MovedProjectsNotice } from './-MovedProjectsNotice';
import { parseMovedParam } from './-anonClaim';
import { MeEmptyState } from './-MeEmptyState';
import { MeProjectList } from './-MeProjectList';

// Stripe returns to /billing (which shows the checkout banners), not /me.
// `moved` is set by the anonymous-project claim flows (/claim, /p/:slug banner).
export const Route = createFileRoute('/me')({
  component: MePage,
  validateSearch: (s: Record<string, unknown>): { moved?: number } => {
    const moved = parseMovedParam(s.moved);
    return moved === undefined ? {} : { moved };
  },
});

function MePageHeader({ email }: { email: string | undefined }): ReactNode {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <a href="/" className="focus-ring flex items-center gap-2 rounded-control font-serif text-base font-medium text-fg no-underline">
          <svg className="size-4 text-fg" viewBox="0 0 84 84" fill="none" aria-hidden="true">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-accent">CAD</span></span>
        </a>
        <nav aria-label="Account" className="flex min-w-0 items-center gap-2 md:gap-4">
          <a href="/studio" className="focus-ring hidden rounded-control text-ui text-fg-2 no-underline hover:text-fg sm:inline">Studio</a>
          <a href="/gallery" className="focus-ring hidden rounded-control text-ui text-fg-2 no-underline hover:text-fg sm:inline">Gallery</a>
          <span className="hidden truncate font-mono text-2xs text-fg-3 md:inline" title={email}>{email}</span>
          <button
            type="button"
            onClick={() => {
              // onAuthStateChange clears the session; useMePageData then
              // redirects to /signin.
              void getSupabase().auth.signOut();
            }}
            className={cx(buttonClass('secondary', 'sm'), 'max-md:h-touch')}
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}

function ProjectsLoading(): ReactNode {
  return (
    <div role="status" aria-label="Loading your projects" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} label="Loading project" />)}
    </div>
  );
}

function ProjectsSection({ data }: { data: ReturnType<typeof useMePageData> }): ReactNode {
  const { projects, err, reload, actions } = data;
  if (err) {
    return (
      <ErrorState
        className="mt-8"
        title="Could not load your projects"
        description="Your projects are safe. Check your connection and try again."
        onRetry={reload}
        errorId={err.slice(0, 200)}
      />
    );
  }
  if (!projects) return <ProjectsLoading />;
  if (projects.length === 0) return <MeEmptyState />;
  return <MeProjectList projects={projects} actions={actions} />;
}

function MePage(): ReactNode {
  const data = useMePageData();
  const { session, loading, plan, planErr, projects } = data;
  const { moved } = Route.useSearch();

  if (loading || !session) {
    return (
      <main data-theme="light" className="min-h-screen bg-bg font-sans text-fg">
        <p role="status" className="mx-auto max-w-6xl px-4 py-10 text-ui text-fg-3 md:px-8">Loading…</p>
      </main>
    );
  }

  return (
    <ToastProvider>
      <main data-theme="light" className="min-h-screen bg-bg font-sans text-fg">
        <MePageHeader email={session.user.email} />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
          <MovedProjectsNotice moved={moved} />

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif text-section text-fg">Your projects</h1>
            {!!projects?.length && (
              <a href="/generate" className={cx(buttonClass('primary', 'lg'), 'no-underline max-md:h-touch')}>
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                New project
              </a>
            )}
          </div>

          <ProjectsSection data={data} />

          <section aria-labelledby="me-plan" className="mt-14 border-t border-border pt-8">
            <h2 id="me-plan" className="mb-3 text-2xs font-medium uppercase tracking-wide text-fg-3">Plan</h2>
            <PlanSummaryCard plan={plan} planErr={planErr} />
          </section>
        </div>
      </main>
    </ToastProvider>
  );
}
