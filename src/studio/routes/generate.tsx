// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { PromptBox } from '../../funnel/components/PromptBox';
import { EmailSignup } from '../../funnel/components/EmailSignup';
import { GallerySection } from '../../funnel/components/GallerySection';
import { SignInModal } from '../../funnel/components/SignInModal';
import { RateLimitedPanel } from '../../funnel/components/RateLimitedPanel';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import { useSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession } from '../../funnel/lib/apiClient';
import { inAppAgentEnabled } from '../agentAvailability';

export const Route = createFileRoute('/generate')({
  component: GeneratePage,
});

// Stash the user's prompt across the Google OAuth round-trip so that after
// sign-in we can resume generation without making them retype.
const PENDING_PROMPT_KEY = 'kc:pendingPrompt';

function readInitialPrompt(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('prompt') ?? '';
}

function GeneratePage() {
  const agentEnabled = inAppAgentEnabled();
  const { phase, events, submit } = useGeneration();
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [signInOpen, setSignInOpen] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [initialPrompt] = useState(readInitialPrompt);

  const handleUpgrade = useCallback(async () => {
    // Unauthenticated rate-limit (e.g. anon path) -> push into sign-in first.
    if (!session) {
      setSignInOpen(true);
      return;
    }
    setUpgradeBusy(true);
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch {
      // Stay on page; the user can retry. Don't swallow silently in the
      // rendered UI - surface via the panel's busy state clearing.
      setUpgradeBusy(false);
    }
  }, [session]);

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (!agentEnabled) return;
      if (!session) {
        // Stash so the post-OAuth landing can pick it up and auto-submit.
        try {
          window.localStorage.setItem(PENDING_PROMPT_KEY, prompt);
        } catch {
          // Storage unavailable (private mode) - proceed without resume.
        }
        setSignInOpen(true);
        return;
      }
      void submit(prompt);
    },
    [agentEnabled, session, submit],
  );

  // After OAuth returns with a session, auto-resume the stashed prompt.
  useEffect(() => {
    if (sessionLoading || !session) return;
    if (!agentEnabled) return;
    if (phase.state !== 'idle') return;
    let pending: string | null = null;
    try {
      pending = window.localStorage.getItem(PENDING_PROMPT_KEY);
    } catch {
      return;
    }
    if (pending) {
      window.localStorage.removeItem(PENDING_PROMPT_KEY);
      void submit(pending);
    }
  }, [agentEnabled, sessionLoading, session, phase.state, submit]);

  useEffect(() => {
    if (phase.state === 'done') {
      navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
    }
  }, [phase, navigate]);

  const isBusy = phase.state === 'running';

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <div className="max-w-[1040px] mx-auto px-10 py-7">
        <nav className="flex justify-between items-center pb-24">
          <a href="/" className="flex items-center gap-2.5 font-serif text-lg font-medium no-underline text-ink">
            <svg className="w-5 h-5 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
              <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
            </svg>
            <span>kernel<span className="text-blueprint">CAD</span></span>
          </a>
          <div className="flex gap-6 font-mono text-xs text-ink-soft tracking-wider">
            <a href="/" className="text-ink-soft hover:text-blueprint no-underline transition-colors">studio</a>
            <a href="/me" className="text-ink-soft hover:text-blueprint no-underline transition-colors">your projects</a>
            <a href="https://github.com/w1ne/kernelCAD-web" className="text-ink-soft hover:text-blueprint no-underline transition-colors">github</a>
          </div>
        </nav>

        <header className="text-center pb-18 pt-0">
          <h1 className="font-serif text-8xl font-medium leading-[0.95] tracking-tight mb-7">
            Words to <span className="text-blueprint italic">geometry</span>.
          </h1>
          <p className="text-xl text-ink-soft max-w-xl mx-auto mb-4 leading-relaxed">
            Describe a part in plain English. Get a parametric, STEP-grade 3D model.
          </p>

          <div className="font-mono text-xs text-ink-faint tracking-widest inline-flex gap-3.5 mb-10">
            <span className="text-ink-soft">prompt</span>
            <span className="opacity-50">.</span>
            <span className="text-ink-soft">code</span>
            <span className="opacity-50">.</span>
            <span className="text-ink-soft">geometry</span>
            <span className="opacity-50">.</span>
            <span className="text-ink-soft">STEP/STL</span>
          </div>

          <div className="mt-2 max-w-2xl mx-auto">
            <PromptBox onSubmit={handleSubmit} disabled={isBusy || !agentEnabled} initialValue={initialPrompt} />
            {!agentEnabled && (
              <div className="mt-4 rounded-lg border border-rule bg-vellum-soft p-4 text-left">
                <p className="font-serif font-medium text-lg">Built-in generation is paused</p>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                  Use kernelCAD through MCP while the hosted agent is behind a feature flag.
                </p>
                <a
                  href="/connect"
                  className="mt-3 inline-flex rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium no-underline transition-colors"
                >
                  Connect MCP
                </a>
              </div>
            )}
            {!session && !sessionLoading && (
              <p className="mt-3 text-xs text-ink-faint font-mono tracking-wide">
                {agentEnabled
                  ? 'Sign in when you generate - agents build live in the app.'
                  : 'The hosted agent can be re-enabled with VITE_ENABLE_IN_APP_AGENT=true.'}
              </p>
            )}
            {session && (
              <p className="mt-3 text-xs text-ink-faint font-mono tracking-wide">
                Signed in as {session.user.email ?? 'kernelCAD user'}.
              </p>
            )}
          </div>

          {phase.state === 'running' && (
            <div className="mt-6 text-sm text-ink-soft font-mono">
              <p>working - {events.length} events</p>
              <p className="text-xs mt-2 truncate opacity-70">
                {phase.lastEvent.kind === 'tool_call' && `-> ${phase.lastEvent.name}`}
                {phase.lastEvent.kind === 'tool_result' && `<- ${phase.lastEvent.name} ok=${phase.lastEvent.ok}`}
                {phase.lastEvent.kind === 'status' && `... ${phase.lastEvent.phase}`}
              </p>
            </div>
          )}

          {phase.state === 'error' && phase.code === 'rate_limited' && (
            <RateLimitedPanel
              authenticated={!!session}
              onUpgrade={handleUpgrade}
              busy={upgradeBusy}
            />
          )}
          {phase.state === 'error' && phase.code !== 'rate_limited' && (
            <div className="mt-6 mx-auto max-w-2xl rounded-lg border border-copper bg-vellum-soft p-4 text-ink text-left">
              <p className="font-serif font-medium text-lg">Generation didn't finish</p>
              <p className="font-mono text-xs text-copper mt-1 tracking-widest uppercase">{phase.code}</p>
              <p className="text-sm text-ink-soft mt-2">{phase.message}</p>
            </div>
          )}
        </header>

        <GallerySection />
        <EmailSignup />
      </div>

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        title="Sign in to generate"
        description="Your prompt resumes in the app after sign-in, and agents build the CAD live there."
      />
    </main>
  );
}
