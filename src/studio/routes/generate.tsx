// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { EmailSignup } from '../../funnel/components/EmailSignup';
import { GallerySection } from '../../funnel/components/GallerySection';
import { SignInModal } from '../../funnel/components/SignInModal';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import { useSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession } from '../../funnel/lib/apiClient';
import { inAppAgentEnabled } from '../agentAvailability';
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
        />

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
