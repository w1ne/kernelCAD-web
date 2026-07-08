// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useSession } from '../../funnel/hooks/useSession';
import { getSupabase } from '../../funnel/lib/supabaseClient';
import {
  fetchMyPlan,
  listMyProjects,
  type MyPlan,
  type ProjectRow,
} from '../../funnel/lib/apiClient';

type CheckoutStatus = 'success' | 'cancel' | undefined;

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

export const Route = createFileRoute('/me')({
  component: MePage,
  validateSearch: (s: Record<string, unknown>): { checkout?: CheckoutStatus } => ({
    checkout:
      s.checkout === 'success' || s.checkout === 'cancel'
        ? (s.checkout as CheckoutStatus)
        : undefined,
  }),
});

function MePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { checkout } = Route.useSearch();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/signin', search: { next: '/me' } });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (session) {
      listMyProjects().then(setProjects).catch(e => setErr(String(e)));
      fetchMyPlan().then(setPlan).catch(e => setPlanErr(String(e)));
    }
  }, [session]);

  const dismissCheckoutBanner = () => {
    navigate({ to: '/me', search: {}, replace: true });
  };

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
        <p className="text-copper font-mono text-sm">Failed to load: {err}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      {/* Nav */}
      <header className="border-b border-rule px-6 py-3 flex items-center justify-between bg-vellum">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink">
          <svg className="w-4 h-4 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-blueprint">CAD</span></span>
        </a>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft tracking-wide">{session.user.email}</span>
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

      <section className="px-6 py-10 max-w-4xl mx-auto">
        {checkout === 'success' && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-blueprint bg-vellum-soft p-4 text-ink relative"
          >
            <button
              type="button"
              onClick={dismissCheckoutBanner}
              aria-label="Dismiss"
              className="absolute top-3 right-3 text-ink-faint hover:text-ink font-mono text-sm leading-none"
            >
              ×
            </button>
            <p className="font-serif font-medium">You're on Pro</p>
            <p className="text-sm text-ink-soft mt-1">
              Subscription active — generate as much as you like.
            </p>
          </div>
        )}
        {checkout === 'cancel' && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-rule bg-vellum-soft p-4 text-ink relative"
          >
            <button
              type="button"
              onClick={dismissCheckoutBanner}
              aria-label="Dismiss"
              className="absolute top-3 right-3 text-ink-faint hover:text-ink font-mono text-sm leading-none"
            >
              ×
            </button>
            <p className="font-serif font-medium">Checkout cancelled</p>
            <p className="text-sm text-ink-soft mt-1">
              No charge was made. You can upgrade any time from this page.
            </p>
          </div>
        )}

        {/* Compact plan summary — full usage & billing lives on /billing. */}
        {plan && (
          <a
            href="/billing"
            className="flex items-center justify-between gap-4 rounded-xl border border-rule bg-white p-4 no-underline hover:border-ink transition-colors"
          >
            <div>
              <p className="font-serif font-medium text-ink text-sm">
                {plan.plan === 'pro'
                  ? plan.tier === 'pro'
                    ? 'Pro plan'
                    : 'Basic plan'
                  : 'Free plan'}
              </p>
              <p className="font-mono text-[11px] text-ink-faint mt-1 tracking-wide">
                {plan.plan === 'pro'
                  ? plan.tokensBudget
                    ? `${((plan.tokensRemaining ?? 0) / 1_000_000).toFixed(1)}M tokens left this month`
                    : 'Token-metered plan'
                  : `${plan.generationsRemaining ?? 0} generation${(plan.generationsRemaining ?? 0) === 1 ? '' : 's'} remaining`}
              </p>
            </div>
            <span className="font-mono text-xs text-blueprint shrink-0">Usage &amp; billing →</span>
          </a>
        )}
        {planErr && !plan && (
          <p className="text-ink-faint font-mono text-xs">
            Couldn't load plan info: {planErr}
          </p>
        )}

        <h1 className="font-serif text-3xl font-medium text-ink mt-10">Your projects</h1>

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
      </section>
    </main>
  );
}
