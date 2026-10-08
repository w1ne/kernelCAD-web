// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmailSignup } from '../../funnel/components/EmailSignup';
import { FunnelHeader } from '../../funnel/components/FunnelHeader';
import { GallerySection } from '../../funnel/components/GallerySection';
import { SignInModal } from '../../funnel/components/SignInModal';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import { useSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession } from '../../funnel/lib/apiClient';
import { inAppAgentEnabled } from '../agentAvailability';
import { stashWordsGeometry, wordsToGeometry } from '../wordsToGeometry';
import GenerateHero from './GenerateHero';

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

/**
 * Opens a finished run. A complete result opens right away. A partial one
 * waits on the page, so the user reads what was not checked before opening it.
 */
function useOpenResult(phase: ReturnType<typeof useGeneration>['phase']): () => void {
  const navigate = useNavigate();
  const openResult = useCallback(() => {
    if (phase.state === 'done') navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
  }, [phase, navigate]);
  useEffect(() => {
    if (phase.state === 'done' && !phase.partial) openResult();
  }, [phase, openResult]);
  return openResult;
}

function GeneratePage() {
  const agentEnabled = inAppAgentEnabled();
  const { phase, events, submit } = useGeneration();
  const { session, loading: sessionLoading } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [initialPrompt] = useState(readInitialPrompt);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  // The last prompt sent, for "Try again" after a failure.
  const lastPrompt = useRef('');

  const run = useCallback(
    (prompt: string) => {
      lastPrompt.current = prompt;
      void submit(prompt);
    },
    [submit],
  );

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

  const openWords = useCallback(
    (prompt: string) => {
      const made = wordsToGeometry(prompt);
      if (!made.ok) {
        setLocalMessage(made.message);
        return;
      }
      setLocalMessage(null);
      stashWordsGeometry(made);
      void navigate({ to: '/' });
    },
    [navigate],
  );

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (!agentEnabled) {
        openWords(prompt);
        return;
      }
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
      run(prompt);
    },
    [agentEnabled, openWords, session, run],
  );

  useEffect(() => {
    if (agentEnabled || !initialPrompt.trim()) return;
    openWords(initialPrompt);
  }, [agentEnabled, initialPrompt, openWords]);

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
      lastPrompt.current = pending;
      void submit(pending);
    }
  }, [agentEnabled, sessionLoading, session, phase.state, submit]);

  const openResult = useOpenResult(phase);

  const isBusy = phase.state === 'running';

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <FunnelHeader current="generate" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <GenerateHero
          agentEnabled={agentEnabled}
          isBusy={isBusy}
          initialPrompt={initialPrompt}
          onSubmit={handleSubmit}
          hasSession={!!session}
          sessionEmail={session?.user.email ?? null}
          sessionLoading={sessionLoading}
          phase={phase}
          events={events}
          upgradeBusy={upgradeBusy}
          onUpgrade={handleUpgrade}
          onSignIn={() => setSignInOpen(true)}
          onOpenResult={openResult}
          onRetry={() => handleSubmit(lastPrompt.current)}
          notice={localMessage}
        />

        <GallerySection />
      </main>
      <footer className="mx-auto max-w-5xl border-t border-border px-4 py-8 sm:px-6">
        <EmailSignup />
      </footer>

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        title="Sign in to generate"
        description="Your description will be kept."
      />
    </div>
  );
}
